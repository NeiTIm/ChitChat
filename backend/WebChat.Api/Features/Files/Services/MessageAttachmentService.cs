using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Conversations;

namespace WebChat.Api.Features.Files;

public sealed class MessageAttachmentService(AppDbContext db)
{
    public async Task<bool> BindPendingAsync(Guid actor, Guid messageId, IReadOnlyList<Guid>? attachmentIds, CancellationToken ct)
    {
        var ids = attachmentIds?.ToArray() ?? [];
        if (ids.Length > 5 || ids.Distinct().Count() != ids.Length || ids.Any(id => id == Guid.Empty)) return false;
        if (ids.Length == 0) return true;
        var files = await db.StoredFiles.Where(f => ids.Contains(f.Id)).ToListAsync(ct);
        if (files.Count != ids.Length || files.Any(f => f.UploadedByUserId != actor || f.Purpose != "Message" || f.Status != "Pending" || f.DeletedAt != null)) return false;
        for (var index = 0; index < ids.Length; index++)
        {
            var file = files.Single(f => f.Id == ids[index]);
            file.Status = "Attached";
            db.MessageAttachments.Add(new MessageAttachment { Id = Guid.NewGuid(), MessageId = messageId,
                StoredFileId = file.Id, DisplayOrder = index });
        }
        return true;
    }

    public async Task<MessageDto> EnrichAsync(MessageDto message, CancellationToken ct)
    {
        var attachments = await db.MessageAttachments.Where(a => a.MessageId == message.Id)
            .Join(db.StoredFiles, a => a.StoredFileId, f => f.Id,
                (a, f) => new { a.DisplayOrder, f.Id, f.OriginalFileName, f.ContentType, f.SizeBytes })
            .OrderBy(item => item.DisplayOrder).ToListAsync(ct);
        return message with { Attachments = message.Recalled ? [] : attachments
            .Select(item => new AttachmentDto(item.Id, item.OriginalFileName, item.ContentType, item.SizeBytes)).ToList() };
    }

    public async Task<MessagePageDto> EnrichAsync(MessagePageDto page, CancellationToken ct)
    {
        var items = new List<MessageDto>(page.Items.Count);
        foreach (var message in page.Items) items.Add(await EnrichAsync(message, ct));
        return page with { Items = items };
    }
}
