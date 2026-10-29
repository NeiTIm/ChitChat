using System.Data;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Conversations;
using WebChat.Api.Features.Files;
using WebChat.Api.Infrastructure.Realtime;

namespace WebChat.Api.Features.Groups;

public sealed class GroupService(AppDbContext db, TimeProvider clock, IHubContext<ChatHub> hub,
    MessageAttachmentService attachments, ILogger<GroupService> logger)
{
    private DateTime Now => clock.GetUtcNow().UtcDateTime;

    public async Task<GroupDto?> CreateAsync(Guid actor, CreateGroupRequest input, CancellationToken ct)
    {
        var name = input.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name) || name.Length > 100 || !await ActiveUserAsync(actor, ct)) return null;
        var invitees = (input.InviteeUserIds ?? []).Where(id => id != actor).Distinct().ToArray();
        if (invitees.Length > 99) return null;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var conversation = new Conversation { Id = Guid.NewGuid(), Type = "Group", Status = "Active", LastSequence = 0, CreatedAt = Now, UpdatedAt = Now };
        db.Conversations.Add(conversation);
        db.GroupProfiles.Add(new GroupProfile { ConversationId = conversation.Id, Name = name, Description = input.Description?.Trim(), CreatedByUserId = actor, CreatedAt = Now });
        db.ConversationMembers.Add(new ConversationMember { Id = Guid.NewGuid(), ConversationId = conversation.Id, UserId = actor, Role = "Owner", JoinSequence = 0, JoinedAt = Now });
        foreach (var invitee in invitees)
        {
            if (!await CanInviteUserAsync(actor, invitee, ct)) return null;
            db.GroupInvitations.Add(new GroupInvitation { Id = Guid.NewGuid(), ConversationId = conversation.Id, InviterUserId = actor, InviteeUserId = invitee, Status = "Pending", CreatedAt = Now });
        }
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return new GroupDto(conversation.Id, name, input.Description?.Trim(), "Active", actor, 0, "Owner");
    }

    public async Task<List<GroupDto>> ListAsync(Guid actor, CancellationToken ct) =>
        await (from conversation in db.Conversations
               join profile in db.GroupProfiles on conversation.Id equals profile.ConversationId
               where (conversation.Status == "Active" || conversation.Status == "Dissolved")
                   && db.ConversationMembers.Any(m => m.ConversationId == conversation.Id && m.UserId == actor
                       && (m.LeftAt == null || conversation.Status == "Dissolved"))
               orderby conversation.UpdatedAt descending
               select new GroupDto(conversation.Id, profile.Name, profile.Description, conversation.Status, profile.CreatedByUserId,
                   conversation.LastSequence, db.ConversationMembers.Where(m => m.ConversationId == conversation.Id && m.UserId == actor && m.LeftAt == null)
                       .Select(m => m.Role).FirstOrDefault(), profile.AvatarFileId)).ToListAsync(ct);

    public async Task<GroupDto?> GetAsync(Guid actor, Guid id, CancellationToken ct)
    {
        if (!await CanReadAsync(actor, id, ct)) return null;
        return await (from conversation in db.Conversations
                      join profile in db.GroupProfiles on conversation.Id equals profile.ConversationId
                      where conversation.Id == id
                      select new GroupDto(conversation.Id, profile.Name, profile.Description, conversation.Status, profile.CreatedByUserId,
                          conversation.LastSequence, db.ConversationMembers.Where(m => m.ConversationId == id && m.UserId == actor && m.LeftAt == null).Select(m => m.Role).FirstOrDefault(), profile.AvatarFileId)).SingleOrDefaultAsync(ct);
    }

    public async Task<List<GroupMemberDto>?> MembersAsync(Guid actor, Guid id, CancellationToken ct)
    {
        if (!await CanSendAsync(actor, id, ct)) return null;
        return await db.ConversationMembers.Where(m => m.ConversationId == id && m.LeftAt == null)
            .OrderBy(m => m.JoinedAt).ThenBy(m => m.Id)
            .Select(m => new GroupMemberDto(m.UserId, m.Role, m.JoinSequence, m.JoinedAt)).ToListAsync(ct);
    }

    public async Task<bool> InviteAsync(Guid actor, Guid id, Guid invitee, CancellationToken ct)
    {
        if (!await CanSendAsync(actor, id, ct) || !await CanInviteUserAsync(actor, invitee, ct)) return false;
        for (var attempt = 0; attempt < 3; attempt++)
        {
            try
            {
                await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
                if (!await CanSendAsync(actor, id, ct) || !await CanInviteUserAsync(actor, invitee, ct)) return false;
                if (await db.ConversationMembers.AnyAsync(m => m.ConversationId == id && m.UserId == invitee && m.LeftAt == null, ct)
                    || await db.GroupInvitations.AnyAsync(i => i.ConversationId == id && i.InviteeUserId == invitee && i.Status == "Pending", ct)) return false;
                db.GroupInvitations.Add(new GroupInvitation { Id = Guid.NewGuid(), ConversationId = id, InviterUserId = actor, InviteeUserId = invitee, Status = "Pending", CreatedAt = Now });
                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return true;
            }
            catch (Exception error) when (Retryable(error) && attempt < 2) { db.ChangeTracker.Clear(); await Task.Delay(30 * (attempt + 1), ct); }
        }
        return false;
    }

    public async Task<List<GroupInvitationDto>> InvitationsAsync(Guid actor, CancellationToken ct) =>
        await (from invitation in db.GroupInvitations
               join conversation in db.Conversations on invitation.ConversationId equals conversation.Id
               join profile in db.GroupProfiles on conversation.Id equals profile.ConversationId
               where invitation.InviteeUserId == actor && invitation.Status == "Pending" && conversation.Status == "Active"
               orderby invitation.CreatedAt descending
               select new GroupInvitationDto(invitation.Id, conversation.Id, invitation.InviterUserId, actor, profile.Name, invitation.CreatedAt)).ToListAsync(ct);

    public async Task<bool> RespondInvitationAsync(Guid actor, Guid invitationId, bool accept, CancellationToken ct)
    {
        for (var attempt = 0; attempt < 3; attempt++)
        {
            try { return await RespondInvitationOnceAsync(actor, invitationId, accept, ct); }
            catch (Exception error) when (Retryable(error) && attempt < 2) { db.ChangeTracker.Clear(); await Task.Delay(30 * (attempt + 1), ct); }
        }
        return false;
    }

    private async Task<bool> RespondInvitationOnceAsync(Guid actor, Guid invitationId, bool accept, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var invitation = await db.GroupInvitations.SingleOrDefaultAsync(i => i.Id == invitationId && i.InviteeUserId == actor && i.Status == "Pending", ct);
        if (invitation is null) return false;
        var conversation = await db.Conversations.SingleOrDefaultAsync(c => c.Id == invitation.ConversationId && c.Type == "Group" && c.Status == "Active", ct);
        if (conversation is null || !await ActiveUserAsync(actor, ct)) return false;
        if (accept)
        {
            if (await BlockedAsync(actor, invitation.InviterUserId, ct)) return false;
            if (await db.ConversationMembers.AnyAsync(m => m.ConversationId == conversation.Id && m.UserId == actor && m.LeftAt == null, ct)) return false;
            if (await db.ConversationMembers.CountAsync(m => m.ConversationId == conversation.Id && m.LeftAt == null, ct) >= 100) return false;
            var lastRemoval = await db.ConversationMembers.Where(m => m.ConversationId == conversation.Id && m.UserId == actor && m.LeftReason == "Removed")
                .MaxAsync(m => (DateTime?)m.LeftAt, ct);
            if (lastRemoval is not null && invitation.CreatedAt <= lastRemoval) return false;
            db.ConversationMembers.Add(new ConversationMember { Id = Guid.NewGuid(), ConversationId = conversation.Id, UserId = actor, Role = "Member",
                JoinSequence = conversation.LastSequence + 1, JoinedAt = Now });
        }
        invitation.Status = accept ? "Accepted" : "Rejected";
        invitation.RespondedAt = Now;
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }

    public async Task<bool> LeaveAsync(Guid actor, Guid id, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var member = await db.ConversationMembers.SingleOrDefaultAsync(m => m.ConversationId == id && m.UserId == actor && m.LeftAt == null, ct);
        var conversation = await db.Conversations.SingleOrDefaultAsync(c => c.Id == id && c.Status == "Active" && c.Type == "Group", ct);
        if (member is null || member.Role == "Owner" || conversation is null) return false;
        member.LeftAt = Now;
        member.LeaveSequence = conversation.LastSequence;
        member.LeftReason = "Left";
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }

    public async Task<bool> CanReadAsync(Guid actor, Guid id, CancellationToken ct) =>
        await db.Conversations.AnyAsync(c => c.Id == id && c.Type == "Group" && (c.Status == "Active" || c.Status == "Dissolved"), ct)
        && await db.ConversationMembers.AnyAsync(m => m.ConversationId == id && m.UserId == actor, ct)
        && await ActiveUserAsync(actor, ct);

    public async Task<bool> CanSendAsync(Guid actor, Guid id, CancellationToken ct) =>
        await db.Conversations.AnyAsync(c => c.Id == id && c.Type == "Group" && c.Status == "Active", ct)
        && await db.ConversationMembers.AnyAsync(m => m.ConversationId == id && m.UserId == actor && m.LeftAt == null, ct)
        && await ActiveUserAsync(actor, ct);

    public async Task<bool> CanViewMessageAsync(Guid actor, Guid id, long sequence, CancellationToken ct) =>
        await CanReadAsync(actor, id, ct)
        && await db.ConversationMembers.AnyAsync(m => m.ConversationId == id && m.UserId == actor && sequence >= m.JoinSequence
            && (m.LeaveSequence == null || sequence <= m.LeaveSequence), ct);

    public async Task<MessageDto?> SendAsync(Guid actor, Guid id, SendMessageRequest input, CancellationToken ct)
    {
        if (input.ClientMessageId == Guid.Empty || (string.IsNullOrWhiteSpace(input.Content) && input.AttachmentIds is not { Count: > 0 })
            || !await CanSendAsync(actor, id, ct)) return null;
        for (var attempt = 0; attempt < 3; attempt++)
        {
            try
            {
                await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
                if (!await CanSendAsync(actor, id, ct)) return null;
                var previous = await db.Messages.SingleOrDefaultAsync(m => m.SenderUserId == actor && m.ClientMessageId == input.ClientMessageId, ct);
                if (previous is not null) return previous.ConversationId == id ? await attachments.EnrichAsync(Map(previous), ct) : null;
                if (input.ReplyToMessageId is { } replyId)
                {
                    var reply = await db.Messages.SingleOrDefaultAsync(m => m.Id == replyId && m.ConversationId == id, ct);
                    if (reply is null || !await CanViewMessageAsync(actor, id, reply.Sequence, ct)
                        || await db.MessageUserStates.AnyAsync(s => s.MessageId == replyId && s.UserId == actor, ct)) return null;
                }
                var conversation = await db.Conversations.SingleAsync(c => c.Id == id, ct);
                conversation.LastSequence++;
                conversation.UpdatedAt = Now;
                var message = new Message { Id = Guid.NewGuid(), ConversationId = id, SenderUserId = actor, ClientMessageId = input.ClientMessageId,
                    Sequence = conversation.LastSequence, Type = input.AttachmentIds is { Count: > 0 } ? "Media" : "Text",
                    Content = input.Content?.Trim(), ReplyToMessageId = input.ReplyToMessageId, Status = "Sent", CreatedAt = Now };
                db.Messages.Add(message);
                if (!await attachments.BindPendingAsync(actor, message.Id, input.AttachmentIds, ct)) return null;
                var recipients = await db.ConversationMembers.Where(m => m.ConversationId == id && m.LeftAt == null).Select(m => m.UserId).ToListAsync(ct);
                var mutedRecipients = await db.ConversationUserStates.Where(s => s.ConversationId == id && s.MutedUntil > Now)
                    .Select(s => s.UserId).ToListAsync(ct);
                var notifications = new Dictionary<Guid, Notification>();
                foreach (var recipient in recipients.Where(userId => userId != actor && !mutedRecipients.Contains(userId)))
                {
                    var notification = new Notification { Id = Guid.NewGuid(), RecipientUserId = recipient, ActorUserId = actor,
                        Type = "GroupMessage", ReferenceId = message.Id, CreatedAt = Now };
                    db.Notifications.Add(notification);
                    notifications[recipient] = notification;
                }
                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                foreach (var recipient in recipients)
                    if (await CanSendAsync(recipient, id, ct))
                    {
                        try
                        {
                            await hub.Clients.User(recipient.ToString()).SendAsync("MessageCreated", new { eventId = Guid.NewGuid(), conversationId = id, messageId = message.Id, sequence = message.Sequence }, ct);
                            if (notifications.TryGetValue(recipient, out var notification))
                                await hub.Clients.User(recipient.ToString()).SendAsync("NotificationCreated",
                                    new { eventId = Guid.NewGuid(), notificationId = notification.Id, type = notification.Type, referenceId = message.Id }, ct);
                        }
                        catch (Exception error) { logger.LogWarning(error, "Group message event delivery failed for {MessageId}", message.Id); }
                    }
                return await attachments.EnrichAsync(Map(message), ct);
            }
            catch (Exception error) when (Retryable(error) && attempt < 2) { db.ChangeTracker.Clear(); await Task.Delay(30 * (attempt + 1), ct); }
        }
        return null;
    }

    public async Task<MessagePageDto?> HistoryAsync(Guid actor, Guid id, long? before, int limit, CancellationToken ct)
    {
        if (!await CanReadAsync(actor, id, ct)) return null;
        var count = Math.Clamp(limit, 1, 50);
        var messages = await db.Messages.Where(message => message.ConversationId == id && (before == null || message.Sequence < before)
                && db.ConversationMembers.Any(m => m.ConversationId == id && m.UserId == actor && message.Sequence >= m.JoinSequence
                    && (m.LeaveSequence == null || message.Sequence <= m.LeaveSequence))
                && !db.MessageUserStates.Any(s => s.MessageId == message.Id && s.UserId == actor))
            .OrderByDescending(message => message.Sequence).Take(count + 1).ToListAsync(ct);
        if (!await CanReadAsync(actor, id, ct)) return null;
        return await attachments.EnrichAsync(new MessagePageDto(messages.Take(count).Select(Map).ToList(),
            messages.Count > count ? messages[count - 1].Sequence : null, messages.Count > count), ct);
    }

    private async Task<bool> CanInviteUserAsync(Guid inviter, Guid invitee, CancellationToken ct) =>
        inviter != invitee && await ActiveUserAsync(invitee, ct)
        && await db.UserPrivacySettings.AnyAsync(p => p.UserId == invitee && p.AllowGroupInvites, ct)
        && !await BlockedAsync(inviter, invitee, ct);

    private async Task<bool> ActiveUserAsync(Guid id, CancellationToken ct) =>
        await db.Users.AnyAsync(u => u.Id == id && u.EmailVerifiedAt != null && u.DeactivatedAt == null, ct)
        && !await db.AccountSuspensions.AnyAsync(s => s.UserId == id && s.Status == "Active" && s.RevokedAt == null && (s.ExpiresAt == null || s.ExpiresAt > Now), ct);

    private Task<bool> BlockedAsync(Guid a, Guid b, CancellationToken ct) =>
        db.UserBlocks.AnyAsync(block => ((block.BlockerUserId == a && block.BlockedUserId == b) || (block.BlockerUserId == b && block.BlockedUserId == a)) && block.UnblockedAt == null, ct);

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
