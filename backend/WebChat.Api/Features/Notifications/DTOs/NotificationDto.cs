using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Conversations;
using WebChat.Api.Features.Groups;
using WebChat.Api.Features.Messages;

namespace WebChat.Api.Features.Notifications;

public sealed record NotificationDto(Guid Id, string Type, Guid? ReferenceId, DateTime CreatedAt, DateTime? ReadAt);
