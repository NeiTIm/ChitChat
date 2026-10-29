using System.Data;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;

namespace WebChat.Api.Features.Groups;

public sealed class GroupInviteLinkService(AppDbContext db, GroupService groups, TimeProvider clock)
{
    private DateTime Now => clock.GetUtcNow().UtcDateTime;
    private static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public async Task<GroupLinkDto?> CreateAsync(Guid actor, Guid groupId, DateTime? expiresAt, CancellationToken ct)
    {
        if (expiresAt is not null && (expiresAt <= Now || expiresAt > Now.AddDays(30))) return null;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await groups.CanSendAsync(actor, groupId, ct)) return null;
        var member = await db.ConversationMembers.SingleAsync(m => m.ConversationId == groupId && m.UserId == actor && m.LeftAt == null, ct);
        var token = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        var link = new GroupInviteLink { Id = Guid.NewGuid(), ConversationId = groupId, CreatedByMembershipId = member.Id,
            TokenHash = Hash(token), CreatedAt = Now, ExpiresAt = expiresAt };
        db.GroupInviteLinks.Add(link);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return new GroupLinkDto(link.Id, actor, link.CreatedAt, expiresAt, token);
    }

    public async Task<List<GroupLinkDto>?> ListAsync(Guid actor, Guid groupId, CancellationToken ct)
    {
        if (!await groups.CanSendAsync(actor, groupId, ct)) return null;
        var member = await db.ConversationMembers.SingleAsync(m => m.ConversationId == groupId && m.UserId == actor && m.LeftAt == null, ct);
        var privileged = member.Role is "Owner" or "Admin";
        return await (from link in db.GroupInviteLinks
                      join creator in db.ConversationMembers on link.CreatedByMembershipId equals creator.Id
                      where link.ConversationId == groupId && link.RevokedAt == null && (privileged || creator.UserId == actor)
                      orderby link.CreatedAt descending
                      select new GroupLinkDto(link.Id, creator.UserId, link.CreatedAt, link.ExpiresAt)).ToListAsync(ct);
    }

    public async Task<bool> RevokeAsync(Guid actor, Guid groupId, Guid linkId, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await groups.CanSendAsync(actor, groupId, ct)) return false;
        var member = await db.ConversationMembers.SingleAsync(m => m.ConversationId == groupId && m.UserId == actor && m.LeftAt == null, ct);
        var link = await db.GroupInviteLinks.SingleOrDefaultAsync(l => l.Id == linkId && l.ConversationId == groupId && l.RevokedAt == null, ct);
        if (link is null) return false;
        var creatorId = await db.ConversationMembers.Where(m => m.Id == link.CreatedByMembershipId).Select(m => m.UserId).SingleAsync(ct);
        if (member.Role is not ("Owner" or "Admin") && creatorId != actor) return false;
        link.RevokedAt = Now;
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }

    public async Task<GroupLinkPreviewDto?> ResolveAsync(Guid actor, string token, CancellationToken ct)
    {
        if (!ValidToken(token)) return null;
        var hash = Hash(token);
        var preview = await (from link in db.GroupInviteLinks
                             join conversation in db.Conversations on link.ConversationId equals conversation.Id
                             join profile in db.GroupProfiles on conversation.Id equals profile.ConversationId
                             where link.TokenHash == hash && link.RevokedAt == null && (link.ExpiresAt == null || link.ExpiresAt > Now)
                                 && conversation.Status == "Active"
                             select new GroupLinkPreviewDto(conversation.Id, profile.Name, profile.Description)).SingleOrDefaultAsync(ct);
        return preview;
    }

    public async Task<Guid?> JoinAsync(Guid actor, string token, bool confirmed, CancellationToken ct)
    {
        if (!confirmed || !ValidToken(token)) return null;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var link = await db.GroupInviteLinks.SingleOrDefaultAsync(l => l.TokenHash == Hash(token) && l.RevokedAt == null
            && (l.ExpiresAt == null || l.ExpiresAt > Now), ct);
        if (link is null) return null;
        var conversation = await db.Conversations.SingleOrDefaultAsync(c => c.Id == link.ConversationId && c.Status == "Active" && c.Type == "Group", ct);
        var userActive = await db.Users.AnyAsync(u => u.Id == actor && u.EmailVerifiedAt != null && u.DeactivatedAt == null, ct)
            && !await db.AccountSuspensions.AnyAsync(s => s.UserId == actor && s.Status == "Active" && s.RevokedAt == null
                && (s.ExpiresAt == null || s.ExpiresAt > Now), ct);
        if (conversation is null || !userActive) return null;
        var creatorId = await db.ConversationMembers.Where(m => m.Id == link.CreatedByMembershipId).Select(m => m.UserId).SingleAsync(ct);
        if (await db.UserBlocks.AnyAsync(b => ((b.BlockerUserId == actor && b.BlockedUserId == creatorId)
            || (b.BlockerUserId == creatorId && b.BlockedUserId == actor)) && b.UnblockedAt == null, ct)) return null;
        if (await db.ConversationMembers.AnyAsync(m => m.ConversationId == conversation.Id && m.UserId == actor && m.LeftAt == null, ct)) return null;
        var lastRemoval = await db.ConversationMembers.Where(m => m.ConversationId == conversation.Id && m.UserId == actor && m.LeftReason == "Removed")
            .MaxAsync(m => (DateTime?)m.LeftAt, ct);
        if (lastRemoval is not null && link.CreatedAt <= lastRemoval) return null;
        if (await db.ConversationMembers.CountAsync(m => m.ConversationId == conversation.Id && m.LeftAt == null, ct) >= 100) return null;
        db.ConversationMembers.Add(new ConversationMember { Id = Guid.NewGuid(), ConversationId = conversation.Id,
            UserId = actor, Role = "Member", JoinSequence = conversation.LastSequence + 1, JoinedAt = Now });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return conversation.Id;
    }

    private static bool ValidToken(string? token) => !string.IsNullOrWhiteSpace(token) && token.Length is >= 40 and <= 128
        && token.All(character => char.IsAsciiLetterOrDigit(character) || character is '-' or '_');
}
