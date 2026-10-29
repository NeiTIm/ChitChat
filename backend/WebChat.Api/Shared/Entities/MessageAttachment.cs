namespace WebChat.Api.Shared.Entities;

public sealed class MessageAttachment
{
    public Guid Id { get; set; }
    public Guid MessageId { get; set; }
    public Guid StoredFileId { get; set; }
    public int DisplayOrder { get; set; }
}
