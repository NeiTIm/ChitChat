using System.ComponentModel.DataAnnotations;
using WebChat.Api.Features.Files;

namespace WebChat.Api.Features.Conversations;

public sealed record SendMessageRequest([Required] Guid ClientMessageId, [MaxLength(10000)] string? Content, Guid? ReplyToMessageId = null,
    IReadOnlyList<Guid>? AttachmentIds = null);
