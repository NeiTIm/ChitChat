using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Auth;

public sealed record ChangePasswordRequest([Required] string CurrentPassword, [Required, MinLength(12)] string NewPassword);
