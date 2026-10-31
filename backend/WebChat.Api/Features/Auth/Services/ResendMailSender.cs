
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace WebChat.Api.Features.Auth;

public sealed class ResendMailSender(
    HttpClient httpClient,
    IConfiguration configuration,
    ILogger<ResendMailSender> logger
) : IAuthMailSender
{
    public async Task SendTokenAsync(
        string email,
        string token,
        string purpose,
        CancellationToken cancellationToken)
    {
        var apiKey = configuration["Resend:ApiKey"];
        var from = configuration["Resend:From"];
        var frontendUrl = configuration["Resend:FrontendBaseUrl"];

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException(
                "Missing Resend:ApiKey."
            );
        }

        if (string.IsNullOrWhiteSpace(from))
        {
            throw new InvalidOperationException(
                "Missing Resend:From."
            );
        }

        if (string.IsNullOrWhiteSpace(frontendUrl))
        {
            throw new InvalidOperationException(
                "Missing Resend:FrontendBaseUrl."
            );
        }

        if (!Uri.TryCreate(
                frontendUrl,
                UriKind.Absolute,
                out var baseUri) ||
            (baseUri.Scheme != Uri.UriSchemeHttps &&
             !(baseUri.Scheme == Uri.UriSchemeHttp &&
               baseUri.IsLoopback)))
        {
            throw new InvalidOperationException(
                "Resend:FrontendBaseUrl must be HTTPS " +
                "or an HTTP localhost address."
            );
        }

        string path;
        string subject;
        string title;
        string description;

        switch (purpose)
        {
            case "verify-email":
                path = "/verify-email";
                subject = "ChitChat - Xac minh email";
                title = "Xác minh tài khoản ChitChat";
                description =
                    "Nhấn nút bên dưới để xác minh email. " +
                    "Liên kết có hiệu lực trong 24 giờ.";
                break;

            case "reset-password":
                path = "/reset-password";
                subject = "ChitChat - Dat lai mat khau";
                title = "Đặt lại mật khẩu ChitChat";
                description =
                    "Nhấn nút bên dưới để đặt lại mật khẩu. " +
                    "Liên kết có hiệu lực trong 1 giờ.";
                break;

            default:
                throw new ArgumentException(
                    "Unsupported mail purpose.",
                    nameof(purpose)
                );
        }

        var url =
            baseUri.ToString().TrimEnd('/') +
            path +
            "?token=" +
            Uri.EscapeDataString(token);

        var safeTitle = WebUtility.HtmlEncode(title);
        var safeDescription = WebUtility.HtmlEncode(description);
        var safeUrl = WebUtility.HtmlEncode(url);

        var html = $$"""
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport"
                      content="width=device-width, initial-scale=1">
                <title>{{safeTitle}}</title>
            </head>
            <body style="margin:0;padding:24px;
                         background:#f5f6fa;
                         font-family:Arial,sans-serif;">
                <div style="max-width:520px;margin:0 auto;
                            background:#ffffff;padding:32px;
                            border-radius:12px;">
                    <h2 style="color:#111827;">
                        {{safeTitle}}
                    </h2>

                    <p style="color:#374151;line-height:1.7;">
                        {{safeDescription}}
                    </p>

                    <p style="margin:32px 0;">
                        <a href="{{safeUrl}}"
                           style="background:#2563eb;
                                  color:#ffffff;
                                  text-decoration:none;
                                  padding:14px 24px;
                                  border-radius:8px;">
                            Tiếp tục
                        </a>
                    </p>

                    <p style="color:#6b7280;font-size:13px;">
                        Nếu bạn không thực hiện yêu cầu này,
                        hãy bỏ qua email.
                    </p>

                    <p style="color:#6b7280;font-size:13px;">
                        ChitChat
                    </p>
                </div>
            </body>
            </html>
            """;

        var payload = new
        {
            from,
            to = new[] { email },
            subject,
            html
        };

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            "https://api.resend.com/emails"
        );

        request.Headers.Authorization =
            new AuthenticationHeaderValue("Bearer", apiKey);

        request.Content = JsonContent.Create(payload);

        using var response = await httpClient.SendAsync(
            request,
            cancellationToken
        );

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError(
                "Resend email request failed. " +
                "Purpose: {Purpose}, HTTP status: {StatusCode}",
                purpose,
                (int)response.StatusCode
            );

            throw new HttpRequestException(
                "The email provider rejected the request.",
                null,
                response.StatusCode
            );
        }

        logger.LogInformation(
            "Resend accepted an email request. Purpose: {Purpose}",
            purpose
        );
    }
}
