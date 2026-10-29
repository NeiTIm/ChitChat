using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Auth;

public sealed record AccessResponse(string AccessToken, DateTime ExpiresAt, Guid UserId, string Username);
