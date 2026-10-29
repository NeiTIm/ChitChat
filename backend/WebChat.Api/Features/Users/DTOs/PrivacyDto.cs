using System.ComponentModel.DataAnnotations;

namespace WebChat.Api.Features.Users;

public sealed record PrivacyDto(bool ShowOnline, bool ShowLastSeen, bool AllowStrangerMessages, bool AllowGroupInvites);
