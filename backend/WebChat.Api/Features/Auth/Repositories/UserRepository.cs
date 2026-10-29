using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;

namespace WebChat.Api.Features.Auth;

public sealed class UserRepository(AppDbContext db) : IUserRepository
{
    public Task<bool> IdentityExistsAsync(string normalizedEmail, string normalizedUsername, CancellationToken ct) =>
        db.Users.AnyAsync(u => u.NormalizedEmail == normalizedEmail || u.NormalizedUsername == normalizedUsername, ct);

    public async Task<User?> FindByIdAsync(Guid id, CancellationToken ct) =>
        await db.Users.FindAsync([id], ct);
}
