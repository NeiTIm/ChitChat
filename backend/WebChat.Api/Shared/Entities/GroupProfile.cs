namespace WebChat.Api.Shared.Entities;

public sealed class GroupProfile
{
    public Guid ConversationId { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public Guid? AvatarFileId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public byte[] RowVersion { get; set; } = [];
}
