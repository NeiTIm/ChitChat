using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Users;

public sealed record PrivateProfileDto(Guid Id, string Email, string Username, string DisplayName, string? Bio, Guid? AvatarFileId, string SystemRole, DateTime CreatedAt, DateTime? LastUsernameChangedAt);
