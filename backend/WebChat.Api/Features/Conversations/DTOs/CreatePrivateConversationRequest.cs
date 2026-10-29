using System.ComponentModel.DataAnnotations;
using WebChat.Api.Features.Files;

namespace WebChat.Api.Features.Conversations;

public sealed record CreatePrivateConversationRequest([Required] Guid TargetUserId);
