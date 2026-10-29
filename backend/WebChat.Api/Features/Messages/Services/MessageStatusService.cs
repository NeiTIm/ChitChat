using System.Data;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Conversations;
using WebChat.Api.Features.Groups;
using WebChat.Api.Infrastructure.Realtime;

namespace WebChat.Api.Features.Messages;

public sealed class MessageStatusService(AppDbContext db, TimeProvider clock, PrivateChatService privateChats, GroupService groups,
    IHubContext<ChatHub> hub, ILogger<MessageStatusService> logger)
{
    private DateTime Now => clock.GetUtcNow().UtcDateTime;

    public async Task<bool> AcknowledgeAsync(Guid actor, Guid conversationId, DeliveryAcksRequest input, CancellationToken ct)
    {
        var ids = input.MessageIds?.Distinct().ToArray() ?? [];
        if (ids.Length is < 1 or > 100 || ids.Any(id => id == Guid.Empty)) return false;
        for (var attempt = 0; attempt < 3; attempt++)
        {
            try { return await AcknowledgeOnceAsync(actor, conversationId, ids, ct); }
            catch (Exception error) when (Retryable(error) && attempt < 2) { db.ChangeTracker.Clear(); await Task.Delay(30 * (attempt + 1), ct); }
        }
        return false;
    }

    private async Task<bool> AcknowledgeOnceAsync(Guid actor, Guid conversationId, Guid[] ids, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var messages = await db.Messages.Where(m => ids.Contains(m.Id) && m.ConversationId == conversationId).ToListAsync(ct);
        if (messages.Count != ids.Length || messages.Any(m => m.SenderUserId == actor)) return false;
        foreach (var message in messages)
            if (!await CanViewMessageAsync(actor, message, ct)) return false;
        var existing = await db.MessageDeliveries.Where(d => ids.Contains(d.MessageId) && d.RecipientUserId == actor).Select(d => d.MessageId).ToListAsync(ct);
        var added = messages.Where(m => !existing.Contains(m.Id)).ToArray();
        foreach (var message in added)
            db.MessageDeliveries.Add(new MessageDelivery { MessageId = message.Id, RecipientUserId = actor, DeliveredAt = Now });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        foreach (var message in added)
        {
            var payload = new { eventId = Guid.NewGuid(), conversationId, messageId = message.Id, recipientUserId = actor,
                deliveredAt = db.MessageDeliveries.Local.First(d => d.MessageId == message.Id && d.RecipientUserId == actor).DeliveredAt };
            await SafeEventAsync(message.SenderUserId, "MessageDelivered", payload, ct);
            await SafeEventAsync(actor, "MessageDelivered", payload, ct);
        }
        return true;
    }

    public async Task<bool> MarkReadAsync(Guid actor, Guid conversationId, long sequence, CancellationToken ct)
    {
        if (sequence < 0) return false;
        for (var attempt = 0; attempt < 3; attempt++)
        {
            try { return await MarkReadOnceAsync(actor, conversationId, sequence, ct); }
            catch (Exception error) when (Retryable(error) && attempt < 2) { db.ChangeTracker.Clear(); await Task.Delay(30 * (attempt + 1), ct); }
        }
        return false;
    }

    private async Task<bool> MarkReadOnceAsync(Guid actor, Guid conversationId, long sequence, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await CanReadMainChatAsync(actor, conversationId, ct)) return false;
        var max = await db.Conversations.Where(c => c.Id == conversationId).Select(c => c.LastSequence).SingleAsync(ct);
        if (sequence > max) return false;
        var cursor = await db.ConversationReadCursors.SingleOrDefaultAsync(c => c.ConversationId == conversationId && c.UserId == actor, ct);
        if (cursor is null)
        {
            cursor = new ConversationReadCursor { ConversationId = conversationId, UserId = actor, LastReadSequence = 0, UpdatedAt = Now };
            db.ConversationReadCursors.Add(cursor);
        }
        var changed = sequence > cursor.LastReadSequence;
        if (changed) { cursor.LastReadSequence = sequence; cursor.UpdatedAt = Now; }
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        if (changed)
        {
            var payload = new { eventId = Guid.NewGuid(), conversationId, userId = actor, lastReadSequence = sequence };
            await SafeEventAsync(actor, "MessageSeen", payload, ct);
            var type = await db.Conversations.Where(c => c.Id == conversationId).Select(c => c.Type).SingleAsync(ct);
            if (type == "Private")
            {
                var pair = await db.PrivateConversationPairs.SingleAsync(p => p.ConversationId == conversationId, ct);
                var other = pair.UserId1 == actor ? pair.UserId2 : pair.UserId1;
                if (await privateChats.CanReadAsync(other, conversationId, ct)) await SafeEventAsync(other, "MessageSeen", payload, ct);
            }
            else if (type == "Group")
            {
                var memberIds = await db.ConversationMembers.Where(m => m.ConversationId == conversationId && m.UserId != actor && m.LeftAt == null)
                    .Select(m => m.UserId).Distinct().ToListAsync(ct);
                foreach (var memberId in memberIds)
                    if (await groups.CanSendAsync(memberId, conversationId, ct)) await SafeEventAsync(memberId, "MessageSeen", payload, ct);
            }
        }
        return true;
    }

    public async Task<UnreadDto?> UnreadAsync(Guid actor, Guid conversationId, CancellationToken ct)
    {
        if (!await CanReadMainChatAsync(actor, conversationId, ct)) return null;
        var cursor = await db.ConversationReadCursors.Where(c => c.ConversationId == conversationId && c.UserId == actor)
            .Select(c => c.LastReadSequence).SingleOrDefaultAsync(ct);
        var hidden = await db.ConversationUserStates.Where(s => s.ConversationId == conversationId && s.UserId == actor)
            .Select(s => s.HiddenThroughSequence).SingleOrDefaultAsync(ct);
        var lower = Math.Max(cursor, hidden);
        var type = await db.Conversations.Where(c => c.Id == conversationId).Select(c => c.Type).SingleAsync(ct);
        var count = await db.Messages.CountAsync(m => m.ConversationId == conversationId && m.Sequence > lower && m.SenderUserId != actor
            && !db.MessageUserStates.Any(s => s.MessageId == m.Id && s.UserId == actor)
            && (type == "Private" || db.ConversationMembers.Any(member => member.ConversationId == conversationId && member.UserId == actor
                && m.Sequence >= member.JoinSequence && (member.LeaveSequence == null || m.Sequence <= member.LeaveSequence))), ct);
        if (!await CanReadMainChatAsync(actor, conversationId, ct)) return null;
        return new UnreadDto(count, cursor);
    }

    private async Task<bool> CanReadMainChatAsync(Guid actor, Guid conversationId, CancellationToken ct)
    {
        var type = await db.Conversations.Where(c => c.Id == conversationId).Select(c => c.Type).SingleOrDefaultAsync(ct);
        return type == "Group" ? await groups.CanSendAsync(actor, conversationId, ct)
            : type == "Private" && await privateChats.CanReadAsync(actor, conversationId, ct);
    }

    private async Task<bool> CanViewMessageAsync(Guid actor, Message message, CancellationToken ct)
    {
        if (await db.MessageUserStates.AnyAsync(s => s.MessageId == message.Id && s.UserId == actor, ct)) return false;
        var type = await db.Conversations.Where(c => c.Id == message.ConversationId).Select(c => c.Type).SingleAsync(ct);
        if (type == "Group") return await groups.CanViewMessageAsync(actor, message.ConversationId, message.Sequence, ct);
        var hidden = await db.ConversationUserStates.Where(s => s.ConversationId == message.ConversationId && s.UserId == actor)
            .Select(s => s.HiddenThroughSequence).SingleOrDefaultAsync(ct);
        return message.Sequence > hidden && (await privateChats.CanReadAsync(actor, message.ConversationId, ct)
            || await privateChats.CanReadRequestAsync(actor, message.ConversationId, ct));
    }

    private async Task SafeEventAsync(Guid recipient, string name, object payload, CancellationToken ct)
    {
        try { await hub.Clients.User(recipient.ToString()).SendAsync(name, payload, ct); }
        catch (Exception error) { logger.LogWarning(error, "Status event delivery failed for {RecipientId}", recipient); }
    }

    private static bool Retryable(Exception error)
    {
        for (Exception? current = error; current is not null; current = current.InnerException)
            if (current is SqlException sql && sql.Number is 1205 or 2601 or 2627) return true;
        return false;
    }
}
