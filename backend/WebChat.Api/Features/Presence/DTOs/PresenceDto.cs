using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Conversations;
using WebChat.Api.Features.Groups;
using WebChat.Api.Infrastructure.Realtime;

namespace WebChat.Api.Features.Presence;

public sealed record PresenceDto(Guid UserId, bool? Online, DateTime? LastSeenAt);
