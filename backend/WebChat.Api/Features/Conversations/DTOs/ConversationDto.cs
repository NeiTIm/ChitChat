using System.ComponentModel.DataAnnotations;
using WebChat.Api.Features.Files;

namespace WebChat.Api.Features.Conversations;

public sealed record ConversationDto(Guid Id, string Type, string Status, Guid OtherUserId, long LastSequence, DateTime UpdatedAt);
