using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Auth;

public sealed record TokenRequest([Required] string Token);
