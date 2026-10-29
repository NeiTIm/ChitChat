using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Friends;

public sealed record FriendRequestsDto(IReadOnlyList<FriendRequestDto> Incoming, IReadOnlyList<FriendRequestDto> Outgoing);
