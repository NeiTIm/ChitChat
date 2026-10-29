using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Friends;

public sealed record BlockCreate([Required] Guid TargetUserId);
