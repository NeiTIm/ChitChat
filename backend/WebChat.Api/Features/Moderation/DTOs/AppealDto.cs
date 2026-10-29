using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;

namespace WebChat.Api.Features.Moderation;

public sealed record AppealDto(Guid Id, Guid SuspensionId, string Reason, string Status, DateTime CreatedAt, DateTime? ReviewedAt, string? ReviewNote);
