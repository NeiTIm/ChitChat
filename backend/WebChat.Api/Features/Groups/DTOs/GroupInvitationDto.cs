using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Groups;

public sealed record GroupInvitationDto(Guid Id, Guid ConversationId, Guid InviterUserId, Guid InviteeUserId, string GroupName, DateTime CreatedAt);
