using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Conversations;
using WebChat.Api.Features.Groups;
using WebChat.Api.Features.Messages;

namespace WebChat.Api.Features.Notifications;

public sealed class NotificationService(AppDbContext db, PrivateChatService privateChats, GroupService groups,
    MessageActionService actions, TimeProvider clock)
{
    private DateTime Now => clock.GetUtcNow().UtcDateTime;

    public async Task<NotificationPageDto> ListAsync(Guid actor, DateTime? before, int limit, CancellationToken ct)
    {
        var count = Math.Clamp(limit, 1, 50);
        var rows = await db.Notifications.Where(n => n.RecipientUserId == actor && (before == null || n.CreatedAt < before))
            .OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.Id).Take(200).ToListAsync(ct);
        var visible = new List<NotificationDto>();
        foreach (var row in rows)
        {
            if (await VisibleAsync(actor, row, ct)) visible.Add(new NotificationDto(row.Id, row.Type, row.ReferenceId, row.CreatedAt, row.ReadAt));
            if (visible.Count > count) break;
        }
        return new NotificationPageDto(visible.Take(count).ToList(), visible.Count > count ? visible[count - 1].CreatedAt : null, visible.Count > count);
    }

    public async Task<NotificationCountDto> UnreadAsync(Guid actor, CancellationToken ct)
    {
        var rows = await db.Notifications.Where(n => n.RecipientUserId == actor && n.ReadAt == null).ToListAsync(ct);
        var count = 0;
        foreach (var row in rows) if (await VisibleAsync(actor, row, ct)) count++;
        return new NotificationCountDto(count);
    }

    public async Task<bool> MarkReadAsync(Guid actor, Guid id, CancellationToken ct)
    {
        var row = await db.Notifications.SingleOrDefaultAsync(n => n.Id == id && n.RecipientUserId == actor, ct);
        if (row is null || !await VisibleAsync(actor, row, ct)) return false;
        row.ReadAt ??= Now;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task MarkAllReadAsync(Guid actor, CancellationToken ct) =>
        await db.Notifications.Where(n => n.RecipientUserId == actor && n.ReadAt == null)
            .ExecuteUpdateAsync(update => update.SetProperty(n => n.ReadAt, Now), ct);

    public async Task<ConversationSettingsDto?> SettingsAsync(Guid actor, Guid conversationId, CancellationToken ct)
    {
        if (!await CanSetAsync(actor, conversationId, ct)) return null;
        var muted = await db.ConversationUserStates.Where(s => s.ConversationId == conversationId && s.UserId == actor)
            .Select(s => s.MutedUntil).SingleOrDefaultAsync(ct);
        return new ConversationSettingsDto(muted);
    }

    public async Task<bool> SetMuteAsync(Guid actor, Guid conversationId, DateTime? mutedUntil, CancellationToken ct)
    {
        if (mutedUntil is not null && (mutedUntil <= Now || mutedUntil > Now.AddYears(1))) return false;
        if (!await CanSetAsync(actor, conversationId, ct)) return false;
        var state = await db.ConversationUserStates.SingleOrDefaultAsync(s => s.ConversationId == conversationId && s.UserId == actor, ct);
        if (state is null) { state = new ConversationUserState { ConversationId = conversationId, UserId = actor }; db.ConversationUserStates.Add(state); }
        state.MutedUntil = mutedUntil;
        await db.SaveChangesAsync(ct);
        return true;
    }

    private async Task<bool> CanSetAsync(Guid actor, Guid conversationId, CancellationToken ct)
    {
        var type = await db.Conversations.Where(c => c.Id == conversationId).Select(c => c.Type).SingleOrDefaultAsync(ct);
        return type == "Group" ? await groups.CanSendAsync(actor, conversationId, ct)
            : type == "Private" && await privateChats.CanReadAsync(actor, conversationId, ct);
    }

    private async Task<bool> VisibleAsync(Guid actor, Notification notification, CancellationToken ct)
    {
        if (notification.ReferenceId is not { } messageId) return true;
        if (notification.Type is "Message" or "GroupMessage" or "MessageRequest")
            return await actions.CanViewAttachmentAsync(actor, messageId, ct);
        return true;
    }
}
