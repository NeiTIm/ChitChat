using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Conversations;
using WebChat.Api.Features.Groups;
using WebChat.Api.Infrastructure.Realtime;

namespace WebChat.Api.Features.Presence;

public sealed class PresenceService(AppDbContext db, TimeProvider clock, PrivateChatService privateChats, GroupService groups,
    IHubContext<ChatHub> hub, ILogger<PresenceService> logger)
{
    private static readonly ConcurrentDictionary<Guid, ConcurrentDictionary<string, byte>> Connections = new();
    private static readonly ConcurrentDictionary<(Guid UserId, Guid ConversationId), DateTime> LastTyping = new();
    private DateTime Now => clock.GetUtcNow().UtcDateTime;

    public async Task ConnectedAsync(Guid actor, string connectionId, CancellationToken ct)
    {
        var devices = Connections.GetOrAdd(actor, _ => new ConcurrentDictionary<string, byte>());
        var wasOffline = devices.IsEmpty;
        devices[connectionId] = 0;
        if (wasOffline) await BroadcastPresenceAsync(actor, ct);
    }

    public async Task DisconnectedAsync(Guid actor, string connectionId, CancellationToken ct)
    {
        if (!Connections.TryGetValue(actor, out var devices)) return;
        devices.TryRemove(connectionId, out _);
        if (!devices.IsEmpty) return;
        Connections.TryRemove(new KeyValuePair<Guid, ConcurrentDictionary<string, byte>>(actor, devices));
        if (Connections.TryGetValue(actor, out var current) && !current.IsEmpty) return;
        var user = await db.Users.FindAsync([actor], ct);
        if (user is not null) { user.LastSeenAt = Now; await db.SaveChangesAsync(ct); }
        await BroadcastPresenceAsync(actor, ct);
    }

    public async Task<PresenceDto?> GetAsync(Guid viewer, Guid target, CancellationToken ct)
    {
        if (!await db.Users.AnyAsync(u => u.Id == viewer && u.EmailVerifiedAt != null && u.DeactivatedAt == null, ct)
            || !await db.Users.AnyAsync(u => u.Id == target && u.EmailVerifiedAt != null && u.DeactivatedAt == null, ct)
            || await db.AccountSuspensions.AnyAsync(s => (s.UserId == viewer || s.UserId == target) && s.Status == "Active"
                && s.RevokedAt == null && (s.ExpiresAt == null || s.ExpiresAt > Now), ct)) return null;
        if (viewer != target)
        {
            if (await db.UserBlocks.AnyAsync(b => ((b.BlockerUserId == viewer && b.BlockedUserId == target)
                || (b.BlockerUserId == target && b.BlockedUserId == viewer)) && b.UnblockedAt == null, ct)) return null;
            var friendship = await db.Friendships.AnyAsync(f => ((f.UserId1 == viewer && f.UserId2 == target)
                || (f.UserId1 == target && f.UserId2 == viewer)) && f.RemovedAt == null, ct);
            var accepted = await db.PrivateChatAccess.AnyAsync(a => ((a.SenderUserId == viewer && a.ReceiverUserId == target)
                || (a.SenderUserId == target && a.ReceiverUserId == viewer)) && a.Status == "Accepted", ct);
            if (!friendship && !accepted) return null;
        }
        var privacy = await db.UserPrivacySettings.SingleOrDefaultAsync(p => p.UserId == target, ct);
        var online = Connections.TryGetValue(target, out var devices) && !devices.IsEmpty;
        var lastSeen = await db.Users.Where(u => u.Id == target).Select(u => u.LastSeenAt).SingleAsync(ct);
        return new PresenceDto(target, viewer == target || privacy?.ShowOnline == true ? online : null,
            viewer == target || privacy?.ShowLastSeen == true ? lastSeen : null);
    }

    public async Task<bool> TypingAsync(Guid actor, Guid sessionId, Guid conversationId, bool started, CancellationToken ct)
    {
        if (!await db.UserSessions.AnyAsync(s => s.Id == sessionId && s.UserId == actor && s.RevokedAt == null, ct)) return false;
        var type = await db.Conversations.Where(c => c.Id == conversationId).Select(c => c.Type).SingleOrDefaultAsync(ct);
        if (type == "Group" ? !await groups.CanSendAsync(actor, conversationId, ct)
            : type != "Private" || !await privateChats.CanSendMessageAsync(actor, conversationId, ct)) return false;
        var key = (actor, conversationId);
        if (started)
        {
            var previous = LastTyping.GetOrAdd(key, DateTime.MinValue);
            if (Now - previous < TimeSpan.FromSeconds(1)) return true;
            LastTyping[key] = Now;
        }
        else LastTyping.TryRemove(key, out _);
        var recipients = type == "Group"
            ? await db.ConversationMembers.Where(m => m.ConversationId == conversationId && m.UserId != actor && m.LeftAt == null).Select(m => m.UserId).ToListAsync(ct)
            : await db.PrivateConversationPairs.Where(p => p.ConversationId == conversationId)
                .Select(p => p.UserId1 == actor ? p.UserId2 : p.UserId1).ToListAsync(ct);
        foreach (var recipient in recipients)
        {
            if (await db.UserBlocks.AnyAsync(b => ((b.BlockerUserId == actor && b.BlockedUserId == recipient)
                || (b.BlockerUserId == recipient && b.BlockedUserId == actor)) && b.UnblockedAt == null, ct)) continue;
            if (type == "Group" ? !await groups.CanSendAsync(recipient, conversationId, ct)
                : !await privateChats.CanReadAsync(recipient, conversationId, ct) && !await privateChats.CanReadRequestAsync(recipient, conversationId, ct)) continue;
            try { await hub.Clients.User(recipient.ToString()).SendAsync("TypingChanged", new { eventId = Guid.NewGuid(), conversationId,
                actorId = actor, isTyping = started, expiresAt = started ? Now.AddSeconds(5) : Now }, ct); }
            catch (Exception error) { logger.LogWarning(error, "Typing event delivery failed for {RecipientId}", recipient); }
        }
        return true;
    }

    private async Task BroadcastPresenceAsync(Guid actor, CancellationToken ct)
    {
        var friends = await db.Friendships.Where(f => (f.UserId1 == actor || f.UserId2 == actor) && f.RemovedAt == null)
            .Select(f => f.UserId1 == actor ? f.UserId2 : f.UserId1).ToListAsync(ct);
        var accepted = await db.PrivateChatAccess.Where(a => (a.SenderUserId == actor || a.ReceiverUserId == actor) && a.Status == "Accepted")
            .Select(a => a.SenderUserId == actor ? a.ReceiverUserId : a.SenderUserId).ToListAsync(ct);
        foreach (var viewer in friends.Concat(accepted).Distinct())
        {
            var visible = await GetAsync(viewer, actor, ct);
            if (visible is null || (visible.Online is null && visible.LastSeenAt is null)) continue;
            try { await hub.Clients.User(viewer.ToString()).SendAsync("PresenceChanged", visible, ct); }
            catch (Exception error) { logger.LogWarning(error, "Presence event delivery failed for {RecipientId}", viewer); }
        }
    }
}
