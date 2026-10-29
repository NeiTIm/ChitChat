using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;

namespace WebChat.Api.Features.Friends;

public enum FriendActionResult { Created, Accepted, NotFound, Forbidden, Conflict }

public sealed class FriendService(AppDbContext db, TimeProvider clock, IFriendRepository repository) : IFriendService
{
    private DateTime Now => clock.GetUtcNow().UtcDateTime;
    private static (Guid First, Guid Second) Pair(Guid a, Guid b) => a.CompareTo(b) < 0 ? (a, b) : (b, a);

    public async Task<FriendActionResult> SendAsync(Guid actor, Guid target, CancellationToken ct)
    {
        for (var attempt = 0; attempt < 3; attempt++)
        {
            try { return await SendOnceAsync(actor, target, ct); }
            catch (Exception error) when (IsRetryable(error) && attempt < 2)
            {
                db.ChangeTracker.Clear();
                await Task.Delay(TimeSpan.FromMilliseconds(30 * (attempt + 1)), ct);
            }
        }
        throw new InvalidOperationException("Friend request retry limit reached.");
    }

    private static bool IsRetryable(Exception error)
    {
        for (Exception? current = error; current is not null; current = current.InnerException)
            if (current is SqlException sql && sql.Number is 1205 or 2601 or 2627) return true;
        return false;
    }

