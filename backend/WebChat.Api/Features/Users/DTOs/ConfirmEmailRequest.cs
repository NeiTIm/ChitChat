using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Users;

public sealed record ConfirmEmailRequest([Required] string Token);
