using Microsoft.EntityFrameworkCore;
using WebChat.Api.Shared.Entities;

namespace WebChat.Api.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<UserPrivacySetting> UserPrivacySettings => Set<UserPrivacySetting>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuthToken> AuthTokens => Set<AuthToken>();
    public DbSet<AccountSuspension> AccountSuspensions => Set<AccountSuspension>();
    public DbSet<AccountAppeal> AccountAppeals => Set<AccountAppeal>();
    public DbSet<FriendRequest> FriendRequests => Set<FriendRequest>();
    public DbSet<Friendship> Friendships => Set<Friendship>();
    public DbSet<UserBlock> UserBlocks => Set<UserBlock>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<PrivateConversationPair> PrivateConversationPairs => Set<PrivateConversationPair>();
    public DbSet<PrivateChatAccess> PrivateChatAccess => Set<PrivateChatAccess>();
    public DbSet<MessageRequest> MessageRequests => Set<MessageRequest>();
    public DbSet<ConversationMember> ConversationMembers => Set<ConversationMember>();
    public DbSet<ConversationUserState> ConversationUserStates => Set<ConversationUserState>();
    public DbSet<GroupProfile> GroupProfiles => Set<GroupProfile>();
    public DbSet<GroupInvitation> GroupInvitations => Set<GroupInvitation>();
    public DbSet<GroupInviteLink> GroupInviteLinks => Set<GroupInviteLink>();
    public DbSet<GroupPin> GroupPins => Set<GroupPin>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<MessageEditHistory> MessageEditHistories => Set<MessageEditHistory>();
    public DbSet<MessageUserState> MessageUserStates => Set<MessageUserState>();
    public DbSet<MessageReaction> MessageReactions => Set<MessageReaction>();
    public DbSet<MessageDelivery> MessageDeliveries => Set<MessageDelivery>();
    public DbSet<ConversationReadCursor> ConversationReadCursors => Set<ConversationReadCursor>();
    public DbSet<StoredFile> StoredFiles => Set<StoredFile>();
    public DbSet<MessageAttachment> MessageAttachments => Set<MessageAttachment>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<ReportEvidence> ReportEvidences => Set<ReportEvidence>();
    public DbSet<AdminAuditLog> AdminAuditLogs => Set<AdminAuditLog>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<User>(e => { e.HasIndex(x => x.NormalizedEmail).IsUnique(); e.HasIndex(x => x.NormalizedUsername).IsUnique(); e.Property(x => x.RowVersion).IsRowVersion(); e.Property(x => x.Email).HasMaxLength(320); e.Property(x => x.Username).HasMaxLength(50); e.Property(x => x.DisplayName).HasMaxLength(100); });
        model.Entity<UserPrivacySetting>(e => { e.HasKey(x => x.UserId); e.HasOne<User>().WithOne().HasForeignKey<UserPrivacySetting>(x => x.UserId); });
        model.Entity<UserSession>(e => e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId));
        model.Entity<RefreshToken>(e => { e.HasIndex(x => x.TokenHash).IsUnique(); e.HasOne<UserSession>().WithMany().HasForeignKey(x => x.SessionId); });
        model.Entity<AuthToken>(e => { e.HasIndex(x => x.TokenHash).IsUnique(); e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId); });
        model.Entity<AccountSuspension>(e => { e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId); e.HasOne<User>().WithMany().HasForeignKey(x => x.AdminId); });
        model.Entity<AccountAppeal>(e => { e.HasOne<AccountSuspension>().WithMany().HasForeignKey(x => x.SuspensionId); e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId); });
        model.Entity<FriendRequest>(e => { e.HasIndex(x => new { x.PairUserId1, x.PairUserId2 }).IsUnique().HasFilter("[Status] = 'Pending'"); e.HasOne<User>().WithMany().HasForeignKey(x => x.SenderUserId); e.HasOne<User>().WithMany().HasForeignKey(x => x.ReceiverUserId); });
        model.Entity<Friendship>(e => { e.HasIndex(x => new { x.UserId1, x.UserId2 }).IsUnique().HasFilter("[RemovedAt] IS NULL"); e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId1); e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId2); });
        model.Entity<UserBlock>(e => { e.HasIndex(x => new { x.BlockerUserId, x.BlockedUserId }).IsUnique().HasFilter("[UnblockedAt] IS NULL"); e.HasOne<User>().WithMany().HasForeignKey(x => x.BlockerUserId); e.HasOne<User>().WithMany().HasForeignKey(x => x.BlockedUserId); });
        model.Entity<Conversation>(e => e.Property(x => x.RowVersion).IsRowVersion());
        model.Entity<PrivateConversationPair>(e => { e.HasKey(x => x.ConversationId); e.HasIndex(x => new { x.UserId1, x.UserId2 }).IsUnique(); e.HasOne<Conversation>().WithOne().HasForeignKey<PrivateConversationPair>(x => x.ConversationId); });
        model.Entity<PrivateChatAccess>(e => { e.HasKey(x => new { x.ConversationId, x.SenderUserId, x.ReceiverUserId }); e.HasOne<Conversation>().WithMany().HasForeignKey(x => x.ConversationId); });
        model.Entity<MessageRequest>(e => { e.HasIndex(x => new { x.ReceiverUserId, x.Status, x.CreatedAt }); e.HasOne<Conversation>().WithMany().HasForeignKey(x => x.ConversationId); });
        model.Entity<ConversationMember>(e => { e.HasIndex(x => new { x.ConversationId, x.UserId }).IsUnique().HasFilter("[LeftAt] IS NULL"); e.HasOne<Conversation>().WithMany().HasForeignKey(x => x.ConversationId); e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId); });
        model.Entity<ConversationUserState>(e => { e.HasKey(x => new { x.ConversationId, x.UserId }); e.HasOne<Conversation>().WithMany().HasForeignKey(x => x.ConversationId); e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId); });
        model.Entity<GroupProfile>(e => { e.HasKey(x => x.ConversationId); e.Property(x => x.RowVersion).IsRowVersion(); e.HasOne<Conversation>().WithOne().HasForeignKey<GroupProfile>(x => x.ConversationId); });
        model.Entity<GroupInvitation>(e => { e.HasIndex(x => new { x.InviteeUserId, x.Status, x.CreatedAt }); e.HasOne<Conversation>().WithMany().HasForeignKey(x => x.ConversationId); });
        model.Entity<GroupInviteLink>(e => { e.HasIndex(x => x.TokenHash).IsUnique(); e.HasOne<Conversation>().WithMany().HasForeignKey(x => x.ConversationId); e.HasOne<ConversationMember>().WithMany().HasForeignKey(x => x.CreatedByMembershipId); });
        model.Entity<GroupPin>(e => { e.HasIndex(x => new { x.ConversationId, x.MessageId }).IsUnique(); e.HasOne<Conversation>().WithMany().HasForeignKey(x => x.ConversationId); e.HasOne<Message>().WithMany().HasForeignKey(x => x.MessageId); });
        model.Entity<Message>(e => { e.HasIndex(x => new { x.ConversationId, x.Sequence }).IsUnique(); e.HasIndex(x => new { x.SenderUserId, x.ClientMessageId }).IsUnique(); e.HasOne<Conversation>().WithMany().HasForeignKey(x => x.ConversationId); e.HasOne<User>().WithMany().HasForeignKey(x => x.SenderUserId); });
        model.Entity<MessageEditHistory>(e => { e.HasIndex(x => new { x.MessageId, x.Version }).IsUnique(); e.HasOne<Message>().WithMany().HasForeignKey(x => x.MessageId); });
        model.Entity<MessageUserState>(e => { e.HasKey(x => new { x.MessageId, x.UserId }); e.HasOne<Message>().WithMany().HasForeignKey(x => x.MessageId); });
        model.Entity<MessageReaction>(e => { e.HasIndex(x => new { x.MessageId, x.UserId }).IsUnique(); e.HasOne<Message>().WithMany().HasForeignKey(x => x.MessageId); });
        model.Entity<MessageDelivery>(e => { e.HasKey(x => new { x.MessageId, x.RecipientUserId }); e.HasOne<Message>().WithMany().HasForeignKey(x => x.MessageId); });
        model.Entity<ConversationReadCursor>(e => { e.HasKey(x => new { x.ConversationId, x.UserId }); e.HasOne<Conversation>().WithMany().HasForeignKey(x => x.ConversationId); });
        model.Entity<StoredFile>(e => { e.HasIndex(x => x.StorageKey).IsUnique(); e.HasOne<User>().WithMany().HasForeignKey(x => x.UploadedByUserId); });
        model.Entity<MessageAttachment>(e => { e.HasIndex(x => new { x.MessageId, x.DisplayOrder }).IsUnique(); e.HasOne<Message>().WithMany().HasForeignKey(x => x.MessageId); e.HasOne<StoredFile>().WithMany().HasForeignKey(x => x.StoredFileId); });
        model.Entity<Notification>(e => { e.HasIndex(x => new { x.RecipientUserId, x.CreatedAt }); e.HasOne<User>().WithMany().HasForeignKey(x => x.RecipientUserId); });
        model.Entity<Report>(e => { e.HasIndex(x => new { x.Status, x.CreatedAt }); e.HasOne<User>().WithMany().HasForeignKey(x => x.ReporterUserId); });
        model.Entity<ReportEvidence>(e => { e.HasOne<Report>().WithMany().HasForeignKey(x => x.ReportId); });
        model.Entity<AdminAuditLog>(e => { e.HasIndex(x => x.CreatedAt); e.HasOne<User>().WithMany().HasForeignKey(x => x.AdminUserId); });

        foreach (var entity in model.Model.GetEntityTypes())
        {
            foreach (var foreignKey in entity.GetForeignKeys()) foreignKey.DeleteBehavior = DeleteBehavior.NoAction;
        }
    }
}
