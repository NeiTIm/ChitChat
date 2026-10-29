using System.Text.Json;

namespace WebChat.Api.Features.Auth;

public interface IAuthMailSender
{
    Task SendTokenAsync(string email, string token, string purpose, CancellationToken cancellationToken);
}
