using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Auth;

public sealed record EmailRequest([Required, EmailAddress] string Email);
