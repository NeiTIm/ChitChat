using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebChat.Api.Features.Moderation;

[ApiController]
[Authorize]
[Route("api/admin")]
public sealed class AdminController(AdminService admin, RetentionService retention) : ControllerBase
{
    private Guid Actor => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard(CancellationToken ct) =>
        await admin.DashboardAsync(Actor, ct) is { } value ? Ok(value) : Forbid();

    [HttpGet("users")]
    public async Task<IActionResult> Users(CancellationToken ct) =>
        await admin.UsersAsync(Actor, ct) is { } value ? Ok(value) : Forbid();

    [HttpGet("reports")]
    public async Task<IActionResult> Reports(CancellationToken ct) =>
        await admin.ReportsAsync(Actor, ct) is { } value ? Ok(value) : Forbid();

    [HttpPost("reports/{id:guid}/claim")]
    public async Task<IActionResult> Claim(Guid id, CancellationToken ct) =>
        await admin.ClaimAsync(Actor, id, ct) ? NoContent() : NotFound();

    [HttpGet("reports/{id:guid}")]
    public async Task<IActionResult> Case(Guid id, CancellationToken ct) =>
        await admin.CaseAsync(Actor, id, ct) is { } value ? Ok(value) : NotFound();

    [HttpGet("reports/{id:guid}/evidence/{evidenceId:guid}/file")]
    public async Task<IActionResult> EvidenceFile(Guid id, Guid evidenceId, CancellationToken ct) =>
        await admin.EvidenceFileAsync(Actor, id, evidenceId, ct) is { } value
            ? File(value.Content, value.ContentType, value.FileName, enableRangeProcessing: true) : NotFound();

    [HttpPost("reports/{id:guid}/resolve")]
    public async Task<IActionResult> Resolve(Guid id, ResolveReportRequest input, CancellationToken ct) =>
        await admin.ResolveAsync(Actor, id, input.Status, input.Note, ct) ? NoContent() : NotFound();

    [HttpPost("users/{id:guid}/warn")]
    public async Task<IActionResult> Warn(Guid id, AdminReasonRequest input, CancellationToken ct) =>
        await admin.WarnAsync(Actor, id, input.Reason, ct) ? NoContent() : NotFound();

    [HttpPost("users/{id:guid}/suspend")]
    public async Task<IActionResult> Suspend(Guid id, AdminReasonRequest input, CancellationToken ct) =>
        await admin.SuspendAsync(Actor, id, input.Reason, ct) ? NoContent() : NotFound();

    [HttpPost("users/{id:guid}/unsuspend")]
    public async Task<IActionResult> Unsuspend(Guid id, AdminReasonRequest input, CancellationToken ct) =>
        await admin.UnsuspendAsync(Actor, id, input.Reason, ct) ? NoContent() : NotFound();

    [HttpPost("groups/{id:guid}/disable")]
    public async Task<IActionResult> DisableGroup(Guid id, AdminReasonRequest input, CancellationToken ct) =>
        await admin.DisableGroupAsync(Actor, id, input.Reason, ct) ? NoContent() : NotFound();

    [HttpGet("appeals")]
    public async Task<IActionResult> Appeals(CancellationToken ct) =>
        await admin.AppealsAsync(Actor, ct) is { } value ? Ok(value) : Forbid();

    [HttpPost("appeals/{id:guid}/review")]
    public async Task<IActionResult> ReviewAppeal(Guid id, ReviewAppealRequest input, CancellationToken ct) =>
        await admin.ReviewAppealAsync(Actor, id, input.Status, input.Note, ct) ? NoContent() : NotFound();

    [HttpGet("audit")]
    public async Task<IActionResult> Audit(CancellationToken ct) =>
        await admin.AuditAsync(Actor, ct) is { } value ? Ok(value.Select(a => new { a.Id, a.AdminUserId, a.Action,
            a.TargetType, a.TargetId, a.CreatedAt, a.Details, a.LegalHold })) : Forbid();

    [HttpGet("retention/preview")]
    public async Task<IActionResult> RetentionPreview(CancellationToken ct) =>
        await retention.PreviewAsync(Actor, ct) is { } value ? Ok(value) : Forbid();
}
