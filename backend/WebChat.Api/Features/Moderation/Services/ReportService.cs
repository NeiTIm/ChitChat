using System.Data;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Groups;
using WebChat.Api.Features.Messages;

namespace WebChat.Api.Features.Moderation;

public sealed class ReportService(AppDbContext db, GroupService groups, MessageActionService messages, TimeProvider clock)
{
    private DateTime Now => clock.GetUtcNow().UtcDateTime;

    public async Task<ReportDto?> CreateAsync(Guid actor, CreateReportRequest input, CancellationToken ct)
    {
        var reason = input.Reason?.Trim();
        if (string.IsNullOrWhiteSpace(reason) || reason.Length > 1000 || input.TargetId == Guid.Empty) return null;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        Message? message = null;
        if (input.TargetType == "Message")
        {
            message = await db.Messages.SingleOrDefaultAsync(m => m.Id == input.TargetId && m.RecalledAt == null, ct);
            if (message is null || !await messages.CanViewAttachmentAsync(actor, message.Id, ct)) return null;
        }
        else if (input.TargetType == "Group")
        {
            if (!await groups.CanReadAsync(actor, input.TargetId, ct)) return null;
        }
        else if (input.TargetType == "User")
        {
            if (actor == input.TargetId || !await db.Users.AnyAsync(u => u.Id == input.TargetId && u.EmailVerifiedAt != null, ct)) return null;
        }
        else return null;
        var report = new Report { Id = Guid.NewGuid(), ReporterUserId = actor, TargetType = input.TargetType,
            TargetId = input.TargetId, Reason = reason, Status = "Pending", CreatedAt = Now };
        db.Reports.Add(report);
        if (message is not null)
        {
            db.ReportEvidences.Add(new ReportEvidence { Id = Guid.NewGuid(), ReportId = report.Id,
                SourceMessageId = message.Id, EvidenceContent = message.Content, CapturedAt = Now });
            var attachments = await db.MessageAttachments.Where(a => a.MessageId == message.Id).Select(a => a.StoredFileId).ToListAsync(ct);
            foreach (var fileId in attachments)
                db.ReportEvidences.Add(new ReportEvidence { Id = Guid.NewGuid(), ReportId = report.Id,
                    SourceMessageId = message.Id, StoredFileId = fileId, CapturedAt = Now });
        }
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Map(report);
    }

    public async Task<List<ReportDto>> MineAsync(Guid actor, CancellationToken ct) =>
        await db.Reports.Where(r => r.ReporterUserId == actor).OrderByDescending(r => r.CreatedAt)
            .Select(r => new ReportDto(r.Id, r.TargetType, r.TargetId, r.Reason, r.Status, r.CreatedAt, r.ReviewedAt)).ToListAsync(ct);

    private static ReportDto Map(Report report) => new(report.Id, report.TargetType, report.TargetId,
        report.Reason, report.Status, report.CreatedAt, report.ReviewedAt);
}
