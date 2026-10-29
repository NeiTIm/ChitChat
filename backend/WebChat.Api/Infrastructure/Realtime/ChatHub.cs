using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using WebChat.Api.Features.Conversations;
using WebChat.Api.Features.Groups;
using WebChat.Api.Features.Presence;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using Microsoft.EntityFrameworkCore;

namespace WebChat.Api.Infrastructure.Realtime;

[Authorize]
public sealed class ChatHub(PrivateChatService chats, GroupService groups, PresenceService presence, AppDbContext db) : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = Guid.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await presence.ConnectedAsync(userId, Context.ConnectionId, Context.ConnectionAborted);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Guid.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await presence.DisconnectedAsync(userId, Context.ConnectionId, CancellationToken.None);
        await base.OnDisconnectedAsync(exception);
    }

    public async Task StartTyping(Guid conversationId)
    {
        var userId = Guid.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var sessionId = Guid.Parse(Context.User!.FindFirstValue("sid")!);
        if (!await presence.TypingAsync(userId, sessionId, conversationId, true, Context.ConnectionAborted))
            throw new HubException("Typing is not available.");
    }

    public async Task StopTyping(Guid conversationId)
    {
        var userId = Guid.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var sessionId = Guid.Parse(Context.User!.FindFirstValue("sid")!);
        if (!await presence.TypingAsync(userId, sessionId, conversationId, false, Context.ConnectionAborted))
            throw new HubException("Typing is not available.");
    }

    public async Task JoinConversation(Guid conversationId)
    {
        var userId = Guid.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var sessionId = Guid.Parse(Context.User!.FindFirstValue("sid")!);
        if (!await db.UserSessions.AnyAsync(s => s.Id == sessionId && s.UserId == userId && s.RevokedAt == null, Context.ConnectionAborted))
            throw new HubException("Session is no longer active.");
        if (!await chats.CanReadAsync(userId, conversationId, Context.ConnectionAborted)
            && !await chats.CanReadRequestAsync(userId, conversationId, Context.ConnectionAborted)
            && !await groups.CanSendAsync(userId, conversationId, Context.ConnectionAborted))
            throw new HubException("Conversation is not available.");
        await Groups.AddToGroupAsync(Context.ConnectionId, $"conversation:{conversationId}", Context.ConnectionAborted);
    }

    public Task LeaveConversation(Guid conversationId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, $"conversation:{conversationId}", Context.ConnectionAborted);
}
