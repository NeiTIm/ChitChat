using System.IO.Compression;
using System.Text;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Messages;
using WebChat.Api.Features.Groups;
using System.Data;

namespace WebChat.Api.Features.Files;

public sealed record StoredFileDto(Guid Id, string FileName, string ContentType, long SizeBytes, string Status);
