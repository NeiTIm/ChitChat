using WebChat.Api.Shared.Entities;

namespace WebChat.Api.Features.Auth;

public interface IUserRepository
{
    Task<bool> IdentityExistsAsync(string normalizedEmail, string normalizedUsername, CancellationToken ct);
    Task<User?> FindByIdAsync(Guid id, CancellationToken ct);
}
