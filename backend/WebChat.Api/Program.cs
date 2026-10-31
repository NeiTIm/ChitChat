
using WebChat.Api.Shared.Helpers;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using WebChat.Api.Features.Auth;
using WebChat.Api.Features.Users;
using WebChat.Api.Features.Friends;
using WebChat.Api.Features.Conversations;
using WebChat.Api.Infrastructure.Realtime;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddFilter(
    "Microsoft.EntityFrameworkCore.Database.Command",
    LogLevel.Warning
);

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

// =====================================================
// DATABASE PROVIDER
// =====================================================

var databaseProvider =
    builder.Configuration["Database:Provider"] ?? "SqlServer";

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (databaseProvider.Equals(
        "SqlServer",
        StringComparison.OrdinalIgnoreCase))
    {
        options.UseSqlServer(
            DatabaseTarget.Validate(
                builder.Configuration.GetConnectionString(
                    "WebChatCodexDb_Refactor"
                )
            )
        );
    }
    else if (databaseProvider.Equals(
        "PostgreSQL",
        StringComparison.OrdinalIgnoreCase))
    {
        var connectionString =
            builder.Configuration.GetConnectionString(
                "WebChatPostgres"
            );

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            connectionString =
                builder.Configuration[
                    "CHITCHAT_POSTGRES_CONNECTION"
                ];
        }

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "PostgreSQL connection string is not configured."
            );
        }

        options.UseNpgsql(connectionString);
    }
    else
    {
        throw new InvalidOperationException(
            $"Unsupported database provider: {databaseProvider}"
        );
    }
});

// =====================================================
// DEPENDENCY INJECTION
// =====================================================

builder.Services.AddSingleton(TimeProvider.System);

builder.Services.AddScoped<IUserRepository, UserRepository>();

builder.Services.AddScoped<AuthService>();

builder.Services.AddScoped<IAuthService>(
    sp => sp.GetRequiredService<AuthService>()
);

builder.Services.AddScoped<UserService>();

builder.Services.AddScoped<IFriendRepository, FriendRepository>();

builder.Services.AddScoped<FriendService>();

builder.Services.AddScoped<IFriendService>(
    sp => sp.GetRequiredService<FriendService>()
);

builder.Services.AddScoped<PrivateChatService>();
builder.Services.AddScoped<MessageRequestService>();

builder.Services.AddScoped<
    WebChat.Api.Features.Groups.GroupService
>();

builder.Services.AddScoped<
    WebChat.Api.Features.Groups.AdvancedGroupService
>();

builder.Services.AddScoped<
    WebChat.Api.Features.Groups.GroupInviteLinkService
>();

builder.Services.AddScoped<
    WebChat.Api.Features.Messages.IMessageRepository,
    WebChat.Api.Features.Messages.MessageRepository
>();

builder.Services.AddScoped<
    WebChat.Api.Features.Messages.MessageActionService
>();

builder.Services.AddScoped<
    WebChat.Api.Features.Messages.IMessageService
>(
    sp => sp.GetRequiredService<
        WebChat.Api.Features.Messages.MessageActionService
    >()
);

builder.Services.AddScoped<
    WebChat.Api.Features.Messages.MessageStatusService
>();

builder.Services.AddScoped<
    WebChat.Api.Features.Presence.PresenceService
>();

var fileStorageProvider =
    builder.Configuration["FileStorage:Provider"] ?? "Local";

