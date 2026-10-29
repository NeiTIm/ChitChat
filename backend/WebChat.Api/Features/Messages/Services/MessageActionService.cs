using System.Data;
using System.Globalization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Conversations;
using WebChat.Api.Features.Files;
using WebChat.Api.Features.Groups;
using WebChat.Api.Infrastructure.Realtime;

namespace WebChat.Api.Features.Messages;

public sealed class MessageActionService(AppDbContext db, TimeProvider clock, PrivateChatService privateChats, GroupService groups,
    IHubContext<ChatHub> hub, ILogger<MessageActionService> logger, MessageAttachmentService attachments, IMessageRepository repository) : IMessageService
{
    private DateTime Now => clock.GetUtcNow().UtcDateTime;

    public async Task<MessageDto?> EditAsync(Guid actor, Guid messageId, EditMessageRequest input, CancellationToken ct)
    {
        var content = input.Content?.Trim();
        if (string.IsNullOrWhiteSpace(content) || content.Length > 10000) return null;
        for (var attempt = 0; attempt < 3; attempt++)
        {
            try
            {
                await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
                var message = await repository.FindByIdAsync(messageId, ct);
                if (message is null || message.SenderUserId != actor || message.Content is null || message.RecalledAt is not null
                    || message.CreatedAt > Now || Now - message.CreatedAt > TimeSpan.FromMinutes(15)
                    || !await CanMutateAsync(actor, message.ConversationId, ct)) return null;
                if (message.Content == content) return await attachments.EnrichAsync(Map(message), ct);
                var version = await db.MessageEditHistories.CountAsync(h => h.MessageId == messageId, ct) + 1;
                db.MessageEditHistories.Add(new MessageEditHistory { Id = Guid.NewGuid(), MessageId = messageId, Version = version,
                    PreviousContent = message.Content ?? "", EditedAt = Now });
                message.Content = content;
                message.EditedAt = Now;
                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                await PublishAsync(message, "MessageEdited", ct);
                return await attachments.EnrichAsync(Map(message), ct);
            }
            catch (Exception error) when (Retryable(error) && attempt < 2) { db.ChangeTracker.Clear(); await Task.Delay(30 * (attempt + 1), ct); }
        }
        return null;
    }

    public async Task<List<EditVersionDto>?> EditHistoryAsync(Guid actor, Guid messageId, CancellationToken ct)
    {
        var message = await repository.FindByIdAsync(messageId, ct);
        if (message is null || message.RecalledAt is not null || !await CanViewAsync(actor, message, ct)) return null;
        var versions = await db.MessageEditHistories.Where(h => h.MessageId == messageId).OrderBy(h => h.Version)
            .Select(h => new EditVersionDto(h.Version, h.PreviousContent, h.EditedAt)).ToListAsync(ct);
        if (!await CanViewAsync(actor, message, ct) || await db.Messages.AnyAsync(m => m.Id == messageId && m.RecalledAt != null, ct)) return null;
        if (message.EditedAt is not null) versions.Add(new EditVersionDto(versions.Count + 1, message.Content ?? "", message.EditedAt.Value));
        return versions;
    }

    public async Task<bool> RecallAsync(Guid actor, Guid messageId, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var message = await repository.FindByIdAsync(messageId, ct);
        if (message is null || message.SenderUserId != actor || message.RecalledAt is not null || !await CanViewAsync(actor, message, ct)) return false;
        var conversation = await db.Conversations.SingleAsync(c => c.Id == message.ConversationId, ct);
        if (conversation.Type == "Group" ? conversation.Status != "Active" : !await privateChats.CanSendMessageAsync(actor, conversation.Id, ct)) return false;
        message.Content = null;
        message.RecalledAt = Now;
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await PublishAsync(message, "MessageRecalled", ct);
        return true;
    }

    public async Task<bool> DeleteForMeAsync(Guid actor, Guid messageId, CancellationToken ct)
    {
        var message = await repository.FindByIdAsync(messageId, ct);
        if (message is null || !await CanViewAsync(actor, message, ct)) return false;
        if (!await db.MessageUserStates.AnyAsync(s => s.MessageId == messageId && s.UserId == actor, ct))
        {
            db.MessageUserStates.Add(new MessageUserState { MessageId = messageId, UserId = actor, DeletedAt = Now });
            await db.SaveChangesAsync(ct);
        }
        try { await hub.Clients.User(actor.ToString()).SendAsync("MessageDeletedForMe", new { messageId }, ct); }
        catch (Exception error) { logger.LogWarning(error, "Message delete event delivery failed for {MessageId}", messageId); }
        return true;
    }

    public async Task<bool> SetReactionAsync(Guid actor, Guid messageId, string emoji, CancellationToken ct)
    {
        emoji = emoji?.Trim() ?? "";
        if (emoji.Length is < 1 or > 16 || StringInfo.ParseCombiningCharacters(emoji).Length != 1) return false;
        for (var attempt = 0; attempt < 3; attempt++)
        {
            try { return await SetReactionOnceAsync(actor, messageId, emoji, ct); }
            catch (Exception error) when (Retryable(error) && attempt < 2) { db.ChangeTracker.Clear(); await Task.Delay(30 * (attempt + 1), ct); }
        }
        return false;
    }

    private async Task<bool> SetReactionOnceAsync(Guid actor, Guid messageId, string emoji, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var message = await repository.FindByIdAsync(messageId, ct);
        if (message is null || message.RecalledAt is not null || !await CanViewAsync(actor, message, ct)
            || !await CanMutateAsync(actor, message.ConversationId, ct)) return false;
        var reaction = await db.MessageReactions.SingleOrDefaultAsync(r => r.MessageId == messageId && r.UserId == actor, ct);
        if (reaction is null) db.MessageReactions.Add(new MessageReaction { Id = Guid.NewGuid(), MessageId = messageId, UserId = actor, Emoji = emoji, CreatedAt = Now });
        else { reaction.Emoji = emoji; reaction.CreatedAt = Now; }
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await PublishAsync(message, "MessageReactionChanged", ct);
        return true;
    }

    public async Task<bool> RemoveReactionAsync(Guid actor, Guid messageId, CancellationToken ct)
    {
        var message = await repository.FindByIdAsync(messageId, ct);
        if (message is null || !await CanViewAsync(actor, message, ct) || !await CanMutateAsync(actor, message.ConversationId, ct)) return false;
        var reaction = await db.MessageReactions.SingleOrDefaultAsync(r => r.MessageId == messageId && r.UserId == actor, ct);
        if (reaction is null) return false;
        db.MessageReactions.Remove(reaction);
        await db.SaveChangesAsync(ct);
        await PublishAsync(message, "MessageReactionChanged", ct);
        return true;
    }

    public async Task<MessageDto?> ForwardAsync(Guid actor, Guid sourceId, ForwardMessageRequest input, CancellationToken ct)
    {
        if (input.DestinationConversationId == Guid.Empty || input.ClientMessageId == Guid.Empty) return null;
        for (var attempt = 0; attempt < 3; attempt++)
        {
            try
            {
                await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
                var previous = await db.Messages.SingleOrDefaultAsync(m => m.SenderUserId == actor && m.ClientMessageId == input.ClientMessageId, ct);
                if (previous is not null) return previous.ConversationId == input.DestinationConversationId && previous.IsForwarded
                    ? await attachments.EnrichAsync(Map(previous), ct) : null;
                var source = await db.Messages.SingleOrDefaultAsync(m => m.Id == sourceId && m.RecalledAt == null, ct);
                if (source is null || !await CanViewAsync(actor, source, ct)) return null;
                var destination = await db.Conversations.SingleOrDefaultAsync(c => c.Id == input.DestinationConversationId && c.Status == "Active", ct);
                if (destination is null || !(destination.Type == "Group"
                    ? await groups.CanSendAsync(actor, destination.Id, ct)
                    : await privateChats.CanSendAcceptedAsync(actor, destination.Id, ct))) return null;
                if (!await db.Messages.AnyAsync(m => m.Id == sourceId && m.RecalledAt == null, ct)) return null;
                destination.LastSequence++;
                destination.UpdatedAt = Now;
                var forwarded = new Message { Id = Guid.NewGuid(), ConversationId = destination.Id, SenderUserId = actor,
                    ClientMessageId = input.ClientMessageId, Sequence = destination.LastSequence, Type = source.Type,
                    Content = source.Content, IsForwarded = true, Status = "Sent", CreatedAt = Now };
                db.Messages.Add(forwarded);
                var sourceAttachments = await db.MessageAttachments.Where(a => a.MessageId == sourceId).OrderBy(a => a.DisplayOrder).ToListAsync(ct);
                foreach (var attachment in sourceAttachments)
                    db.MessageAttachments.Add(new MessageAttachment { Id = Guid.NewGuid(), MessageId = forwarded.Id,
                        StoredFileId = attachment.StoredFileId, DisplayOrder = attachment.DisplayOrder });
                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                await PublishAsync(forwarded, "MessageCreated", ct);
                return await attachments.EnrichAsync(Map(forwarded), ct);
            }
            catch (Exception error) when (Retryable(error) && attempt < 2) { db.ChangeTracker.Clear(); await Task.Delay(30 * (attempt + 1), ct); }
        }
        return null;
    }

    public async Task<MessagePageDto?> SearchAsync(Guid actor, Guid conversationId, string query, long? beforeSequence, int limit, CancellationToken ct)
    {
        query = query?.Trim() ?? "";
        if (query.Length is < 2 or > 100) return null;
        if (!await CanReadConversationAsync(actor, conversationId, ct)) return null;
        var take = Math.Clamp(limit, 1, 50);
        var found = new List<MessageDto>(take + 1);
        long? cursor = beforeSequence;
        while (found.Count <= take)
        {
            var batch = await db.Messages.Where(m => m.ConversationId == conversationId && m.RecalledAt == null && m.Content != null
                    && m.Content.Contains(query) && (cursor == null || m.Sequence < cursor))
                .OrderByDescending(m => m.Sequence).Take(100).ToListAsync(ct);
            if (batch.Count == 0) break;
            foreach (var message in batch)
            {
                if (await CanViewAsync(actor, message, ct)) found.Add(Map(message));
                if (found.Count > take) break;
            }
            cursor = batch[^1].Sequence;
            if (batch.Count < 100 || found.Count > take) break;
        }
        if (!await CanReadConversationAsync(actor, conversationId, ct)) return null;
        return await attachments.EnrichAsync(new MessagePageDto(found.Take(take).ToList(),
            found.Count > take ? found[take - 1].Sequence : null, found.Count > take), ct);
    }

    private async Task<bool> CanReadConversationAsync(Guid actor, Guid conversationId, CancellationToken ct)
    {
        var type = await db.Conversations.Where(c => c.Id == conversationId).Select(c => c.Type).SingleOrDefaultAsync(ct);
        return type == "Group" ? await groups.CanReadAsync(actor, conversationId, ct)
            : type == "Private" && (await privateChats.CanReadAsync(actor, conversationId, ct)
                || await privateChats.CanReadRequestAsync(actor, conversationId, ct));
    }

    private async Task<bool> CanMutateAsync(Guid actor, Guid conversationId, CancellationToken ct)
    {
        var type = await db.Conversations.Where(c => c.Id == conversationId).Select(c => c.Type).SingleAsync(ct);
        return type == "Group" ? await groups.CanSendAsync(actor, conversationId, ct) : await privateChats.CanSendMessageAsync(actor, conversationId, ct);
    }

    private async Task<bool> CanViewAsync(Guid actor, Message message, CancellationToken ct)
    {
        if (await db.MessageUserStates.AnyAsync(s => s.MessageId == message.Id && s.UserId == actor, ct)) return false;
        var type = await db.Conversations.Where(c => c.Id == message.ConversationId).Select(c => c.Type).SingleAsync(ct);
        if (type == "Group") return await groups.CanViewMessageAsync(actor, message.ConversationId, message.Sequence, ct);
        var hidden = await db.ConversationUserStates.Where(s => s.ConversationId == message.ConversationId && s.UserId == actor)
            .Select(s => s.HiddenThroughSequence).SingleOrDefaultAsync(ct);
        return message.Sequence > hidden && (await privateChats.CanReadAsync(actor, message.ConversationId, ct)
            || await privateChats.CanReadRequestAsync(actor, message.ConversationId, ct));
    }

    public async Task<bool> CanViewAttachmentAsync(Guid actor, Guid messageId, CancellationToken ct)
    {
        var message = await db.Messages.SingleOrDefaultAsync(m => m.Id == messageId && m.RecalledAt == null, ct);
        return message is not null && await CanViewAsync(actor, message, ct);
    }

    private async Task PublishAsync(Message message, string eventName, CancellationToken ct)
    {
        var type = await db.Conversations.Where(c => c.Id == message.ConversationId).Select(c => c.Type).SingleAsync(ct);
        IEnumerable<Guid> recipients = type == "Group"
            ? await db.ConversationMembers.Where(m => m.ConversationId == message.ConversationId && m.LeftAt == null).Select(m => m.UserId).ToListAsync(ct)
            : await db.PrivateConversationPairs.Where(p => p.ConversationId == message.ConversationId).Select(p => new[] { p.UserId1, p.UserId2 }).SingleAsync(ct);
        foreach (var recipient in recipients)
        {
            var allowed = type == "Group" ? await groups.CanViewMessageAsync(recipient, message.ConversationId, message.Sequence, ct)
                : await privateChats.CanReadAsync(recipient, message.ConversationId, ct) || await privateChats.CanReadRequestAsync(recipient, message.ConversationId, ct);
            if (!allowed) continue;
            try { await hub.Clients.User(recipient.ToString()).SendAsync(eventName,
                new { eventId = Guid.NewGuid(), conversationId = message.ConversationId, messageId = message.Id, sequence = message.Sequence }, ct); }
            catch (Exception error) { logger.LogWarning(error, "Message action event delivery failed for {MessageId}", message.Id); }
        }
    }

    private static MessageDto Map(Message message) => new(message.Id, message.ConversationId, message.SenderUserId, message.ClientMessageId,
        message.Sequence, message.RecalledAt is null ? message.Content : null, message.CreatedAt, message.RecalledAt is not null,
        message.EditedAt, message.IsForwarded, message.ReplyToMessageId);

    private static bool Retryable(Exception error)
    {
        for (Exception? current = error; current is not null; current = current.InnerException)
            if (current is SqlException sql && sql.Number is 1205 or 2601 or 2627) return true;
        return false;
    }
}
