using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;

namespace WebChat.Api.Features.Moderation;

public sealed record RetentionPreviewDto(int EvidenceEligible, int AuditEligible, int EvidenceHeld, int AuditHeld);
