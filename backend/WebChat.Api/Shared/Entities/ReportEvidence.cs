namespace WebChat.Api.Shared.Entities;

public sealed class ReportEvidence
{
    public Guid Id { get; set; }
    public Guid ReportId { get; set; }
    public Guid? SourceMessageId { get; set; }
    public string? EvidenceContent { get; set; }
    public Guid? StoredFileId { get; set; }
    public DateTime CapturedAt { get; set; }
    public DateTime? RetainUntil { get; set; }
    public bool LegalHold { get; set; }
}
