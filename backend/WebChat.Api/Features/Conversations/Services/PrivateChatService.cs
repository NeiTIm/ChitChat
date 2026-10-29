using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Files;
using WebChat.Api.Infrastructure.Realtime;

namespace WebChat.Api.Features.Conversations;

public sealed class PrivateChatService(AppDbContext db, TimeProvider clock, IHubContext<ChatHub> hub,
    MessageAttachmentService attachments, ILogger<PrivateChatService> logger)
{
    private DateTime Now => clock.GetUtcNow().UtcDateTime;
    private static (Guid First, Guid Second) Pair(Guid a, Guid b) => a.CompareTo(b) < 0 ? (a, b) : (b, a);

    public async Task<ConversationDto?> OpenAsync(Guid actor, Guid target, CancellationToken ct)
    {
        if (actor == target || !await ActivePairAsync(actor, target, ct) || await BlockedAsync(actor, target, ct)) return null;
        var (first, second) = Pair(actor, target);
        for (var attempt = 0; attempt < 3; attempt++)
        {
            try
            {
                await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
                if (!await ActivePairAsync(actor, target, ct) || await BlockedAsync(actor, target, ct)) return null;
                var pair = await db.PrivateConversationPairs.SingleOrDefaultAsync(p => p.UserId1 == first && p.UserId2 == second, ct);
                if (pair is not null)
                {
                    var existing = await db.Conversations.FindAsync([pair.ConversationId], ct);
                    return existing is null ? null : new ConversationDto(existing.Id, existing.Type, existing.Status, target, existing.LastSequence, existing.UpdatedAt);
                }
                var isFriend = await db.Friendships.AnyAsync(f => f.UserId1 == first && f.UserId2 == second && f.RemovedAt == null, ct);
                var conversation = new Conversation { Id = Guid.NewGuid(), Type = "Private", Status = "Active", LastSequence = 0, CreatedAt = Now, UpdatedAt = Now };
                db.Conversations.Add(conversation);
                db.PrivateConversationPairs.Add(new PrivateConversationPair { ConversationId = conversation.Id, UserId1 = first, UserId2 = second });
                if (isFriend)
                {
                    db.PrivateChatAccess.Add(new PrivateChatAccess { ConversationId = conversation.Id, SenderUserId = actor, ReceiverUserId = target, Status = "Accepted", AcceptedAt = Now, UpdatedAt = Now });
                    db.PrivateChatAccess.Add(new PrivateChatAccess { ConversationId = conversation.Id, SenderUserId = target, ReceiverUserId = actor, Status = "Accepted", AcceptedAt = Now, UpdatedAt = Now });
                }
                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return new ConversationDto(conversation.Id, conversation.Type, conversation.Status, target, 0, conversation.UpdatedAt);
            }
            catch (Exception error) when (Retryable(error) && attempt < 2) { db.ChangeTracker.Clear(); await Task.Delay(30 * (attempt + 1), ct); }
        }
        return null;
    }

    public async Task<bool> CanReadAsync(Guid actor, Guid id, CancellationToken ct)
    {
        var pair = await db.PrivateConversationPairs.SingleOrDefaultAsync(p => p.ConversationId == id, ct);
        if (pair is null || (pair.UserId1 != actor && pair.UserId2 != actor)) return false;
        var other = pair.UserId1 == actor ? pair.UserId2 : pair.UserId1;
        if (!await ActivePairAsync(actor, other, ct) || await BlockedAsync(actor, other, ct)) return false;
        return await db.Friendships.AnyAsync(f => f.UserId1 == pair.UserId1 && f.UserId2 == pair.UserId2 && f.RemovedAt == null, ct)
            || await db.PrivateChatAccess.AnyAsync(a => a.ConversationId == id && a.Status == "Accepted" && (a.SenderUserId == actor || a.ReceiverUserId == actor), ct);
    }

    public async Task<bool> CanReadRequestAsync(Guid actor, Guid id, CancellationToken ct)
    {
        var request = await db.MessageRequests.AnyAsync(r => r.ConversationId == id && r.Status == "Pending" && (r.SenderUserId == actor || r.ReceiverUserId == actor), ct);
        if (!request) return false;
        var pair = await db.PrivateConversationPairs.SingleAsync(p => p.ConversationId == id, ct);
        var other = pair.UserId1 == actor ? pair.UserId2 : pair.UserId1;
        return await ActivePairAsync(actor, other, ct) && !await BlockedAsync(actor, other, ct);
    }

    public async Task<ConversationDto?> GetAsync(Guid actor, Guid id, CancellationToken ct)
    {
        if (!await CanReadAsync(actor, id, ct) && !await CanReadRequestAsync(actor, id, ct)
            && !await CanSendOrRequestAsync(actor, id, ct)) return null;
        var pair = await db.PrivateConversationPairs.SingleAsync(p => p.ConversationId == id, ct);
        var conversation = await db.Conversations.SingleAsync(c => c.Id == id, ct);
        return new ConversationDto(id, conversation.Type, conversation.Status, pair.UserId1 == actor ? pair.UserId2 : pair.UserId1, conversation.LastSequence, conversation.UpdatedAt);
    }

    public async Task<List<ConversationDto>> ListAsync(Guid actor, CancellationToken ct)
    {
        var pairs = await (from pair in db.PrivateConversationPairs
                           join conversation in db.Conversations on pair.ConversationId equals conversation.Id
                           where pair.UserId1 == actor || pair.UserId2 == actor
                           orderby conversation.UpdatedAt descending, conversation.Id
                           select new { pair.ConversationId, pair.UserId1, pair.UserId2, conversation.Type, conversation.Status, conversation.LastSequence, conversation.UpdatedAt }).ToListAsync(ct);
        var result = new List<ConversationDto>();
        foreach (var item in pairs)
            if (await CanReadAsync(actor, item.ConversationId, ct)
                && !await db.ConversationUserStates.AnyAsync(s => s.ConversationId == item.ConversationId && s.UserId == actor
                    && s.IsHidden && s.HiddenThroughSequence >= item.LastSequence, ct))
                result.Add(new ConversationDto(item.ConversationId, item.Type, item.Status, item.UserId1 == actor ? item.UserId2 : item.UserId1, item.LastSequence, item.UpdatedAt));
        return result;
    }

    public async Task<bool> HideForMeAsync(Guid actor, Guid id, CancellationToken ct)
    {
        if (!await CanReadAsync(actor, id, ct)) return false;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await CanReadAsync(actor, id, ct)) return false;
        var sequence = await db.Conversations.Where(c => c.Id == id).Select(c => c.LastSequence).SingleAsync(ct);
        var state = await db.ConversationUserStates.SingleOrDefaultAsync(s => s.ConversationId == id && s.UserId == actor, ct);
        if (state is null)
        {
            state = new ConversationUserState { ConversationId = id, UserId = actor };
            db.ConversationUserStates.Add(state);
        }
        state.HiddenThroughSequence = Math.Max(state.HiddenThroughSequence, sequence);
        state.IsHidden = true;
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }

    public async Task<MessageDto?> SendAsync(Guid actor, Guid id, SendMessageRequest input, CancellationToken ct)
    {
        if (input.ClientMessageId == Guid.Empty || (string.IsNullOrWhiteSpace(input.Content) && input.AttachmentIds is not { Count: > 0 })
            || !await CanSendOrRequestAsync(actor, id, ct)) return null;
        for (var attempt = 0; attempt < 3; attempt++)
        {
            try
            {
                await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
                if (!await CanSendOrRequestAsync(actor, id, ct)) return null;
                var previous = await db.Messages.SingleOrDefaultAsync(m => m.SenderUserId == actor && m.ClientMessageId == input.ClientMessageId, ct);
                if (previous is not null)
                {
                    if (previous.ConversationId != id) return null;
                    return await attachments.EnrichAsync(Map(previous), ct);
                }
                if (input.ReplyToMessageId is { } replyId)
                {
                    var reply = await db.Messages.SingleOrDefaultAsync(m => m.Id == replyId && m.ConversationId == id, ct);
                    if (reply is null || await db.MessageUserStates.AnyAsync(s => s.MessageId == replyId && s.UserId == actor, ct)) return null;
                    var hidden = await db.ConversationUserStates.Where(s => s.ConversationId == id && s.UserId == actor)
                        .Select(s => s.HiddenThroughSequence).SingleOrDefaultAsync(ct);
                    if (reply.Sequence <= hidden) return null;
                }
                if (!await CanSendAsync(actor, id, ct))
                {
                    var pairForRequest = await db.PrivateConversationPairs.SingleAsync(p => p.ConversationId == id, ct);
                    var receiver = pairForRequest.UserId1 == actor ? pairForRequest.UserId2 : pairForRequest.UserId1;
                    if (!await db.MessageRequests.AnyAsync(r => r.ConversationId == id && r.SenderUserId == actor && r.ReceiverUserId == receiver && r.Status == "Pending", ct))
                        db.MessageRequests.Add(new MessageRequest { Id = Guid.NewGuid(), ConversationId = id, SenderUserId = actor, ReceiverUserId = receiver, Status = "Pending", CreatedAt = Now });
                }
                var conversation = await db.Conversations.SingleAsync(c => c.Id == id, ct);
                conversation.LastSequence++;
                conversation.UpdatedAt = Now;
                var message = new Message { Id = Guid.NewGuid(), ConversationId = id, SenderUserId = actor, ClientMessageId = input.ClientMessageId, Sequence = conversation.LastSequence,
                    Type = input.AttachmentIds is { Count: > 0 } ? "Media" : "Text", Content = input.Content?.Trim(), ReplyToMessageId = input.ReplyToMessageId, Status = "Sent", CreatedAt = Now };
                db.Messages.Add(message);
                if (!await attachments.BindPendingAsync(actor, message.Id, input.AttachmentIds, ct)) return null;
                var pair = await db.PrivateConversationPairs.SingleAsync(p => p.ConversationId == id, ct);
                var recipient = pair.UserId1 == actor ? pair.UserId2 : pair.UserId1;
                var muted = await db.ConversationUserStates.AnyAsync(s => s.ConversationId == id && s.UserId == recipient && s.MutedUntil > Now, ct);
                Notification? notification = null;
                if (!muted)
                {
                    notification = new Notification { Id = Guid.NewGuid(), RecipientUserId = recipient, ActorUserId = actor,
                        Type = await CanSendAsync(actor, id, ct) ? "Message" : "MessageRequest", ReferenceId = message.Id, CreatedAt = Now };
                    db.Notifications.Add(notification);
                }
                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                // Fanout only after commit and after a fresh recipient entitlement check.
                if (await CanReadAsync(recipient, id, ct) || await CanReadRequestAsync(recipient, id, ct))
                {
                    try
                    {
                        await hub.Clients.User(recipient.ToString()).SendAsync("MessageCreated", new { eventId = Guid.NewGuid(), conversationId = id, messageId = message.Id, sequence = message.Sequence }, ct);
                        if (notification is not null) await hub.Clients.User(recipient.ToString()).SendAsync("NotificationCreated",
                            new { eventId = Guid.NewGuid(), notificationId = notification.Id, type = notification.Type, referenceId = message.Id }, ct);
                    }
                    catch (Exception error) { logger.LogWarning(error, "Private message event delivery failed for {MessageId}", message.Id); }
                }
                try { await hub.Clients.User(actor.ToString()).SendAsync("MessageCreated", new { eventId = Guid.NewGuid(), conversationId = id, messageId = message.Id, sequence = message.Sequence }, ct); }
                catch (Exception error) { logger.LogWarning(error, "Own message event delivery failed for {MessageId}", message.Id); }
                return await attachments.EnrichAsync(Map(message), ct);
            }
            catch (Exception error) when (Retryable(error) && attempt < 2) { db.ChangeTracker.Clear(); await Task.Delay(30 * (attempt + 1), ct); }
        }
        return null;
    }

    public async Task<MessagePageDto?> HistoryAsync(Guid actor, Guid id, long? before, int limit, CancellationToken ct)
    {
        if (!await CanReadAsync(actor, id, ct) && !await CanReadRequestAsync(actor, id, ct)) return null;
        var count = Math.Clamp(limit, 1, 50);
        var hidden = await db.ConversationUserStates.Where(s => s.ConversationId == id && s.UserId == actor).Select(s => s.HiddenThroughSequence).SingleOrDefaultAsync(ct);
        var messages = await db.Messages.Where(m => m.ConversationId == id && m.Sequence > hidden && (before == null || m.Sequence < before)
                && !db.MessageUserStates.Any(s => s.MessageId == m.Id && s.UserId == actor))
            .OrderByDescending(m => m.Sequence).Take(count + 1).ToListAsync(ct);
        if (!await CanReadAsync(actor, id, ct) && !await CanReadRequestAsync(actor, id, ct)) return null;
        return await attachments.EnrichAsync(new MessagePageDto(messages.Take(count).Select(Map).ToList(),
            messages.Count > count ? messages[count - 1].Sequence : null, messages.Count > count), ct);
    }

    private async Task<bool> CanSendAsync(Guid actor, Guid id, CancellationToken ct)
    {
        var pair = await db.PrivateConversationPairs.SingleOrDefaultAsync(p => p.ConversationId == id, ct);
        if (pair is null || (pair.UserId1 != actor && pair.UserId2 != actor)) return false;
        var other = pair.UserId1 == actor ? pair.UserId2 : pair.UserId1;
        if (!await ActivePairAsync(actor, other, ct) || await BlockedAsync(actor, other, ct)) return false;
        return await db.Friendships.AnyAsync(f => f.UserId1 == pair.UserId1 && f.UserId2 == pair.UserId2 && f.RemovedAt == null, ct)
            || await db.PrivateChatAccess.AnyAsync(a => a.ConversationId == id && a.SenderUserId == actor && a.ReceiverUserId == other && a.Status == "Accepted", ct);
    }

    private async Task<bool> CanSendOrRequestAsync(Guid actor, Guid id, CancellationToken ct)
    {
        if (await CanSendAsync(actor, id, ct)) return true;
        var pair = await db.PrivateConversationPairs.SingleOrDefaultAsync(p => p.ConversationId == id, ct);
        if (pair is null || (pair.UserId1 != actor && pair.UserId2 != actor)) return false;
        var receiver = pair.UserId1 == actor ? pair.UserId2 : pair.UserId1;
        if (!await ActivePairAsync(actor, receiver, ct) || await BlockedAsync(actor, receiver, ct)) return false;
        var access = await db.PrivateChatAccess.SingleOrDefaultAsync(a => a.ConversationId == id && a.SenderUserId == actor && a.ReceiverUserId == receiver, ct);
        if (access?.Status is "Rejected" or "Revoked") return false;
        if (await db.MessageRequests.AnyAsync(r => r.ConversationId == id && r.SenderUserId == actor && r.ReceiverUserId == receiver && r.Status == "Pending", ct)) return true;
        if (await db.MessageRequests.AnyAsync(r => r.ConversationId == id && r.SenderUserId == actor && r.ReceiverUserId == receiver && (r.Status == "Rejected" || r.Status == "Blocked"), ct)) return false;
        return await db.UserPrivacySettings.AnyAsync(p => p.UserId == receiver && p.AllowStrangerMessages, ct);
    }

    public Task<bool> CanSendMessageAsync(Guid actor, Guid id, CancellationToken ct) => CanSendOrRequestAsync(actor, id, ct);
    public Task<bool> CanSendAcceptedAsync(Guid actor, Guid id, CancellationToken ct) => CanSendAsync(actor, id, ct);

    private async Task<bool> ActivePairAsync(Guid a, Guid b, CancellationToken ct) =>
        await db.Users.CountAsync(u => (u.Id == a || u.Id == b) && u.EmailVerifiedAt != null && u.DeactivatedAt == null, ct) == 2
        && !await db.AccountSuspensions.AnyAsync(s => (s.UserId == a || s.UserId == b) && s.Status == "Active" && s.RevokedAt == null && (s.ExpiresAt == null || s.ExpiresAt > Now), ct);

    private Task<bool> BlockedAsync(Guid a, Guid b, CancellationToken ct) =>
        db.UserBlocks.AnyAsync(block => ((block.BlockerUserId == a && block.BlockedUserId == b) || (block.BlockerUserId == b && block.BlockedUserId == a)) && block.UnblockedAt == null, ct);

    private static MessageDto Map(Message message) => new(message.Id, message.ConversationId, message.SenderUserId, message.ClientMessageId, message.Sequence, message.RecalledAt is null ? message.Content : null, message.CreatedAt, message.RecalledAt is not null, message.EditedAt, message.IsForwarded, message.ReplyToMessageId);
    private static bool Retryable(Exception error)
    {
        for (Exception? current = error; current is not null; current = current.InnerException)
            if (current is SqlException sql && sql.Number is 1205 or 2601 or 2627) return true;
        return false;
    }
}
