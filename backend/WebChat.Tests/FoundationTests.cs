using WebChat.Api.Shared.Helpers;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;

namespace WebChat.Tests;

public class FoundationTests
{
    [Fact]
    public void Health_response_identifies_the_API()
    {
        var response = new HealthResponse("ok", "WebChat.Api");
        Assert.Equal("WebChat.Api", response.Service);
        Assert.Equal("ok", response.Status);
    }

    [Theory]
    [InlineData("Server=remote;Database=WebChatCodexDb;Trusted_Connection=True;")]
    [InlineData("Server=localhost;Database=OtherDb;Trusted_Connection=True;")]
    [InlineData("Server=localhost;Database=WebChatCodexDb;User ID=sa;Password=example;")]
    public void Database_target_rejects_unapproved_connections(string connection)
    {
        Assert.Throws<InvalidOperationException>(() => DatabaseTarget.Validate(connection));
    }

    [Fact]
    public void Database_target_accepts_dedicated_local_database()
    {
        Assert.Contains("WebChatCodexDb", DatabaseTarget.Validate(DatabaseTarget.DefaultConnection));
    }
}
