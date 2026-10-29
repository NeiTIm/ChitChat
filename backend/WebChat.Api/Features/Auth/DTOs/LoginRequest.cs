using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Auth;

public sealed record LoginRequest([Required] string Identifier, [Required] string Password, string? DeviceName);
