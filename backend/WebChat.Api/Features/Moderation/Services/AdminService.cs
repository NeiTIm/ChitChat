using System.Data;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Files;

namespace WebChat.Api.Features.Moderation;

public sealed class AdminService(AppDbContext db, TimeProvider clock, IFileStorage storage)
{
    private DateTime Now => clock.GetUtcNow().UtcDateTime;
    public Task<bool> IsAdminAsync(Guid actor, CancellationToken ct) =>
        db.Users.AnyAsync(u => u.Id == actor && u.SystemRole == "Admin" && u.DeactivatedAt == null, ct);

    public async Task<AdminDashboardDto?> DashboardAsync(Guid actor, CancellationToken ct)
    {
        if (!await IsAdminAsync(actor, ct)) return null;
        var start = Now.Date.AddDays(-6);
        var newUsers = await db.Users.Where(u => u.CreatedAt >= start)
            .GroupBy(u => u.CreatedAt.Date).Select(g => new { Date = g.Key, Count = g.Count() }).ToListAsync(ct);
        var newMessages = await db.Messages.Where(m => m.CreatedAt >= start)
            .GroupBy(m => m.CreatedAt.Date).Select(g => new { Date = g.Key, Count = g.Count() }).ToListAsync(ct);
        var activity = Enumerable.Range(0, 7).Select(offset => start.AddDays(offset))
            .Select(date => new AdminActivityDto(date, newUsers.FirstOrDefault(u => u.Date == date)?.Count ?? 0,
                newMessages.FirstOrDefault(m => m.Date == date)?.Count ?? 0)).ToList();
        return new AdminDashboardDto(await db.Users.CountAsync(ct), await db.Messages.CountAsync(ct),
            await db.Conversations.CountAsync(c => c.Type == "Group", ct), await db.Reports.CountAsync(r => r.Status == "Pending", ct), activity);
    }

    public async Task<List<AdminUserDto>?> UsersAsync(Guid actor, CancellationToken ct)
    {
        if (!await IsAdminAsync(actor, ct)) return null;
        return await db.Users.OrderByDescending(u => u.CreatedAt).Take(100)
            .Select(u => new AdminUserDto(u.Id, u.Email, u.Username, u.SystemRole,
                db.AccountSuspensions.Any(s => s.UserId == u.Id && s.Status == "Active" && s.RevokedAt == null
                    && (s.ExpiresAt == null || s.ExpiresAt > Now)), u.CreatedAt)).ToListAsync(ct);
    }

    public async Task<List<AdminReportDto>?> ReportsAsync(Guid actor, CancellationToken ct)
    {
        if (!await IsAdminAsync(actor, ct)) return null;
        return await db.Reports.OrderByDescending(r => r.CreatedAt).Take(100)
            .Select(r => new AdminReportDto(r.Id, r.ReporterUserId, r.TargetType, r.TargetId, r.Reason,
                r.Status, r.CreatedAt, r.ReviewedByAdminId, r.ReviewedAt)).ToListAsync(ct);
    }

