namespace WebChat.Api.Features.Friends;

public interface IFriendService
{
    Task<FriendActionResult> SendAsync(Guid actor, Guid target, CancellationToken ct);
    Task<FriendActionResult> RespondAsync(Guid actor, Guid requestId, bool accept, CancellationToken ct);
    Task<bool> CancelAsync(Guid actor, Guid requestId, CancellationToken ct);
    Task<bool> UnfriendAsync(Guid actor, Guid target, CancellationToken ct);
    Task<bool> BlockAsync(Guid actor, Guid target, CancellationToken ct);
    Task<bool> UnblockAsync(Guid actor, Guid target, CancellationToken ct);
    Task<List<FriendDto>> FriendsAsync(Guid actor, CancellationToken ct);
    Task<List<BlockedUserDto>> BlocksAsync(Guid actor, CancellationToken ct);
    Task<FriendRequestsDto> RequestsAsync(Guid actor, CancellationToken ct);
}
