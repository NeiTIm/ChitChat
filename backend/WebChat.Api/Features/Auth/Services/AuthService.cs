using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;

namespace WebChat.Api.Features.Auth;

public sealed class AuthService(AppDbContext db, IConfiguration configuration, IAuthMailSender mail, TimeProvider clock, IUserRepository users) : IAuthService
{
    private readonly PasswordHasher<User> _hasher = new();
    private DateTime Now => clock.GetUtcNow().UtcDateTime;

    public async Task<bool> RegisterAsync(RegisterRequest input, CancellationToken ct)
    {
        var email = input.Email.Trim().ToUpperInvariant();
        var username = input.Username.Trim().ToUpperInvariant();
        if (email.Length > 320 || username.Length > 50 || username.Length < 3 || input.Password.Length < 12) return false;
        if (await users.IdentityExistsAsync(email, username, ct)) return true;
        var user = new User { Id = Guid.NewGuid(), Email = input.Email.Trim(), NormalizedEmail = email, Username = input.Username.Trim(), NormalizedUsername = username, DisplayName = input.Username.Trim(), CreatedAt = Now };
        user.PasswordHash = _hasher.HashPassword(user, input.Password);
        db.Users.Add(user);
        db.UserPrivacySettings.Add(new UserPrivacySetting { UserId = user.Id });
        var token = NewToken();
        db.AuthTokens.Add(new AuthToken { Id = Guid.NewGuid(), UserId = user.Id, Type = "EmailVerification", TokenHash = Hash(token), ExpiresAt = Now.AddHours(24) });
        await db.SaveChangesAsync(ct);
        await mail.SendTokenAsync(user.Email, token, "verify-email", ct);
        return true;
    }

