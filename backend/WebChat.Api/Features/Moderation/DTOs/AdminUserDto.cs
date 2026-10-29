using System.Data;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Files;

namespace WebChat.Api.Features.Moderation;

public sealed record AdminUserDto(Guid Id, string Email, string Username, string SystemRole, bool Suspended, DateTime CreatedAt);
