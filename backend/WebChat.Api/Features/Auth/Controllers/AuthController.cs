using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace WebChat.Api.Features.Auth;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
public sealed class AuthController(
    IAuthService auth,
    IHostEnvironment environment,
    IConfiguration configuration) : ControllerBase
{
    private const string RefreshCookieName = "webchat_refresh";
    private const string LegacyCsrfCookieName = "webchat_csrf";

    [HttpPost("register")]
    public async Task<IActionResult> Register(
        RegisterRequest request,
        CancellationToken ct)
    {
        if (!await auth.RegisterAsync(request, ct))
            return Conflict(new { code = "REGISTRATION_UNAVAILABLE" });

        return StatusCode(
            201,
            new GenericResponse(
                "Check your email for the verification link."));
    }

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail(
        TokenRequest request,
        CancellationToken ct) =>
        await auth.VerifyEmailAsync(request.Token, ct)
            ? NoContent()
            : BadRequest(new { code = "INVALID_TOKEN" });

    [HttpPost("resend-verification")]
    public async Task<IActionResult> ResendVerification(
        EmailRequest request,
        CancellationToken ct)
    {
        await auth.ResendVerificationAsync(request.Email, ct);

        return Ok(new GenericResponse(
            "If the address needs verification, an email was sent."));
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(
        EmailRequest request,
        CancellationToken ct)
    {
        await auth.ForgotPasswordAsync(request.Email, ct);

        return Ok(new GenericResponse(
            "If the account exists, password reset instructions were sent."));
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(
        ResetPasswordRequest request,
        CancellationToken ct) =>
        await auth.ResetPasswordAsync(request, ct)
            ? NoContent()
            : BadRequest(new { code = "INVALID_TOKEN" });

    [HttpPost("reactivate")]
    public async Task<IActionResult> Reactivate(
        ReactivateRequest request,
        CancellationToken ct) =>
        await auth.ReactivateAsync(request, ct)
            ? NoContent()
            : Unauthorized(new
            {
                code = "INVALID_CREDENTIALS_OR_ACCOUNT_STATE"
            });

    [HttpPost("login")]
    public async Task<IActionResult> Login(
        LoginRequest request,
        CancellationToken ct)
    {
        if (!AllowedBrowserOrigin())
            return StatusCode(403, new { code = "INVALID_ORIGIN" });

        var result = await auth.LoginAsync(request, ct);

        if (result is null)
            return Unauthorized(new
            {
                code = "INVALID_CREDENTIALS_OR_ACCOUNT_STATE"
            });

        SetRefreshCookie(result.Value.Refresh);

        return Ok(result.Value.Access);
    }

    // Frontend gọi endpoint này khi cần khôi phục phiên
    // hoặc chuẩn bị refresh/logout.
    [HttpGet("csrf")]
    public IActionResult GetCsrf()
    {
        Response.Headers.CacheControl = "no-store";
        Response.Headers.Pragma = "no-cache";

        if (!AllowedBrowserOrigin())
            return StatusCode(403, new { code = "INVALID_ORIGIN" });

        if (!TryGetRefreshCookie(out var refresh))
            return Unauthorized(new { code = "INVALID_REFRESH" });

        return Ok(new
        {
            csrfToken = CreateCsrfToken(refresh)
        });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store";

        if (!AllowedBrowserOrigin() ||
            !TryGetRefreshCookie(out var refresh) ||
            !ValidCsrf(refresh))
        {
            return Unauthorized(new { code = "INVALID_REFRESH" });
        }

        var result = await auth.RefreshAsync(refresh, ct);

        if (result is null)
        {
            ClearRefreshCookies();

            return Unauthorized(new { code = "INVALID_REFRESH" });
        }

        // Refresh rotation: cookie mới => CSRF mới.
        SetRefreshCookie(result.Value.Refresh);

        return Ok(result.Value.Access);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        if (!AllowedBrowserOrigin() ||
            !TryGetRefreshCookie(out var refresh) ||
            !ValidCsrf(refresh))
        {
            return StatusCode(403, new { code = "INVALID_CSRF" });
        }

        var (userId, sessionId) = Actor();

        await auth.LogoutAsync(userId, sessionId, ct);

        ClearRefreshCookies();

        return NoContent();
    }

    [Authorize]
    [HttpPost("logout-others")]
    public async Task<IActionResult> LogoutOthers(CancellationToken ct)
    {
        var (userId, sessionId) = Actor();

        await auth.LogoutOthersAsync(userId, sessionId, ct);

        return NoContent();
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(
        ChangePasswordRequest request,
        CancellationToken ct)
    {
        var (userId, sessionId) = Actor();

        return await auth.ChangePasswordAsync(
            userId, sessionId, request, ct)
                ? NoContent()
                : BadRequest(new
                {
                    code = "INVALID_CURRENT_PASSWORD"
                });
    }

    [Authorize]
    [HttpPost("deactivate")]
    public async Task<IActionResult> Deactivate(
        DeactivateRequest request,
        CancellationToken ct)
    {
        var (userId, _) = Actor();

        return await auth.DeactivateAsync(
            userId, request.Password, ct)
                ? NoContent()
                : BadRequest(new
                {
                    code = "INVALID_CURRENT_PASSWORD"
                });
    }

    [Authorize]
    [HttpGet("sessions")]
    public async Task<IActionResult> Sessions(CancellationToken ct)
    {
        var (userId, sessionId) = Actor();

        return Ok(await auth.SessionsAsync(
            userId, sessionId, ct));
    }

    [Authorize]
    [HttpDelete("sessions/{id:guid}")]
    public async Task<IActionResult> RevokeSession(
        Guid id,
        CancellationToken ct)
    {
        var (userId, _) = Actor();

        return await auth.RevokeSessionAsync(userId, id, ct)
            ? NoContent()
            : NotFound();
    }

    private (Guid UserId, Guid SessionId) Actor() =>
        (
            Guid.Parse(
                User.FindFirstValue(
                    ClaimTypes.NameIdentifier)!),
            Guid.Parse(
                User.FindFirstValue("sid")!)
        );

    private bool TryGetRefreshCookie(out string refresh)
    {
        refresh = "";

        if (!Request.Cookies.TryGetValue(
                RefreshCookieName, out var value) ||
            string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        refresh = value;
        return true;
    }

    private string CreateCsrfToken(string refresh)
    {
        var secret = configuration["Jwt:Key"];

        if (string.IsNullOrWhiteSpace(secret) ||
            Encoding.UTF8.GetByteCount(secret) < 32)
        {
            throw new InvalidOperationException(
                "JWT signing key is not configured.");
        }

        // Domain separation để không tái sử dụng trực tiếp
        // JWT signing operation cho mục đích CSRF.
        var message = Encoding.UTF8.GetBytes(
            "webchat-csrf-v1:" + refresh);

        var mac = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(secret),
            message);

        return Convert.ToHexString(mac);
    }

    private bool ValidCsrf(string refresh)
    {
        if (!Request.Headers.TryGetValue(
                "X-CSRF-Token", out var submitted))
        {
            return false;
        }

        var submittedText = submitted.ToString();

        if (submittedText.Length != 64)
            return false;

        byte[] submittedBytes;

        try
        {
            submittedBytes = Convert.FromHexString(
                submittedText);
        }
        catch (FormatException)
        {
            return false;
        }

        var expectedBytes = Convert.FromHexString(
            CreateCsrfToken(refresh));

        return CryptographicOperations.FixedTimeEquals(
            submittedBytes,
            expectedBytes);
    }

    private bool AllowedBrowserOrigin()
    {
        var origin = Request.Headers.Origin.ToString();

        // Postman / non-browser clients:
        // vẫn phải cung cấp CSRF hợp lệ cho refresh/logout.
        if (string.IsNullOrEmpty(origin))
            return true;

        var allowedOrigins =
            configuration.GetSection("Cors:AllowedOrigins")
                .Get<string[]>()
            ?? new[]
            {
                "http://localhost:5174",
                "http://127.0.0.1:5174",
                "https://chit-chat-khaki-pi.vercel.app"
            };

        return allowedOrigins.Any(
            allowed => string.Equals(
                origin,
                allowed.TrimEnd('/'),
                StringComparison.OrdinalIgnoreCase));
    }

    private CookieOptions RefreshCookieOptions() =>
        new()
        {
            HttpOnly = true,
            Secure = !environment.IsDevelopment(),
            SameSite = environment.IsDevelopment()
                ? SameSiteMode.Strict
                : SameSiteMode.None,
            Expires = DateTimeOffset.UtcNow.AddDays(30),
            Path = "/api/auth",
            IsEssential = true
        };

    private void SetRefreshCookie(string refresh)
    {
        Response.Cookies.Append(
            RefreshCookieName,
            refresh,
            RefreshCookieOptions());

        // Dọn cookie CSRF cũ, vì Frontend không còn
        // đọc document.cookie để lấy token.
        Response.Cookies.Delete(
            LegacyCsrfCookieName,
            new CookieOptions { Path = "/" });
    }

    private void ClearRefreshCookies()
    {
        var options = RefreshCookieOptions();
        options.Expires = null;

        Response.Cookies.Delete(
            RefreshCookieName,
            options);

        Response.Cookies.Delete(
            LegacyCsrfCookieName,
            new CookieOptions { Path = "/" });
    }
}