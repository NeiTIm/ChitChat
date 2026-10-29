namespace WebChat.Api.Shared.Entities;

public sealed class UserBlock
{
    public Guid Id { get; set; }
    public Guid BlockerUserId { get; set; }
    public Guid BlockedUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UnblockedAt { get; set; }
}
