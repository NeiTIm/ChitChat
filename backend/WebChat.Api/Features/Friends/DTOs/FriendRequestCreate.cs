using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Friends;

public sealed record FriendRequestCreate([Required] Guid TargetUserId);
