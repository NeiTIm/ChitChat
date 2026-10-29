using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Users;

public sealed record ChangeUsernameRequest([Required, MinLength(3), MaxLength(50)] string NewUsername);
