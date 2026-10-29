using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;

namespace WebChat.Api.Features.Conversations;

public sealed record MessageRequestDto(Guid Id, Guid ConversationId, Guid SenderUserId, Guid ReceiverUserId, string Status, long LastSequence, long RequestReadSequence, DateTime CreatedAt);
