using System.Data;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Groups;
using WebChat.Api.Features.Messages;

namespace WebChat.Api.Features.Moderation;

public sealed record ReportDto(Guid Id, string TargetType, Guid TargetId, string Reason, string Status, DateTime CreatedAt, DateTime? ReviewedAt);
