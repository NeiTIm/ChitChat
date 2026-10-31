
using System.Net;
using System.Net.Http.Headers;

namespace WebChat.Api.Features.Files;

public sealed class SupabaseFileStorage : IFileStorage
{
    private const long MaximumSupportedBytes =
        25L * 1024 * 1024;

    private readonly HttpClient http;
    private readonly string bucket;
    private readonly ILogger<SupabaseFileStorage> logger;

    public SupabaseFileStorage(
        HttpClient http,
        IConfiguration configuration,
        ILogger<SupabaseFileStorage> logger)
    {
        this.http = http;
        this.logger = logger;

        var projectUrl =
            configuration["SupabaseStorage:ProjectUrl"];

        var secretKey =
            configuration["SupabaseStorage:SecretKey"];

        bucket =
            configuration["SupabaseStorage:Bucket"] ?? "";

        if (string.IsNullOrWhiteSpace(projectUrl) ||
            string.IsNullOrWhiteSpace(secretKey) ||
            string.IsNullOrWhiteSpace(bucket))
        {
            throw new InvalidOperationException(
                "Supabase Storage configuration is missing.");
        }

        if (!Uri.TryCreate(
                projectUrl,
                UriKind.Absolute,
                out var uri) ||
            uri.Scheme != Uri.UriSchemeHttps ||
            !uri.Host.EndsWith(
                ".supabase.co",
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Invalid Supabase Project URL.");
        }

        if (!secretKey.StartsWith(
                "sb_secret_",
                StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "Expected a Supabase server secret key.");
        }

        if (bucket != "chitchat-private")
        {
            throw new InvalidOperationException(
                "Unexpected Supabase bucket.");
        }

        http.BaseAddress = new Uri(
            projectUrl.TrimEnd('/') + "/storage/v1/");

        http.DefaultRequestHeaders.Add(
            "apikey",
            secretKey);

        http.DefaultRequestHeaders.Accept.Add(
            new MediaTypeWithQualityHeaderValue(
                "application/json"));
    }

    private static void ValidateKey(string key)
    {
        if (key.Length != 32 ||
            !key.All(Uri.IsHexDigit))
        {
            throw new InvalidOperationException(
                "Invalid storage key.");
        }
    }

    private string ObjectPath(string key)
    {
        ValidateKey(key);

        return $"object/{Uri.EscapeDataString(bucket)}/{key}";
    }

    private string DownloadPath(string key)
    {
        ValidateKey(key);

        return $"object/authenticated/{Uri.EscapeDataString(bucket)}/{key}";
    }

    public async Task SaveAsync(
        string key,
        Stream source,
        long maximumBytes,
        CancellationToken ct)
    {
        ValidateKey(key);

        if (maximumBytes <= 0 ||
            maximumBytes > MaximumSupportedBytes)
        {
            throw new InvalidDataException(
                "Invalid file size limit.");
        }

        using var bufferStream = new MemoryStream();

        var buffer = new byte[81920];
        long total = 0;

        int count;

        while ((count = await source.ReadAsync(
            buffer.AsMemory(),
            ct)) > 0)
        {
            total += count;

            if (total > maximumBytes)
            {
                throw new InvalidDataException(
                    "File is too large.");
            }

            await bufferStream.WriteAsync(
                buffer.AsMemory(0, count),
                ct);
        }

        if (total == 0)
        {
            throw new InvalidDataException(
                "Empty file.");
        }

        bufferStream.Position = 0;

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            ObjectPath(key));

        request.Headers.TryAddWithoutValidation(
            "x-upsert",
            "false");

        using var content = new StreamContent(bufferStream);

        content.Headers.ContentType =
            new MediaTypeHeaderValue(
                "application/octet-stream");

        content.Headers.ContentLength = total;

        request.Content = content;

        using var response = await http.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            ct);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content
                .ReadAsStringAsync(ct);

            logger.LogError(
                "Supabase download failed. HTTP {Status}. Response: {Error}",
                (int)response.StatusCode,
                errorBody);

            throw new HttpRequestException(
                "Supabase Storage download failed.");
        }
    }

    public async Task<Stream> OpenReadAsync(
        string key,
        CancellationToken ct)
    {
        using var response = await http.GetAsync(
            DownloadPath(key),
            HttpCompletionOption.ResponseHeadersRead,
            ct);

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            throw new FileNotFoundException(
                "Storage object not found.");
        }

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError(
                "Supabase download failed. HTTP {StatusCode}.",
                (int)response.StatusCode);

            throw new HttpRequestException(
                "Supabase Storage download failed.",
                null,
                response.StatusCode);
        }

        if (response.Content.Headers.ContentLength is long length &&
            length > MaximumSupportedBytes)
        {
            throw new InvalidDataException(
                "Stored object exceeds supported size.");
        }

        var result = new MemoryStream();

        try
        {
            await using var remote =
                await response.Content.ReadAsStreamAsync(ct);

            var buffer = new byte[81920];
            long total = 0;

            int count;

            while ((count = await remote.ReadAsync(
                buffer.AsMemory(),
                ct)) > 0)
            {
                total += count;

                if (total > MaximumSupportedBytes)
                {
                    throw new InvalidDataException(
                        "Stored object exceeds supported size.");
                }

                await result.WriteAsync(
                    buffer.AsMemory(0, count),
                    ct);
            }

            result.Position = 0;

            return result;
        }
        catch
        {
            await result.DisposeAsync();
            throw;
        }
    }

    public async Task DeleteAsync(
        string key,
        CancellationToken ct)
    {
        using var response = await http.DeleteAsync(
            ObjectPath(key),
            ct);

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return;
        }

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError(
                "Supabase delete failed. HTTP {StatusCode}.",
                (int)response.StatusCode);

            throw new HttpRequestException(
                "Supabase Storage delete failed.",
                null,
                response.StatusCode);
        }
    }
}
