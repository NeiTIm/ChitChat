using System.Data;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Files;

namespace WebChat.Api.Features.Groups;

public sealed class AdvancedGroupService(AppDbContext db, GroupService groups, TimeProvider clock)
{
    private DateTime Now => clock.GetUtcNow().UtcDateTime;

    public async Task<bool> UpdateProfileAsync(Guid actor, Guid groupId, UpdateGroupRequest input, CancellationToken ct)
    {
        var name = input.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name) || name.Length > 100 || input.Description?.Length > 500) return false;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await groups.CanSendAsync(actor, groupId, ct)) return false;
        var profile = await db.GroupProfiles.SingleOrDefaultAsync(p => p.ConversationId == groupId, ct);
        if (profile is null) return false;
        if (input.AvatarFileId is { } fileId && fileId != profile.AvatarFileId)
        {
            var file = await db.StoredFiles.SingleOrDefaultAsync(f => f.Id == fileId && f.UploadedByUserId == actor
                && f.Purpose == "Avatar" && f.Status == "Pending" && f.DeletedAt == null, ct);
            if (file is null) return false;
            file.Status = "Avatar";
            profile.AvatarFileId = fileId;
        }
        profile.Name = name;
        profile.Description = input.Description?.Trim();
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }

    public async Task<bool> ChangeRoleAsync(Guid actor, Guid groupId, Guid targetId, string role, CancellationToken ct)
    {
        if (role is not ("Admin" or "Member") || actor == targetId) return false;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await groups.CanSendAsync(actor, groupId, ct)) return false;
        var actorMember = await ActiveMember(actor, groupId, ct);
        var target = await ActiveMember(targetId, groupId, ct);
        if (actorMember is null || target is null || target.Role == "Owner") return false;
        if (role == "Admin" && target.Role == "Member" && actorMember.Role is "Owner" or "Admin") target.Role = role;
        else if (role == "Member" && target.Role == "Admin" && actorMember.Role == "Owner") target.Role = role;
        else return false;
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }

    public async Task<bool> RemoveAsync(Guid actor, Guid groupId, Guid targetId, CancellationToken ct)
    {
        if (actor == targetId) return false;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await groups.CanSendAsync(actor, groupId, ct)) return false;
        var actorMember = await ActiveMember(actor, groupId, ct);
        var target = await ActiveMember(targetId, groupId, ct);
        var conversation = await db.Conversations.SingleOrDefaultAsync(c => c.Id == groupId && c.Status == "Active", ct);
        if (actorMember is null || target is null || conversation is null || target.Role == "Owner"
            || (actorMember.Role != "Owner" && !(actorMember.Role == "Admin" && target.Role == "Member"))) return false;
        target.LeftAt = Now;
        target.LeaveSequence = conversation.LastSequence;
        target.LeftReason = "Removed";
        var links = await db.GroupInviteLinks.Where(l => l.CreatedByMembershipId == target.Id && l.RevokedAt == null).ToListAsync(ct);
        foreach (var link in links) link.RevokedAt = Now;
        var invitations = await db.GroupInvitations.Where(i => i.ConversationId == groupId && i.InviteeUserId == targetId && i.Status == "Pending").ToListAsync(ct);
        foreach (var invitation in invitations) { invitation.Status = "Revoked"; invitation.RespondedAt = Now; }
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }

    public async Task<bool> TransferOwnerAsync(Guid actor, Guid groupId, Guid targetId, CancellationToken ct)
    {
        if (actor == targetId) return false;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await groups.CanSendAsync(actor, groupId, ct)) return false;
        var owner = await ActiveMember(actor, groupId, ct);
        var target = await ActiveMember(targetId, groupId, ct);
        if (owner?.Role != "Owner" || target is null) return false;
        owner.Role = "Admin";
        target.Role = "Owner";
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }

    public async Task<bool> DissolveAsync(Guid actor, Guid groupId, bool confirmed, CancellationToken ct)
    {
        if (!confirmed) return false;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await groups.CanSendAsync(actor, groupId, ct)) return false;
        var member = await ActiveMember(actor, groupId, ct);
        var conversation = await db.Conversations.SingleOrDefaultAsync(c => c.Id == groupId && c.Type == "Group" && c.Status == "Active", ct);
        if (member?.Role != "Owner" || conversation is null) return false;
        conversation.Status = "Dissolved";
        conversation.UpdatedAt = Now;
        foreach (var link in await db.GroupInviteLinks.Where(l => l.ConversationId == groupId && l.RevokedAt == null).ToListAsync(ct)) link.RevokedAt = Now;
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }

    public async Task<List<GroupPinDto>?> PinsAsync(Guid actor, Guid groupId, CancellationToken ct)
    {
        if (!await groups.CanReadAsync(actor, groupId, ct)) return null;
        var pins = await db.GroupPins.Where(p => p.ConversationId == groupId)
            .Join(db.Messages, p => p.MessageId, m => m.Id, (p, m) => new { p, m })
            .Where(item => item.m.RecalledAt == null).OrderByDescending(item => item.p.PinnedAt).ToListAsync(ct);
        var result = new List<GroupPinDto>();
        foreach (var item in pins)
            if (await groups.CanViewMessageAsync(actor, groupId, item.m.Sequence, ct)
                && !await db.MessageUserStates.AnyAsync(s => s.MessageId == item.m.Id && s.UserId == actor, ct))
                result.Add(new GroupPinDto(item.m.Id, item.p.PinnedByUserId, item.p.PinnedAt));
        return result;
    }

    public async Task<bool> PinAsync(Guid actor, Guid groupId, Guid messageId, bool pin, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await groups.CanSendAsync(actor, groupId, ct)) return false;
        var message = await db.Messages.SingleOrDefaultAsync(m => m.Id == messageId && m.ConversationId == groupId && m.RecalledAt == null, ct);
        if (message is null || !await groups.CanViewMessageAsync(actor, groupId, message.Sequence, ct)) return false;
        var existing = await db.GroupPins.SingleOrDefaultAsync(p => p.ConversationId == groupId && p.MessageId == messageId, ct);
        if (pin && existing is null) db.GroupPins.Add(new GroupPin { Id = Guid.NewGuid(), ConversationId = groupId, MessageId = messageId,
            PinnedByUserId = actor, PinnedAt = Now });
        else if (!pin && existing is not null) db.GroupPins.Remove(existing);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }

    private Task<ConversationMember?> ActiveMember(Guid userId, Guid groupId, CancellationToken ct) =>
        db.ConversationMembers.SingleOrDefaultAsync(m => m.ConversationId == groupId && m.UserId == userId && m.LeftAt == null, ct);
}
