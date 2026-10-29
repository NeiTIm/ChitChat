using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Auth;

public sealed record ResetPasswordRequest([Required] string Token, [Required, MinLength(12)] string NewPassword);