    private async Task<FriendActionResult> SendOnceAsync(Guid actor, Guid target, CancellationToken ct)
    {
        if (actor == target || target == Guid.Empty) return FriendActionResult.Forbidden;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await EligiblePairAsync(actor, target, ct)) return FriendActionResult.Forbidden;
        var (first, second) = Pair(actor, target);
        if (await db.Friendships.AnyAsync(f => f.UserId1 == first && f.UserId2 == second && f.RemovedAt == null, ct)) return FriendActionResult.Conflict;
        var pending = await db.FriendRequests.SingleOrDefaultAsync(r => r.PairUserId1 == first && r.PairUserId2 == second && r.Status == "Pending", ct);
        if (pending is not null)
        {
            if (pending.SenderUserId == actor) return FriendActionResult.Conflict;
            pending.Status = "Accepted";
            pending.RespondedAt = Now;
            db.Friendships.Add(new Friendship { Id = Guid.NewGuid(), UserId1 = first, UserId2 = second, CreatedAt = Now });
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return FriendActionResult.Accepted;
        }
        db.FriendRequests.Add(new FriendRequest { Id = Guid.NewGuid(), SenderUserId = actor, ReceiverUserId = target, PairUserId1 = first, PairUserId2 = second, Status = "Pending", CreatedAt = Now });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return FriendActionResult.Created;
    }

    public async Task<FriendActionResult> RespondAsync(Guid actor, Guid requestId, bool accept, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var request = await db.FriendRequests.SingleOrDefaultAsync(r => r.Id == requestId && r.ReceiverUserId == actor && r.Status == "Pending", ct);
        if (request is null) return FriendActionResult.NotFound;
        if (!await EligiblePairAsync(request.SenderUserId, actor, ct)) return FriendActionResult.Forbidden;
        request.Status = accept ? "Accepted" : "Rejected";
        request.RespondedAt = Now;
        if (accept)
        {
            if (!await db.Friendships.AnyAsync(f => f.UserId1 == request.PairUserId1 && f.UserId2 == request.PairUserId2 && f.RemovedAt == null, ct))
                db.Friendships.Add(new Friendship { Id = Guid.NewGuid(), UserId1 = request.PairUserId1, UserId2 = request.PairUserId2, CreatedAt = Now });
        }
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return accept ? FriendActionResult.Accepted : FriendActionResult.Created;
    }

    public async Task<bool> CancelAsync(Guid actor, Guid requestId, CancellationToken ct)
    {
        var request = await db.FriendRequests.SingleOrDefaultAsync(r => r.Id == requestId && r.SenderUserId == actor && r.Status == "Pending", ct);
        if (request is null) return false;
        request.Status = "Cancelled";
        request.RespondedAt = Now;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> UnfriendAsync(Guid actor, Guid target, CancellationToken ct)
    {
        var (first, second) = Pair(actor, target);
        var friendship = await db.Friendships.SingleOrDefaultAsync(f => f.UserId1 == first && f.UserId2 == second && f.RemovedAt == null, ct);
        if (friendship is null) return false;
        friendship.RemovedAt = Now;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> BlockAsync(Guid actor, Guid target, CancellationToken ct)
    {
        if (actor == target || target == Guid.Empty || !await db.Users.AnyAsync(u => u.Id == target, ct)) return false;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (await db.UserBlocks.AnyAsync(b => b.BlockerUserId == actor && b.BlockedUserId == target && b.UnblockedAt == null, ct)) return true;
        db.UserBlocks.Add(new UserBlock { Id = Guid.NewGuid(), BlockerUserId = actor, BlockedUserId = target, CreatedAt = Now });
        var (first, second) = Pair(actor, target);
        var friendship = await db.Friendships.SingleOrDefaultAsync(f => f.UserId1 == first && f.UserId2 == second && f.RemovedAt == null, ct);
        if (friendship is not null) friendship.RemovedAt = Now;
        var pending = await db.FriendRequests.Where(r => r.PairUserId1 == first && r.PairUserId2 == second && r.Status == "Pending").ToListAsync(ct);
        foreach (var request in pending) { request.Status = "Blocked"; request.RespondedAt = Now; }
        var accesses = await db.PrivateChatAccess.Where(a => (a.SenderUserId == actor && a.ReceiverUserId == target) || (a.SenderUserId == target && a.ReceiverUserId == actor)).ToListAsync(ct);
        foreach (var access in accesses) { access.Status = "Revoked"; access.RevokedAt = Now; access.UpdatedAt = Now; }
        var messageRequests = await db.MessageRequests.Where(r => ((r.SenderUserId == actor && r.ReceiverUserId == target) || (r.SenderUserId == target && r.ReceiverUserId == actor)) && r.Status == "Pending").ToListAsync(ct);
        foreach (var request in messageRequests) { request.Status = "Blocked"; request.RespondedAt = Now; }
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }

    public async Task<bool> UnblockAsync(Guid actor, Guid target, CancellationToken ct)
    {
        var block = await db.UserBlocks.SingleOrDefaultAsync(b => b.BlockerUserId == actor && b.BlockedUserId == target && b.UnblockedAt == null, ct);
        if (block is null) return false;
        block.UnblockedAt = Now;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public Task<List<FriendDto>> FriendsAsync(Guid actor, CancellationToken ct) => repository.ListFriendsAsync(actor, ct);

    public Task<List<BlockedUserDto>> BlocksAsync(Guid actor, CancellationToken ct) => repository.ListBlocksAsync(actor, ct);

    public async Task<FriendRequestsDto> RequestsAsync(Guid actor, CancellationToken ct)
    {
        var incoming = await db.FriendRequests.Where(r => r.ReceiverUserId == actor && r.Status == "Pending")
            .OrderByDescending(r => r.CreatedAt).ThenBy(r => r.Id)
            .Select(r => new FriendRequestDto(r.Id, r.SenderUserId, r.ReceiverUserId, r.Status, r.CreatedAt, r.RespondedAt)).ToListAsync(ct);
        var outgoing = await db.FriendRequests.Where(r => r.SenderUserId == actor && r.Status == "Pending")
            .OrderByDescending(r => r.CreatedAt).ThenBy(r => r.Id)
            .Select(r => new FriendRequestDto(r.Id, r.SenderUserId, r.ReceiverUserId, r.Status, r.CreatedAt, r.RespondedAt)).ToListAsync(ct);
        return new FriendRequestsDto(incoming, outgoing);
    }

    private async Task<bool> EligiblePairAsync(Guid a, Guid b, CancellationToken ct)
    {
        var users = await db.Users.CountAsync(u => (u.Id == a || u.Id == b) && u.EmailVerifiedAt != null && u.DeactivatedAt == null, ct);
        if (users != 2) return false;
        if (await db.AccountSuspensions.AnyAsync(s => (s.UserId == a || s.UserId == b) && s.Status == "Active" && s.RevokedAt == null && (s.ExpiresAt == null || s.ExpiresAt > Now), ct)) return false;
        return !await db.UserBlocks.AnyAsync(bk => ((bk.BlockerUserId == a && bk.BlockedUserId == b) || (bk.BlockerUserId == b && bk.BlockedUserId == a)) && bk.UnblockedAt == null, ct);
    }
}
