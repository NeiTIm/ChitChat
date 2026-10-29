using System.IO.Compression;
using System.Text;
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Infrastructure.Persistence;
using WebChat.Api.Shared.Entities;
using WebChat.Api.Features.Messages;
using WebChat.Api.Features.Groups;
using System.Data;

namespace WebChat.Api.Features.Files;

public sealed class FileService(AppDbContext db, IFileStorage storage, MessageActionService actions, GroupService groups, TimeProvider clock)
{
    private const long ImageLimit = 10L * 1024 * 1024;
    private const long FileLimit = 25L * 1024 * 1024;
    private const long AvatarLimit = 5L * 1024 * 1024;
    private static readonly Dictionary<string, string> Types = new(StringComparer.OrdinalIgnoreCase)
    {
        [".jpg"] = "image/jpeg", [".jpeg"] = "image/jpeg", [".png"] = "image/png", [".webp"] = "image/webp",
        [".pdf"] = "application/pdf", [".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        [".xlsx"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", [".txt"] = "text/plain",
        [".zip"] = "application/zip"
    };

    public async Task<StoredFileDto?> UploadAsync(Guid actor, IFormFile file, string purpose, CancellationToken ct)
    {
        if (file is null || file.Length <= 0 || purpose is not ("Message" or "Avatar")) return null;
        var name = Path.GetFileName(file.FileName);
        if (string.IsNullOrWhiteSpace(name) || name.Length > 255 || name.Any(char.IsControl)) return null;
        var extension = Path.GetExtension(name);
        if (!Types.TryGetValue(extension, out var contentType)) return null;
        var image = contentType.StartsWith("image/", StringComparison.Ordinal);
        if (purpose == "Avatar" && !image) return null;
        var maximum = purpose == "Avatar" ? AvatarLimit : image ? ImageLimit : FileLimit;
        if (file.Length > maximum) return null;
        var key = Guid.NewGuid().ToString("N");
        try
        {
            await using (var source = file.OpenReadStream()) await storage.SaveAsync(key, source, maximum, ct);
            if (!ValidContent(key, extension)) { storage.Delete(key); return null; }
            var entity = new StoredFile { Id = Guid.NewGuid(), StorageKey = key, OriginalFileName = name,
                ContentType = contentType, SizeBytes = file.Length, UploadedByUserId = actor, Purpose = purpose,
                Status = "Pending", CreatedAt = clock.GetUtcNow().UtcDateTime };
            db.StoredFiles.Add(entity);
            try { await db.SaveChangesAsync(ct); }
            catch { storage.Delete(key); throw; }
            return new StoredFileDto(entity.Id, name, contentType, file.Length, entity.Status);
        }
        catch (InvalidDataException) { storage.Delete(key); return null; }
    }

    public async Task<FileRead?> ReadAsync(Guid actor, Guid id, CancellationToken ct)
    {
        var file = await db.StoredFiles.SingleOrDefaultAsync(f => f.Id == id && f.DeletedAt == null, ct);
        if (file is null) return null;
        var ownPending = file.Status == "Pending" && file.UploadedByUserId == actor;
        var references = await db.MessageAttachments.Where(a => a.StoredFileId == id).Select(a => a.MessageId).ToListAsync(ct);
        var allowed = ownPending;
        if (!allowed && file.Purpose == "Avatar" && file.Status == "Avatar")
            allowed = await db.Users.AnyAsync(u => u.AvatarFileId == id && u.EmailVerifiedAt != null && u.DeactivatedAt == null, ct);
        if (!allowed && file.Purpose == "Avatar" && file.Status == "Avatar")
        {
            var groupIds = await db.GroupProfiles.Where(g => g.AvatarFileId == id).Select(g => g.ConversationId).ToListAsync(ct);
            foreach (var groupId in groupIds)
                if (await groups.CanReadAsync(actor, groupId, ct)) { allowed = true; break; }
        }
        foreach (var messageId in references)
            if (await actions.CanViewAttachmentAsync(actor, messageId, ct)) { allowed = true; break; }
        if (!allowed) return null;
        try { return new FileRead(storage.OpenRead(file.StorageKey), file.ContentType, file.OriginalFileName); }
        catch (FileNotFoundException) { return null; }
    }

    public async Task<bool> SetUserAvatarAsync(Guid actor, Guid id, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var file = await db.StoredFiles.SingleOrDefaultAsync(f => f.Id == id && f.UploadedByUserId == actor
            && f.Purpose == "Avatar" && f.Status == "Pending" && f.DeletedAt == null, ct);
        var user = await db.Users.SingleOrDefaultAsync(u => u.Id == actor && u.DeactivatedAt == null, ct);
        if (file is null || user is null) return false;
        file.Status = "Avatar";
        user.AvatarFileId = id;
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }

    private bool ValidContent(string key, string extension)
    {
        using var stream = storage.OpenRead(key);
        var header = new byte[16];
        var count = stream.Read(header);
        bool Has(params byte[] bytes) => count >= bytes.Length && header.AsSpan(0, bytes.Length).SequenceEqual(bytes);
        switch (extension.ToLowerInvariant())
        {
            case ".jpg": case ".jpeg": return Has(0xFF, 0xD8, 0xFF);
            case ".png": return Has(137, 80, 78, 71, 13, 10, 26, 10);
            case ".webp": return count >= 12 && Has(82, 73, 70, 70) && header.AsSpan(8, 4).SequenceEqual("WEBP"u8);
            case ".pdf": return Has(37, 80, 68, 70, 45);
            case ".txt":
                stream.Position = 0;
                var sample = new byte[Math.Min(4096, checked((int)stream.Length))];
                stream.ReadExactly(sample);
                if (sample.Contains((byte)0)) return false;
                try { _ = new UTF8Encoding(false, true).GetString(sample); return true; }
                catch (DecoderFallbackException) { return false; }
            case ".zip": case ".docx": case ".xlsx":
                if (!Has(80, 75, 3, 4)) return false;
                try
                {
                    stream.Position = 0;
                    using var zip = new ZipArchive(stream, ZipArchiveMode.Read, leaveOpen: true);
                    if (zip.Entries.Count > 10000) return false;
                    return extension.Equals(".zip", StringComparison.OrdinalIgnoreCase)
                        || zip.Entries.Any(e => e.FullName == (extension.Equals(".docx", StringComparison.OrdinalIgnoreCase) ? "word/document.xml" : "xl/workbook.xml"));
                }
                catch (InvalidDataException) { return false; }
            default: return false;
        }
    }
}
