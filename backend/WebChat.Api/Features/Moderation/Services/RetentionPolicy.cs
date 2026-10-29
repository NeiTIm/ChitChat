using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;

namespace WebChat.Api.Features.Moderation;

public static class RetentionPolicy
{
    public static bool EvidenceEligible(ReportEvidence evidence, DateTime now) =>
        !evidence.LegalHold && evidence.RetainUntil is { } until && until <= now;

    public static bool AuditEligible(AdminAuditLog audit, DateTime now) =>
        !audit.LegalHold && audit.CreatedAt.AddMonths(12) <= now;
}

public sealed class RetentionService(AppDbContext db, AdminService admin, TimeProvider clock)
{
    public async Task<RetentionPreviewDto?> PreviewAsync(Guid actor, CancellationToken ct)
    {
        if (!await admin.IsAdminAsync(actor, ct)) return null;
        var now = clock.GetUtcNow().UtcDateTime;
        var evidence = await db.ReportEvidences.ToListAsync(ct);
        var audit = await db.AdminAuditLogs.ToListAsync(ct);
        return new RetentionPreviewDto(evidence.Count(item => RetentionPolicy.EvidenceEligible(item, now)),
            audit.Count(item => RetentionPolicy.AuditEligible(item, now)), evidence.Count(item => item.LegalHold),
            audit.Count(item => item.LegalHold));
    }
}
