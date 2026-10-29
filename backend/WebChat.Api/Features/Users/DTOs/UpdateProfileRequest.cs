using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Users;

public sealed record UpdateProfileRequest([Required, MaxLength(100)] string DisplayName, [MaxLength(500)] string? Bio);
