using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Auth;

public sealed record SessionResponse(Guid Id, string DeviceName, DateTime CreatedAt, DateTime LastActivityAt, bool IsCurrent);
