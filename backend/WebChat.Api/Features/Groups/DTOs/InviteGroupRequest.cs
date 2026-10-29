using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Groups;

public sealed record InviteGroupRequest([Required] Guid InviteeUserId);
