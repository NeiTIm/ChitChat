namespace WebChat.Api.Shared.Entities;

public sealed class GroupPin
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public Guid MessageId { get; set; }
    public Guid PinnedByUserId { get; set; }
    public DateTime PinnedAt { get; set; }
}
