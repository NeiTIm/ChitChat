using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Groups;

public sealed record GroupMemberDto(Guid UserId, string Role, long JoinSequence, DateTime JoinedAt);
