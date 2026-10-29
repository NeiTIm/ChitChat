using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Auth;

public sealed record RegisterRequest([Required, EmailAddress] string Email, [Required, MinLength(3), MaxLength(50)] string Username, [Required, MinLength(12)] string Password);
