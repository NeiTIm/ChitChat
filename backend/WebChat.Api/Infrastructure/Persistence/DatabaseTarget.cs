using Microsoft.Data.SqlClient;

namespace WebChat.Api.Infrastructure.Persistence;

public static class DatabaseTarget
{
    public const string DefaultConnection = "Server=localhost;Database=WebChatCodexDb_Refactor;Trusted_Connection=True;TrustServerCertificate=True;";

    public static string Validate(string? value)
    {
        var builder = new SqlConnectionStringBuilder(value ?? DefaultConnection);
        if (!string.Equals(builder.DataSource, "localhost", StringComparison.OrdinalIgnoreCase)
            || !string.Equals(builder.InitialCatalog, "WebChatCodexDb_Refactor", StringComparison.Ordinal)
            || !builder.IntegratedSecurity
            || builder.AttachDBFilename.Length > 0)
            throw new InvalidOperationException("Only localhost/WebChatCodexDb_Refactor with Windows Authentication is permitted.");
        return builder.ConnectionString;
    }
}