if (fileStorageProvider.Equals(
        "Supabase",
        StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddHttpClient<
        WebChat.Api.Features.Files.SupabaseFileStorage>();

    builder.Services.AddScoped<
        WebChat.Api.Features.Files.IFileStorage>(
        sp => sp.GetRequiredService<
            WebChat.Api.Features.Files.SupabaseFileStorage>());
}
else if (fileStorageProvider.Equals(
             "Local",
             StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddSingleton<
        WebChat.Api.Features.Files.IFileStorage,
        WebChat.Api.Features.Files.LocalFileStorage>();
}
else
{
    throw new InvalidOperationException(
        $"Unsupported file storage provider: {fileStorageProvider}");
}

builder.Services.AddScoped<
    WebChat.Api.Features.Files.FileService
>();

builder.Services.AddScoped<
    WebChat.Api.Features.Files.MessageAttachmentService
>();

builder.Services.AddScoped<
    WebChat.Api.Features.Notifications.NotificationService
>();

builder.Services.AddScoped<
    WebChat.Api.Features.Moderation.ReportService
>();

builder.Services.AddScoped<
    WebChat.Api.Features.Moderation.AdminService
>();

builder.Services.AddScoped<
    WebChat.Api.Features.Moderation.AppealService
>();

builder.Services.AddScoped<
    WebChat.Api.Features.Moderation.RetentionService
>();

builder.Services.AddSignalR();

// =====================================================
// EMAIL PROVIDER
// =====================================================
// Development mặc định sử dụng DevMail.
// Production bắt buộc cấu hình Resend.
// Có thể test Resend ngay tại localhost bằng Mail__Provider.
// =====================================================

var mailProvider = builder.Configuration["Mail:Provider"];

if (string.IsNullOrWhiteSpace(mailProvider))
{
    mailProvider = builder.Environment.IsDevelopment()
        ? "Dev"
        : "Resend";
}

if (mailProvider.Equals(
    "Dev",
    StringComparison.OrdinalIgnoreCase))
{
    if (!builder.Environment.IsDevelopment())
    {
        throw new InvalidOperationException(
            "DevMailSink is only available in Development."
        );
    }

    builder.Services.AddScoped<IAuthMailSender, DevMailSink>();
}
else if (mailProvider.Equals(
    "Resend",
    StringComparison.OrdinalIgnoreCase))
{
    if (string.IsNullOrWhiteSpace(
            builder.Configuration["Resend:ApiKey"]) ||
        string.IsNullOrWhiteSpace(
            builder.Configuration["Resend:From"]) ||
        string.IsNullOrWhiteSpace(
            builder.Configuration["Resend:FrontendBaseUrl"]))
    {
        throw new InvalidOperationException(
            "Resend requires ApiKey, From and FrontendBaseUrl."
        );
    }

    builder.Services.AddHttpClient<
        IAuthMailSender,
        ResendMailSender
    >(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(20);
    });
}
else
{
    throw new InvalidOperationException(
        $"Unsupported mail provider: {mailProvider}"
    );
}

// =====================================================
// JWT AUTHENTICATION
// =====================================================

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var signingKey = builder.Configuration["Jwt:Key"];

        if (string.IsNullOrEmpty(signingKey) ||
            Encoding.UTF8.GetByteCount(signingKey) < 32)
        {
            throw new InvalidOperationException(
                "JWT signing key must be configured " +
                "in local secret storage."
            );
        }

        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = "WebChat.Api",

                ValidateAudience = true,
                ValidAudience = "WebChat.Frontend",

                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(30),

                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(signingKey)
                )
            };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (
                    context.Request.Path.StartsWithSegments(
                        "/hubs/chat"
                    ) &&
                    context.Request.Query.TryGetValue(
                        "access_token",
                        out var token
                    )
                )
                {
                    context.Token = token;
                }

                return Task.CompletedTask;
            },

            OnTokenValidated = async context =>
            {
                var userIdText =
                    context.Principal?.FindFirstValue(
                        JwtRegisteredClaimNames.Sub
                    )
                    ?? context.Principal?.FindFirstValue(
                        ClaimTypes.NameIdentifier
                    );

                if (
                    context.Principal?.FindFirstValue("scope")
                    == "appeal"
                )
                {
                    if (
                        !Guid.TryParse(
                            userIdText,
                            out var appealUserId
                        ) ||
                        !context.Request.Path.StartsWithSegments(
                            "/api/appeals"
                        )
                    )
                    {
                        context.Fail(
                            "Appeal token is restricted"
                        );
                        return;
                    }

                    var appealDb =
                        context.HttpContext.RequestServices
                            .GetRequiredService<AppDbContext>();

                    var appealUser =
                        await appealDb.Users.FindAsync(
                            appealUserId
                        );

                    var appealSuspended =
                        await appealDb.AccountSuspensions.AnyAsync(
                            s =>
                                s.UserId == appealUserId &&
                                s.Status == "Active" &&
                                s.RevokedAt == null &&
                                (
                                    s.ExpiresAt == null ||
                                    s.ExpiresAt > DateTime.UtcNow
                                )
                        );

                    if (
                        appealUser?.EmailVerifiedAt is null ||
                        appealUser.DeactivatedAt is not null ||
                        !appealSuspended
                    )
                    {
                        context.Fail(
                            "Appeal identity is no longer eligible"
                        );
                    }

                    return;
                }

                var sessionIdText =
                    context.Principal?.FindFirstValue("sid");

                if (
                    !Guid.TryParse(
                        userIdText,
                        out var userId
                    ) ||
                    !Guid.TryParse(
                        sessionIdText,
                        out var sessionId
                    )
                )
                {
                    context.Fail("Invalid session");
                    return;
                }

                var db = context.HttpContext.RequestServices
                    .GetRequiredService<AppDbContext>();

                var now = DateTime.UtcNow;

                var active =
                    await db.UserSessions.AnyAsync(
                        s =>
                            s.Id == sessionId &&
                            s.UserId == userId &&
                            s.RevokedAt == null
                    );

                var user =
                    await db.Users.FindAsync(userId);

                var suspended =
                    await db.AccountSuspensions.AnyAsync(
                        s =>
                            s.UserId == userId &&
                            s.Status == "Active" &&
                            s.RevokedAt == null &&
                            (
                                s.ExpiresAt == null ||
                                s.ExpiresAt > now
                            )
                    );

                if (
                    !active ||
                    user?.EmailVerifiedAt is null ||
                    user.DeactivatedAt is not null ||
                    suspended
                )
                {
                    context.Fail(
                        "Session is no longer active"
                    );
                }
            }
        };
    });

builder.Services.AddAuthorization();

// =====================================================
// RATE LIMITING
// =====================================================

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode =
        StatusCodes.Status429TooManyRequests;

    options.AddPolicy(
        "auth",
        context =>
            RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?
                    .ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 30,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0
                }
            )
    );
});

// =====================================================
// CORS
// =====================================================

builder.Services.AddCors(options =>
{
    options.AddPolicy("LocalFrontend", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5174",
                "http://127.0.0.1:5174",
                "https://chit-chat-khaki-pi.vercel.app"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// =====================================================
// HTTP PIPELINE
// =====================================================

var app = builder.Build();

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("LocalFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");

app.MapGet(
    "/api/health",
    () => Results.Ok(
        new HealthResponse("ok", "WebChat.Api")
    )
).WithName("GetHealth");

app.Run();

public partial class Program;