    public async Task<bool> ClaimAsync(Guid actor, Guid reportId, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await IsAdminAsync(actor, ct)) return false;
        var report = await db.Reports.SingleOrDefaultAsync(r => r.Id == reportId && r.Status == "Pending", ct);
        if (report is null || (report.ReviewedByAdminId is not null && report.ReviewedByAdminId != actor)) return false;
        if (report.ReviewedByAdminId is null)
        {
            report.ReviewedByAdminId = actor;
            Audit(actor, "ClaimReport", "Report", reportId, null);
            await db.SaveChangesAsync(ct);
        }
        await tx.CommitAsync(ct);
        return true;
    }

    public async Task<AdminCaseDto?> CaseAsync(Guid actor, Guid reportId, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await IsAdminAsync(actor, ct)) return null;
        var report = await db.Reports.SingleOrDefaultAsync(r => r.Id == reportId && r.ReviewedByAdminId == actor, ct);
        if (report is null) return null;
        var evidence = await db.ReportEvidences.Where(e => e.ReportId == reportId)
            .Select(e => new AdminEvidenceDto(e.Id, e.SourceMessageId, e.EvidenceContent, e.StoredFileId,
                e.CapturedAt, e.RetainUntil, e.LegalHold)).ToListAsync(ct);
        Audit(actor, "ReadReportEvidence", "Report", reportId, null);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return new AdminCaseDto(Map(report), evidence);
    }

    public async Task<FileRead?> EvidenceFileAsync(Guid actor, Guid reportId, Guid evidenceId, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await IsAdminAsync(actor, ct) || !await db.Reports.AnyAsync(r => r.Id == reportId && r.ReviewedByAdminId == actor, ct)) return null;
        var file = await (from evidence in db.ReportEvidences
                          join stored in db.StoredFiles on evidence.StoredFileId equals stored.Id
                          where evidence.Id == evidenceId && evidence.ReportId == reportId && stored.DeletedAt == null
                          select stored).SingleOrDefaultAsync(ct);
        if (file is null) return null;
        Stream content;
        try { content = storage.OpenRead(file.StorageKey); }
        catch (FileNotFoundException) { return null; }
        Audit(actor, "ReadReportEvidenceFile", "Report", reportId, evidenceId.ToString());
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return new FileRead(content, file.ContentType, file.OriginalFileName);
    }

    public async Task<bool> ResolveAsync(Guid actor, Guid reportId, string status, string note, CancellationToken ct)
    {
        if (status is not ("Resolved" or "Dismissed") || string.IsNullOrWhiteSpace(note) || note.Length > 1000) return false;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await IsAdminAsync(actor, ct)) return false;
        var report = await db.Reports.SingleOrDefaultAsync(r => r.Id == reportId && r.ReviewedByAdminId == actor && r.Status == "Pending", ct);
        if (report is null) return false;
        report.Status = status;
        report.ReviewedAt = Now;
        foreach (var evidence in await db.ReportEvidences.Where(e => e.ReportId == reportId).ToListAsync(ct))
            evidence.RetainUntil = Now.AddDays(90);
        Audit(actor, "ResolveReport", "Report", reportId, note.Trim());
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }

    public async Task<bool> WarnAsync(Guid actor, Guid targetId, string reason, CancellationToken ct)
    {
        if (!ValidReason(reason)) return false;
        if (!await IsAdminAsync(actor, ct) || actor == targetId || !await db.Users.AnyAsync(u => u.Id == targetId, ct)) return false;
        db.Notifications.Add(new Notification { Id = Guid.NewGuid(), RecipientUserId = targetId, ActorUserId = actor,
            Type = "AdminWarning", CreatedAt = Now });
        Audit(actor, "WarnUser", "User", targetId, reason.Trim());
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> SuspendAsync(Guid actor, Guid targetId, string reason, CancellationToken ct)
    {
        if (!ValidReason(reason) || actor == targetId) return false;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await IsAdminAsync(actor, ct)) return false;
        var target = await db.Users.SingleOrDefaultAsync(u => u.Id == targetId && u.SystemRole != "Admin", ct);
        if (target is null || await db.AccountSuspensions.AnyAsync(s => s.UserId == targetId && s.Status == "Active" && s.RevokedAt == null, ct)) return false;
        db.AccountSuspensions.Add(new AccountSuspension { Id = Guid.NewGuid(), UserId = targetId, AdminId = actor,
            Reason = reason.Trim(), Status = "Active", StartedAt = Now });
        await db.UserSessions.Where(s => s.UserId == targetId && s.RevokedAt == null)
            .ExecuteUpdateAsync(update => update.SetProperty(s => s.RevokedAt, Now), ct);
        Audit(actor, "SuspendUser", "User", targetId, reason.Trim());
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }

    public async Task<bool> UnsuspendAsync(Guid actor, Guid targetId, string reason, CancellationToken ct)
    {
        if (!ValidReason(reason)) return false;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await IsAdminAsync(actor, ct)) return false;
        var suspension = await db.AccountSuspensions.Where(s => s.UserId == targetId && s.Status == "Active" && s.RevokedAt == null)
            .OrderByDescending(s => s.StartedAt).FirstOrDefaultAsync(ct);
        if (suspension is null) return false;
        suspension.RevokedAt = Now;
        suspension.Status = "Revoked";
        Audit(actor, "UnsuspendUser", "User", targetId, reason.Trim());
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }

    public async Task<bool> DisableGroupAsync(Guid actor, Guid groupId, string reason, CancellationToken ct)
    {
        if (!ValidReason(reason)) return false;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await IsAdminAsync(actor, ct)) return false;
        var group = await db.Conversations.SingleOrDefaultAsync(c => c.Id == groupId && c.Type == "Group" && c.Status == "Active", ct);
        if (group is null) return false;
        group.Status = "Disabled";
        group.UpdatedAt = Now;
        Audit(actor, "DisableGroup", "Group", groupId, reason.Trim());
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }

    public async Task<List<AppealDto>?> AppealsAsync(Guid actor, CancellationToken ct)
    {
        if (!await IsAdminAsync(actor, ct)) return null;
        return await db.AccountAppeals.OrderByDescending(a => a.CreatedAt).Take(100)
            .Select(a => new AppealDto(a.Id, a.SuspensionId, a.Reason, a.Status, a.CreatedAt, a.ReviewedAt, a.ReviewNote)).ToListAsync(ct);
    }

    public async Task<bool> ReviewAppealAsync(Guid actor, Guid appealId, string status, string note, CancellationToken ct)
    {
        if (status is not ("Accepted" or "Rejected") || !ValidReason(note)) return false;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await IsAdminAsync(actor, ct)) return false;
        var appeal = await db.AccountAppeals.SingleOrDefaultAsync(a => a.Id == appealId && a.Status == "Pending", ct);
        if (appeal is null) return false;
        appeal.Status = status;
        appeal.ReviewedByAdminId = actor;
        appeal.ReviewedAt = Now;
        appeal.ReviewNote = note.Trim();
        Audit(actor, "ReviewAppeal", "Appeal", appealId, status + ": " + note.Trim());
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }

    public async Task<List<AdminAuditLog>?> AuditAsync(Guid actor, CancellationToken ct) =>
        await IsAdminAsync(actor, ct) ? await db.AdminAuditLogs.OrderByDescending(a => a.CreatedAt).Take(100).ToListAsync(ct) : null;

    private void Audit(Guid actor, string action, string targetType, Guid? targetId, string? details) =>
        db.AdminAuditLogs.Add(new AdminAuditLog { Id = Guid.NewGuid(), AdminUserId = actor, Action = action,
            TargetType = targetType, TargetId = targetId, Details = details, CreatedAt = Now });
    private static bool ValidReason(string? reason) => !string.IsNullOrWhiteSpace(reason) && reason.Length <= 1000;
    private static AdminReportDto Map(Report r) => new(r.Id, r.ReporterUserId, r.TargetType, r.TargetId, r.Reason,
        r.Status, r.CreatedAt, r.ReviewedByAdminId, r.ReviewedAt);
}