    public async Task<bool> VerifyEmailAsync(string rawToken, CancellationToken ct)
    {
        var hash = Hash(rawToken);
        var authToken = await db.AuthTokens.SingleOrDefaultAsync(t => t.TokenHash == hash && t.Type == "EmailVerification", ct);
        if (authToken is null || authToken.UsedAt is not null || authToken.ExpiresAt <= Now) return false;
        var used = await db.AuthTokens.Where(t => t.Id == authToken.Id && t.UsedAt == null && t.ExpiresAt > Now)
            .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.UsedAt, Now), ct);
        if (used != 1) return false;
        var user = await db.Users.FindAsync([authToken.UserId], ct);
        if (user is null) return false;
        user.EmailVerifiedAt = Now;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task ResendVerificationAsync(string email, CancellationToken ct)
    {
        var normalized = email.Trim().ToUpperInvariant();
        var user = await db.Users.SingleOrDefaultAsync(u => u.NormalizedEmail == normalized, ct);
        if (user is null || user.EmailVerifiedAt is not null) return;
        var token = NewToken();
        db.AuthTokens.Add(new AuthToken { Id = Guid.NewGuid(), UserId = user.Id, Type = "EmailVerification", TokenHash = Hash(token), ExpiresAt = Now.AddHours(24) });
        await db.SaveChangesAsync(ct);
        await mail.SendTokenAsync(user.Email, token, "verify-email", ct);
    }

    public async Task ForgotPasswordAsync(string email, CancellationToken ct)
    {
        var normalized = email.Trim().ToUpperInvariant();
        var user = await db.Users.SingleOrDefaultAsync(u => u.NormalizedEmail == normalized, ct);
        if (user is null || user.EmailVerifiedAt is null) return;
        var token = NewToken();
        db.AuthTokens.Add(new AuthToken { Id = Guid.NewGuid(), UserId = user.Id, Type = "PasswordReset", TokenHash = Hash(token), ExpiresAt = Now.AddHours(1) });
        await db.SaveChangesAsync(ct);
        await mail.SendTokenAsync(user.Email, token, "reset-password", ct);
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordRequest input, CancellationToken ct)
    {
        var hash = Hash(input.Token);
        var token = await db.AuthTokens.SingleOrDefaultAsync(t => t.TokenHash == hash && t.Type == "PasswordReset", ct);
        if (token is null || token.UsedAt is not null || token.ExpiresAt <= Now) return false;
        var claimed = await db.AuthTokens.Where(t => t.Id == token.Id && t.UsedAt == null && t.ExpiresAt > Now)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.UsedAt, Now), ct);
        if (claimed != 1) return false;
        var user = await db.Users.FindAsync([token.UserId], ct);
        if (user is null) return false;
        user.PasswordHash = _hasher.HashPassword(user, input.NewPassword);
        user.FailedLoginCount = 0;
        user.LockoutUntil = null;
        await db.UserSessions.Where(s => s.UserId == user.Id && s.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.RevokedAt, Now), ct);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<(AccessResponse Access, string Refresh)?> LoginAsync(LoginRequest input, CancellationToken ct)
    {
        var normalized = input.Identifier.Trim().ToUpperInvariant();
        var user = await db.Users.SingleOrDefaultAsync(u => u.NormalizedEmail == normalized || u.NormalizedUsername == normalized, ct);
        if (user is null) { _hasher.VerifyHashedPassword(new User(), _hasher.HashPassword(new User(), "invalid-password-placeholder"), input.Password); return null; }
        if (user.LockoutUntil > Now) return null;
        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, input.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount >= 5) { user.FailedLoginCount = 0; user.LockoutUntil = Now.AddMinutes(15); }
            await db.SaveChangesAsync(ct);
            return null;
        }
        if (user.EmailVerifiedAt is null || user.DeactivatedAt is not null || await IsSuspendedAsync(user.Id, ct)) return null;
        user.FailedLoginCount = 0;
        user.LockoutUntil = null;
        if (result == PasswordVerificationResult.SuccessRehashNeeded) user.PasswordHash = _hasher.HashPassword(user, input.Password);
        var session = new UserSession { Id = Guid.NewGuid(), UserId = user.Id, DeviceName = (input.DeviceName ?? "Browser")[..Math.Min((input.DeviceName ?? "Browser").Length, 100)], CreatedAt = Now, LastActivityAt = Now };
        var refresh = NewToken();
        db.UserSessions.Add(session);
        db.RefreshTokens.Add(new RefreshToken { Id = Guid.NewGuid(), SessionId = session.Id, TokenHash = Hash(refresh), ExpiresAt = Now.AddDays(30) });
        await db.SaveChangesAsync(ct);
        return (IssueAccess(user, session.Id), refresh);
    }

    public async Task<(AccessResponse Access, string Refresh)?> RefreshAsync(string rawToken, CancellationToken ct)
    {
        var hash = Hash(rawToken);
        var old = await db.RefreshTokens.SingleOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (old is null) return null;
        var session = await db.UserSessions.FindAsync([old.SessionId], ct);
        if (session is null || session.RevokedAt is not null) return null;
        if (old.RevokedAt is not null || old.ExpiresAt <= Now)
        {
            session.RevokedAt = Now;
            await db.SaveChangesAsync(ct);
            return null;
        }
        var user = await db.Users.FindAsync([session.UserId], ct);
        if (user is null || user.EmailVerifiedAt is null || user.DeactivatedAt is not null || await IsSuspendedAsync(user.Id, ct)) return null;
        var claimed = await db.RefreshTokens.Where(t => t.Id == old.Id && t.RevokedAt == null && t.ExpiresAt > Now)
            .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.RevokedAt, Now), ct);
        if (claimed != 1) { session.RevokedAt = Now; await db.SaveChangesAsync(ct); return null; }
        var refresh = NewToken();
        var replacement = new RefreshToken { Id = Guid.NewGuid(), SessionId = session.Id, TokenHash = Hash(refresh), ExpiresAt = Now.AddDays(30) };
        db.RefreshTokens.Add(replacement);
        old.ReplacedByTokenId = replacement.Id;
        session.LastActivityAt = Now;
        await db.SaveChangesAsync(ct);
        return (IssueAccess(user, session.Id), refresh);
    }

    public async Task<bool> LogoutAsync(Guid userId, Guid sessionId, CancellationToken ct)
    {
        return await db.UserSessions.Where(s => s.Id == sessionId && s.UserId == userId && s.RevokedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(s => s.RevokedAt, Now), ct) == 1;
    }

    public async Task<int> LogoutOthersAsync(Guid userId, Guid currentSessionId, CancellationToken ct) =>
        await db.UserSessions.Where(s => s.UserId == userId && s.Id != currentSessionId && s.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.RevokedAt, Now), ct);

    public async Task<bool> RevokeSessionAsync(Guid userId, Guid sessionId, CancellationToken ct) =>
        await db.UserSessions.Where(s => s.UserId == userId && s.Id == sessionId && s.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.RevokedAt, Now), ct) == 1;

    public async Task<bool> ChangePasswordAsync(Guid userId, Guid currentSessionId, ChangePasswordRequest input, CancellationToken ct)
    {
        var user = await db.Users.FindAsync([userId], ct);
        if (user is null || _hasher.VerifyHashedPassword(user, user.PasswordHash, input.CurrentPassword) == PasswordVerificationResult.Failed) return false;
        user.PasswordHash = _hasher.HashPassword(user, input.NewPassword);
        await db.UserSessions.Where(s => s.UserId == userId && s.Id != currentSessionId && s.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.RevokedAt, Now), ct);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> ReactivateAsync(ReactivateRequest input, CancellationToken ct)
    {
        var normalized = input.Identifier.Trim().ToUpperInvariant();
        var user = await db.Users.SingleOrDefaultAsync(u => u.NormalizedEmail == normalized || u.NormalizedUsername == normalized, ct);
        if (user is null || user.EmailVerifiedAt is null || user.DeactivatedAt is null || await IsSuspendedAsync(user.Id, ct)
            || _hasher.VerifyHashedPassword(user, user.PasswordHash, input.Password) == PasswordVerificationResult.Failed) return false;
        user.DeactivatedAt = null;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> DeactivateAsync(Guid userId, string password, CancellationToken ct)
    {
        var user = await db.Users.FindAsync([userId], ct);
        if (user is null || _hasher.VerifyHashedPassword(user, user.PasswordHash, password) == PasswordVerificationResult.Failed) return false;
        user.DeactivatedAt = Now;
        await db.UserSessions.Where(s => s.UserId == userId && s.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.RevokedAt, Now), ct);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<List<SessionResponse>> SessionsAsync(Guid userId, Guid currentSessionId, CancellationToken ct)
    {
        return await db.UserSessions.Where(s => s.UserId == userId && s.RevokedAt == null)
            .OrderByDescending(s => s.CreatedAt).Select(s => new SessionResponse(s.Id, s.DeviceName, s.CreatedAt, s.LastActivityAt, s.Id == currentSessionId)).ToListAsync(ct);
    }

    public async Task<bool> IsSuspendedAsync(Guid userId, CancellationToken ct) =>
        await db.AccountSuspensions.AnyAsync(s => s.UserId == userId && s.Status == "Active" && s.RevokedAt == null && (s.ExpiresAt == null || s.ExpiresAt > Now), ct);

    private AccessResponse IssueAccess(User user, Guid sessionId)
    {
        var key = configuration["Jwt:Key"];
        if (string.IsNullOrEmpty(key) || Encoding.UTF8.GetByteCount(key) < 32) throw new InvalidOperationException("JWT signing key must be configured in local secret storage.");
        var expires = Now.AddMinutes(15);
        var claims = new[] { new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()), new Claim("sid", sessionId.ToString()), new Claim(ClaimTypes.Role, user.SystemRole) };
        var jwt = new JwtSecurityToken("WebChat.Api", "WebChat.Frontend", claims, expires: expires,
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256));
        return new AccessResponse(new JwtSecurityTokenHandler().WriteToken(jwt), expires, user.Id, user.Username);
    }

    private static string NewToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(48)).Replace('+', '-').Replace('/', '_').TrimEnd('=');
    private static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
