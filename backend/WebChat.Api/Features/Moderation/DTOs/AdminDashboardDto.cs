using System.Data;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Files;

namespace WebChat.Api.Features.Moderation;

public sealed record AdminDashboardDto(int Users, int Messages, int Groups, int PendingReports, IReadOnlyList<AdminActivityDto> Activity);
