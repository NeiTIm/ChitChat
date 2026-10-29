using System.ComponentModel.DataAnnotations;
using WebChat.Api.Features.Files;

namespace WebChat.Api.Features.Conversations;

public sealed record MessageDto(Guid Id, Guid ConversationId, Guid SenderUserId, Guid ClientMessageId, long Sequence, string? Content, DateTime CreatedAt, bool Recalled,
    DateTime? EditedAt = null, bool IsForwarded = false, Guid? ReplyToMessageId = null, IReadOnlyList<AttachmentDto>? Attachments = null);
