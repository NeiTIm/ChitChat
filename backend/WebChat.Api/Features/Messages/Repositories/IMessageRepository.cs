using WebChat.Api.Shared.Entities;

namespace WebChat.Api.Features.Messages;

public interface IMessageRepository
{
    Task<Message?> FindByIdAsync(Guid id, CancellationToken ct);
}
