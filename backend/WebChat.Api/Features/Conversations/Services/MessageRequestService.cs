using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;

namespace WebChat.Api.Features.Conversations;

public sealed class MessageRequestService(AppDbContext db, TimeProvider clock, PrivateChatService chats)
{
    private DateTime Now => clock.GetUtcNow().UtcDateTime;

    public async Task<List<MessageRequestDto>> InboxAsync(Guid actor, CancellationToken ct)
    {
        var rows = await (from request in db.MessageRequests
                          join conversation in db.Conversations on request.ConversationId equals conversation.Id
                          where request.ReceiverUserId == actor && request.Status == "Pending"
                          orderby conversation.UpdatedAt descending, request.Id
                          select new { Request = request, conversation.LastSequence }).ToListAsync(ct);
        var result = new List<MessageRequestDto>();
        foreach (var row in rows)
        {
            if (!await chats.CanReadRequestAsync(actor, row.Request.ConversationId, ct)) continue;
            var cursor = await db.ConversationUserStates.Where(s => s.ConversationId == row.Request.ConversationId && s.UserId == actor)
                .Select(s => s.RequestReadSequence).SingleOrDefaultAsync(ct);
            result.Add(new MessageRequestDto(row.Request.Id, row.Request.ConversationId, row.Request.SenderUserId, actor,
                row.Request.Status, row.LastSequence, cursor, row.Request.CreatedAt));
        }
        return result;
    }

    public async Task<int> UnreadCountAsync(Guid actor, CancellationToken ct) =>
        (await InboxAsync(actor, ct)).Count(r => r.LastSequence > r.RequestReadSequence);

    public async Task<bool> RespondAsync(Guid actor, Guid requestId, bool accept, CancellationToken ct)
    {
        for (var attempt = 0; attempt < 3; attempt++)
        {
            try { return await RespondOnceAsync(actor, requestId, accept, ct); }
            catch (Exception error) when (Retryable(error) && attempt < 2)
            {
                db.ChangeTracker.Clear();
                await Task.Delay(30 * (attempt + 1), ct);
            }
        }
        return false;
    }

    private async Task<bool> RespondOnceAsync(Guid actor, Guid requestId, bool accept, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var request = await db.MessageRequests.SingleOrDefaultAsync(r => r.Id == requestId && r.ReceiverUserId == actor && r.Status == "Pending", ct);
        if (request is null || !await chats.CanReadRequestAsync(actor, request.ConversationId, ct)) return false;
        request.Status = accept ? "Accepted" : "Rejected";
        request.RespondedAt = Now;
        var access = await db.PrivateChatAccess.SingleOrDefaultAsync(a => a.ConversationId == request.ConversationId && a.SenderUserId == request.SenderUserId && a.ReceiverUserId == actor, ct);
        if (access is null)
        {
            access = new PrivateChatAccess { ConversationId = request.ConversationId, SenderUserId = request.SenderUserId, ReceiverUserId = actor };
            db.PrivateChatAccess.Add(access);
        }
        access.Status = accept ? "Accepted" : "Rejected";
        access.AcceptedAt = accept ? Now : null;
        access.RejectedAt = accept ? null : Now;
        access.UpdatedAt = Now;
        if (accept)
        {
            var reverse = await db.PrivateChatAccess.SingleOrDefaultAsync(a => a.ConversationId == request.ConversationId && a.SenderUserId == actor && a.ReceiverUserId == request.SenderUserId, ct);
            if (reverse is null)
            {
                reverse = new PrivateChatAccess { ConversationId = request.ConversationId, SenderUserId = actor, ReceiverUserId = request.SenderUserId };
                db.PrivateChatAccess.Add(reverse);
            }
            reverse.Status = "Accepted";
            reverse.AcceptedAt = Now;
            reverse.RejectedAt = null;
            reverse.UpdatedAt = Now;
        }
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }

    public async Task<bool> MarkReadAsync(Guid actor, Guid requestId, long sequence, CancellationToken ct)
    {
        if (sequence < 0) return false;
        for (var attempt = 0; attempt < 3; attempt++)
        {
            try { return await MarkReadOnceAsync(actor, requestId, sequence, ct); }
            catch (Exception error) when (Retryable(error) && attempt < 2)
            {
                db.ChangeTracker.Clear();
                await Task.Delay(30 * (attempt + 1), ct);
            }
        }
        return false;
    }

    private async Task<bool> MarkReadOnceAsync(Guid actor, Guid requestId, long sequence, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var request = await db.MessageRequests.SingleOrDefaultAsync(r => r.Id == requestId && r.ReceiverUserId == actor && r.Status == "Pending", ct);
        if (request is null || !await chats.CanReadRequestAsync(actor, request.ConversationId, ct)) return false;
        var max = await db.Conversations.Where(c => c.Id == request.ConversationId).Select(c => c.LastSequence).SingleAsync(ct);
        if (sequence > max) return false;
        var state = await db.ConversationUserStates.SingleOrDefaultAsync(s => s.ConversationId == request.ConversationId && s.UserId == actor, ct);
        if (state is null)
        {
            state = new ConversationUserState { ConversationId = request.ConversationId, UserId = actor };
            db.ConversationUserStates.Add(state);
        }
        if (sequence > state.RequestReadSequence) { state.RequestReadSequence = sequence; state.RequestReadAt = Now; }
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }

    private static bool Retryable(Exception error)
    {
        for (Exception? current = error; current is not null; current = current.InnerException)
            if (current is SqlException sql && sql.Number is 1205 or 2601 or 2627) return true;
        return false;
    }
}
