namespace WebChat.Api.Features.Files;

public interface IFileStorage
{
    Task SaveAsync(string key, Stream source, long maximumBytes, CancellationToken ct);
    Stream OpenRead(string key);
    void Delete(string key);
}
