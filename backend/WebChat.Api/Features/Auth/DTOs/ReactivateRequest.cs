using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Auth;

public sealed record ReactivateRequest([Required] string Identifier, [Required] string Password);
