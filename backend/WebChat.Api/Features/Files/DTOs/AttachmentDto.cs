using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Conversations;

namespace WebChat.Api.Features.Files;

public sealed record AttachmentDto(Guid Id, string FileName, string ContentType, long SizeBytes);
