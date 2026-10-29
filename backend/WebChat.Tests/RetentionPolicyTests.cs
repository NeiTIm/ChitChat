using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Moderation;

namespace WebChat.Tests;

public sealed class RetentionPolicyTests
{
    [Fact]
    public void Evidence_ninety_days_and_audit_twelve_months_are_independent_and_hold_aware()
    {
        var now = new DateTime(2026, 10, 29, 0, 0, 0, DateTimeKind.Utc);
        var evidence = new ReportEvidence { RetainUntil = now.AddDays(-1) };
        var audit = new AdminAuditLog { CreatedAt = now.AddMonths(-11) };
        Assert.True(RetentionPolicy.EvidenceEligible(evidence, now));
        Assert.False(RetentionPolicy.AuditEligible(audit, now));
        evidence.RetainUntil = now.AddDays(1);
        audit.CreatedAt = now.AddMonths(-12);
        Assert.False(RetentionPolicy.EvidenceEligible(evidence, now));
        Assert.True(RetentionPolicy.AuditEligible(audit, now));
        evidence.LegalHold = true;
        audit.LegalHold = true;
        evidence.RetainUntil = now.AddDays(-100);
        Assert.False(RetentionPolicy.EvidenceEligible(evidence, now));
        Assert.False(RetentionPolicy.AuditEligible(audit, now));
        evidence.LegalHold = false;
        evidence.RetainUntil = null;
        Assert.False(RetentionPolicy.EvidenceEligible(evidence, now));
    }
}
