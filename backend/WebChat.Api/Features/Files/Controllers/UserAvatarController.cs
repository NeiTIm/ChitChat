using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebChat.Api.Features.Files;

[ApiController]
[Authorize]
[Route("api/users/me/avatar")]
public sealed class UserAvatarController(FileService files) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Set(SetAvatarRequest input, CancellationToken ct)
    {
        var actor = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return await files.SetUserAvatarAsync(actor, input.StoredFileId, ct) ? NoContent() : NotFound();
    }
}
