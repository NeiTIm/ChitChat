using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Groups;

public sealed record CreateGroupRequest([Required, MinLength(1), MaxLength(100)] string Name, [MaxLength(500)] string? Description, IReadOnlyList<Guid>? InviteeUserIds);
