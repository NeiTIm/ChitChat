using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Friends;

public sealed record BlockedUserDto(Guid UserId, string Username, string DisplayName, DateTime BlockedAt);
