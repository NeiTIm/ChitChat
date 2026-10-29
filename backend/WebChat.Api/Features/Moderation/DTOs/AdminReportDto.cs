using System.Data;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Files;

namespace WebChat.Api.Features.Moderation;

public sealed record AdminReportDto(Guid Id, Guid ReporterUserId, string TargetType, Guid TargetId, string Reason,
    string Status, DateTime CreatedAt, Guid? ReviewedByAdminId, DateTime? ReviewedAt);
