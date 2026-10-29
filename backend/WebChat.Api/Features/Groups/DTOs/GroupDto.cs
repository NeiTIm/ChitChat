using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Groups;

public sealed record GroupDto(Guid Id, string Name, string? Description, string Status, Guid CreatedByUserId, long LastSequence, string? MyRole,
    Guid? AvatarFileId = null);
