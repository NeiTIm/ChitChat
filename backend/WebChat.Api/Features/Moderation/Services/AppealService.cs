using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;

namespace WebChat.Api.Features.Moderation;

public sealed class AppealService(AppDbContext db, IConfiguration configuration, TimeProvider clock)
{
    private readonly PasswordHasher<User> hasher = new();
    private DateTime Now => clock.GetUtcNow().UtcDateTime;

    public async Task<AppealAccessDto?> AuthenticateAsync(AppealLoginRequest input, CancellationToken ct)
    {
        var identifier = input.Identifier?.Trim().ToUpperInvariant();
        if (string.IsNullOrEmpty(identifier) || string.IsNullOrEmpty(input.Password)) return null;
        var user = await db.Users.SingleOrDefaultAsync(u => u.NormalizedEmail == identifier || u.NormalizedUsername == identifier, ct);
        if (user?.EmailVerifiedAt is null || user.DeactivatedAt is not null || user.LockoutUntil > Now
            || hasher.VerifyHashedPassword(user, user.PasswordHash, input.Password) == PasswordVerificationResult.Failed
            || !await ActiveSuspensionAsync(user.Id, ct)) return null;
        var key = configuration["Jwt:Key"];
        if (string.IsNullOrEmpty(key) || Encoding.UTF8.GetByteCount(key) < 32) throw new InvalidOperationException("JWT key unavailable.");
        var expires = Now.AddMinutes(10);
        var claims = new[] { new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()), new Claim("scope", "appeal") };
        var jwt = new JwtSecurityToken("WebChat.Api", "WebChat.Frontend", claims, expires: expires,
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256));
        return new AppealAccessDto(new JwtSecurityTokenHandler().WriteToken(jwt), expires);
    }

    public async Task<AppealDto?> CreateAsync(Guid actor, string reason, CancellationToken ct)
    {
        reason = reason?.Trim() ?? "";
        if (reason.Length is < 10 or > 1000) return null;
        var suspension = await db.AccountSuspensions.Where(s => s.UserId == actor && s.Status == "Active" && s.RevokedAt == null
            && (s.ExpiresAt == null || s.ExpiresAt > Now)).OrderByDescending(s => s.StartedAt).FirstOrDefaultAsync(ct);
        if (suspension is null || await db.AccountAppeals.AnyAsync(a => a.SuspensionId == suspension.Id && a.Status == "Pending", ct)) return null;
        var appeal = new AccountAppeal { Id = Guid.NewGuid(), SuspensionId = suspension.Id, UserId = actor,
            Reason = reason, Status = "Pending", CreatedAt = Now };
        db.AccountAppeals.Add(appeal);
        await db.SaveChangesAsync(ct);
        return Map(appeal);
    }

    public async Task<List<AppealDto>> MineAsync(Guid actor, CancellationToken ct) =>
        await db.AccountAppeals.Where(a => a.UserId == actor).OrderByDescending(a => a.CreatedAt)
            .Select(a => new AppealDto(a.Id, a.SuspensionId, a.Reason, a.Status, a.CreatedAt, a.ReviewedAt, a.ReviewNote)).ToListAsync(ct);

    private Task<bool> ActiveSuspensionAsync(Guid actor, CancellationToken ct) =>
        db.AccountSuspensions.AnyAsync(s => s.UserId == actor && s.Status == "Active" && s.RevokedAt == null
            && (s.ExpiresAt == null || s.ExpiresAt > Now), ct);
    private static AppealDto Map(AccountAppeal a) => new(a.Id, a.SuspensionId, a.Reason, a.Status, a.CreatedAt, a.ReviewedAt, a.ReviewNote);
}
