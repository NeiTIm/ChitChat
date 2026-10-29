using System.Data;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Conversations;
using WebChat.Api.Features.Groups;
using WebChat.Api.Infrastructure.Realtime;

namespace WebChat.Api.Features.Messages;

public sealed record DeliveryAcksRequest(IReadOnlyList<Guid> MessageIds);
