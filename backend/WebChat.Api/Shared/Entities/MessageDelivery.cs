namespace WebChat.Api.Shared.Entities;

public sealed class MessageDelivery
{
    public Guid MessageId { get; set; }
    public Guid RecipientUserId { get; set; }
    public DateTime DeliveredAt { get; set; }
}
