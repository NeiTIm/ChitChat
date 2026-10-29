namespace WebChat.Api.Shared.Entities;

public sealed class Conversation
{
    public Guid Id { get; set; }
    public string Type { get; set; } = "Private";
    public string Status { get; set; } = "Active";
    public long LastSequence { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public byte[] RowVersion { get; set; } = [];
}
