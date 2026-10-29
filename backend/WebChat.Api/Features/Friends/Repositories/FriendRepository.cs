using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;

namespace WebChat.Api.Features.Friends;

public sealed class FriendRepository(AppDbContext db) : IFriendRepository
{
    public Task<List<FriendDto>> ListFriendsAsync(Guid actor, CancellationToken ct) =>
        (from friendship in db.Friendships
         join user in db.Users on (friendship.UserId1 == actor ? friendship.UserId2 : friendship.UserId1) equals user.Id
         where friendship.RemovedAt == null && (friendship.UserId1 == actor || friendship.UserId2 == actor)
         orderby user.NormalizedUsername, user.Id
         select new FriendDto(user.Id, user.Username, user.DisplayName, user.AvatarFileId, friendship.CreatedAt)).ToListAsync(ct);

    public Task<List<BlockedUserDto>> ListBlocksAsync(Guid actor, CancellationToken ct) =>
        (from block in db.UserBlocks
         join user in db.Users on block.BlockedUserId equals user.Id
         where block.BlockerUserId == actor && block.UnblockedAt == null
         orderby block.CreatedAt descending, user.Id
         select new BlockedUserDto(user.Id, user.Username, user.DisplayName, block.CreatedAt)).ToListAsync(ct);
}
