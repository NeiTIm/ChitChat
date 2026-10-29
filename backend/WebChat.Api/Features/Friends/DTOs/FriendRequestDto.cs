using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Friends;

public sealed record FriendRequestDto(Guid Id, Guid SenderUserId, Guid ReceiverUserId, string Status, DateTime CreatedAt, DateTime? RespondedAt);
