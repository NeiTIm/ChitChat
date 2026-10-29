using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Friends;

public sealed record FriendDto(Guid UserId, string Username, string DisplayName, Guid? AvatarFileId, DateTime Since);
