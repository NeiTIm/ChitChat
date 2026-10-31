
namespace WebChat.Api.Features.Files;

public interface IFileStorage
{
    Task SaveAsync(
        string key,
        Stream source,
        long maximumBytes,
        CancellationToken ct);

    Task<Stream> OpenReadAsync(
        string key,
        CancellationToken ct);

    Task DeleteAsync(
        string key,
        CancellationToken ct);
}
