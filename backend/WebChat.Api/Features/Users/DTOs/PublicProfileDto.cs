using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Users;

public sealed record PublicProfileDto(Guid Id, string Username, string DisplayName, string? Bio, Guid? AvatarFileId);
