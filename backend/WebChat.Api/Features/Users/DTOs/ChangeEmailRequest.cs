using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Users;

public sealed record ChangeEmailRequest([Required, EmailAddress] string NewEmail);
