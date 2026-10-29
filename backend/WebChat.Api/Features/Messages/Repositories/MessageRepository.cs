using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;

namespace WebChat.Api.Features.Messages;

public sealed class MessageRepository(AppDbContext db) : IMessageRepository
{
    public Task<Message?> FindByIdAsync(Guid id, CancellationToken ct) =>
        db.Messages.SingleOrDefaultAsync(m => m.Id == id, ct);
}
