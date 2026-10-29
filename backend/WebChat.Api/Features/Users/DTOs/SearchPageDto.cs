using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Users;

public sealed record SearchPageDto(IReadOnlyList<PublicProfileDto> Items, string? NextCursor, bool HasMore);
