using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Auth;

namespace WebChat.Api.Features.Users;

public sealed class UserService(AppDbContext db, IAuthMailSender mail, TimeProvider clock)
{
    private DateTime Now => clock.GetUtcNow().UtcDateTime;

    public async Task<PrivateProfileDto?> GetMeAsync(Guid id, CancellationToken ct) =>
        await db.Users.Where(u => u.Id == id)
            .Select(u => new PrivateProfileDto(u.Id, u.Email, u.Username, u.DisplayName, u.Bio, u.AvatarFileId, u.SystemRole, u.CreatedAt, u.LastUsernameChangedAt))
            .SingleOrDefaultAsync(ct);

    public async Task<PublicProfileDto?> GetPublicAsync(Guid id, CancellationToken ct) =>
        await db.Users.Where(u => u.Id == id && u.EmailVerifiedAt != null && u.DeactivatedAt == null
            && !db.AccountSuspensions.Any(s => s.UserId == u.Id && s.Status == "Active" && s.RevokedAt == null && (s.ExpiresAt == null || s.ExpiresAt > Now)))
            .Select(u => new PublicProfileDto(u.Id, u.Username, u.DisplayName, u.Bio, u.AvatarFileId))
            .SingleOrDefaultAsync(ct);

    public async Task<PrivateProfileDto?> UpdateProfileAsync(Guid id, UpdateProfileRequest input, CancellationToken ct)
    {
        var user = await db.Users.FindAsync([id], ct);
        if (user is null || string.IsNullOrWhiteSpace(input.DisplayName)) return null;
        user.DisplayName = input.DisplayName.Trim();
        user.Bio = input.Bio?.Trim();
        await db.SaveChangesAsync(ct);
        return await GetMeAsync(id, ct);
    }

    public async Task<bool> ChangeUsernameAsync(Guid id, string value, CancellationToken ct)
    {
        var user = await db.Users.FindAsync([id], ct);
        var username = value.Trim();
        if (user is null || username.Length is < 3 or > 50 || user.LastUsernameChangedAt > Now.AddDays(-30)) return false;
        var normalized = username.ToUpperInvariant();
        if (await db.Users.AnyAsync(u => u.NormalizedUsername == normalized && u.Id != id, ct)) return false;
        user.Username = username;
        user.NormalizedUsername = normalized;
        user.LastUsernameChangedAt = Now;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> RequestEmailChangeAsync(Guid id, string value, CancellationToken ct)
    {
        var user = await db.Users.FindAsync([id], ct);
        var email = value.Trim();
        if (user is null || email.Length > 320 || await db.Users.AnyAsync(u => u.NormalizedEmail == email.ToUpper() && u.Id != id, ct)) return false;
        var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48)).Replace('+', '-').Replace('/', '_').TrimEnd('=');
        db.AuthTokens.Add(new AuthToken { Id = Guid.NewGuid(), UserId = id, Type = "EmailChange", TokenHash = Hash(raw), PendingEmail = email, ExpiresAt = Now.AddHours(24) });
        await db.SaveChangesAsync(ct);
        await mail.SendTokenAsync(email, raw, "email-change", ct);
        return true;
    }

    public async Task<bool> ConfirmEmailChangeAsync(string raw, Guid userId, CancellationToken ct)
    {
        var hash = Hash(raw);
        var token = await db.AuthTokens.SingleOrDefaultAsync(t => t.UserId == userId && t.TokenHash == hash && t.Type == "EmailChange", ct);
        if (token is null || token.UsedAt is not null || token.ExpiresAt <= Now || token.PendingEmail is null) return false;
        var email = token.PendingEmail;
        if (await db.Users.AnyAsync(u => u.NormalizedEmail == email.ToUpper() && u.Id != userId, ct)) return false;
        var claimed = await db.AuthTokens.Where(t => t.Id == token.Id && t.UsedAt == null && t.ExpiresAt > Now)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.UsedAt, Now), ct);
        if (claimed != 1) return false;
        var user = await db.Users.FindAsync([userId], ct);
        if (user is null) return false;
        user.Email = email;
        user.NormalizedEmail = email.ToUpperInvariant();
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<PrivacyDto?> GetPrivacyAsync(Guid userId, CancellationToken ct) =>
        await db.UserPrivacySettings.Where(p => p.UserId == userId)
            .Select(p => new PrivacyDto(p.ShowOnline, p.ShowLastSeen, p.AllowStrangerMessages, p.AllowGroupInvites)).SingleOrDefaultAsync(ct);

    public async Task<PrivacyDto?> UpdatePrivacyAsync(Guid userId, PrivacyDto input, CancellationToken ct)
    {
        var setting = await db.UserPrivacySettings.FindAsync([userId], ct);
        if (setting is null) return null;
        setting.ShowOnline = input.ShowOnline;
        setting.ShowLastSeen = input.ShowLastSeen;
        setting.AllowStrangerMessages = input.AllowStrangerMessages;
        setting.AllowGroupInvites = input.AllowGroupInvites;
        await db.SaveChangesAsync(ct);
        return input;
    }

    public async Task<SearchPageDto> SearchAsync(string query, string? cursor, int limit, CancellationToken ct)
    {
        var normalized = query.Trim().ToUpperInvariant();
        if (normalized.Length < 2) return new SearchPageDto([], null, false);
        var count = Math.Clamp(limit, 1, 30);
        var offset = int.TryParse(cursor, out var parsed) && parsed >= 0 ? Math.Min(parsed, 10000) : 0;
        var users = await db.Users.Where(u => u.EmailVerifiedAt != null && u.DeactivatedAt == null
                && (u.NormalizedUsername.Contains(normalized) || u.DisplayName.Contains(query.Trim()))
                && !db.AccountSuspensions.Any(s => s.UserId == u.Id && s.Status == "Active" && s.RevokedAt == null && (s.ExpiresAt == null || s.ExpiresAt > Now)))
            .OrderBy(u => u.NormalizedUsername).ThenBy(u => u.Id).Skip(offset).Take(count + 1)
            .Select(u => new PublicProfileDto(u.Id, u.Username, u.DisplayName, u.Bio, u.AvatarFileId)).ToListAsync(ct);
        return new SearchPageDto(users.Take(count).ToList(), users.Count > count ? (offset + count).ToString() : null, users.Count > count);
    }

    private static string Hash(string raw) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
}
