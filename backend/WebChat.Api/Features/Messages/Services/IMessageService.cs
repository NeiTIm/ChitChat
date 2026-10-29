using WebChat.Api.Features.Conversations;

namespace WebChat.Api.Features.Messages;

public interface IMessageService
{
    Task<MessageDto?> EditAsync(Guid actor, Guid messageId, EditMessageRequest input, CancellationToken ct);
    Task<List<EditVersionDto>?> EditHistoryAsync(Guid actor, Guid messageId, CancellationToken ct);
    Task<bool> RecallAsync(Guid actor, Guid messageId, CancellationToken ct);
    Task<bool> DeleteForMeAsync(Guid actor, Guid messageId, CancellationToken ct);
    Task<bool> SetReactionAsync(Guid actor, Guid messageId, string emoji, CancellationToken ct);
    Task<bool> RemoveReactionAsync(Guid actor, Guid messageId, CancellationToken ct);
    Task<MessageDto?> ForwardAsync(Guid actor, Guid sourceId, ForwardMessageRequest input, CancellationToken ct);
    Task<MessagePageDto?> SearchAsync(Guid actor, Guid conversationId, string query, long? beforeSequence, int limit, CancellationToken ct);
    Task<bool> CanViewAttachmentAsync(Guid actor, Guid messageId, CancellationToken ct);
}
