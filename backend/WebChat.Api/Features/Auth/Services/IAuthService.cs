namespace WebChat.Api.Features.Auth;

public interface IAuthService
{
    Task<bool> RegisterAsync(RegisterRequest input, CancellationToken ct);
    Task<bool> VerifyEmailAsync(string rawToken, CancellationToken ct);
    Task ResendVerificationAsync(string email, CancellationToken ct);
    Task ForgotPasswordAsync(string email, CancellationToken ct);
    Task<bool> ResetPasswordAsync(ResetPasswordRequest input, CancellationToken ct);
    Task<(AccessResponse Access, string Refresh)?> LoginAsync(LoginRequest input, CancellationToken ct);
    Task<(AccessResponse Access, string Refresh)?> RefreshAsync(string rawToken, CancellationToken ct);
    Task<bool> LogoutAsync(Guid userId, Guid sessionId, CancellationToken ct);
    Task<int> LogoutOthersAsync(Guid userId, Guid currentSessionId, CancellationToken ct);
    Task<bool> RevokeSessionAsync(Guid userId, Guid sessionId, CancellationToken ct);
    Task<bool> ChangePasswordAsync(Guid userId, Guid currentSessionId, ChangePasswordRequest input, CancellationToken ct);
    Task<bool> ReactivateAsync(ReactivateRequest input, CancellationToken ct);
    Task<bool> DeactivateAsync(Guid userId, string password, CancellationToken ct);
    Task<List<SessionResponse>> SessionsAsync(Guid userId, Guid currentSessionId, CancellationToken ct);
    Task<bool> IsSuspendedAsync(Guid userId, CancellationToken ct);
}
