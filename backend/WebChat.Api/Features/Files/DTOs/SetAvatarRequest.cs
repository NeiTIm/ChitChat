using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebChat.Api.Features.Files;

public sealed record SetAvatarRequest(Guid StoredFileId);
