using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Auth;

public sealed record DeactivateRequest([Required] string Password);
