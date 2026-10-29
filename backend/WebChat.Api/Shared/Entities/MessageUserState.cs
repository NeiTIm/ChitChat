namespace WebChat.Api.Shared.Entities;

public sealed class MessageUserState
{
    public Guid MessageId { get; set; }
    public Guid UserId { get; set; }
    public DateTime DeletedAt { get; set; }
}
