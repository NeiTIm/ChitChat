namespace WebChat.Api.Features.Friends;

public interface IFriendRepository
{
    Task<List<FriendDto>> ListFriendsAsync(Guid actor, CancellationToken ct);
    Task<List<BlockedUserDto>> ListBlocksAsync(Guid actor, CancellationToken ct);
}
