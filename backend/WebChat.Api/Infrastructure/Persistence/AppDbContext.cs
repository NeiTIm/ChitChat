
using Microsoft.EntityFrameworkCore;
using WebChat.Api.Shared.Entities;

namespace WebChat.Api.Infrastructure.Persistence;

public sealed class AppDbContext(
    DbContextOptions<AppDbContext> options
) : DbContext(options)
{
    // =====================================================
    // DBSETS
    // =====================================================

    // Authentication & Users
    public DbSet<User> Users => Set<User>();
    public DbSet<UserPrivacySetting> UserPrivacySettings => Set<UserPrivacySetting>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuthToken> AuthTokens => Set<AuthToken>();
    public DbSet<AccountSuspension> AccountSuspensions => Set<AccountSuspension>();
    public DbSet<AccountAppeal> AccountAppeals => Set<AccountAppeal>();

    // Friends & Blocking
    public DbSet<FriendRequest> FriendRequests => Set<FriendRequest>();
    public DbSet<Friendship> Friendships => Set<Friendship>();
    public DbSet<UserBlock> UserBlocks => Set<UserBlock>();

    // Conversations
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<PrivateConversationPair> PrivateConversationPairs => Set<PrivateConversationPair>();
    public DbSet<PrivateChatAccess> PrivateChatAccess => Set<PrivateChatAccess>();
    public DbSet<MessageRequest> MessageRequests => Set<MessageRequest>();
    public DbSet<ConversationMember> ConversationMembers => Set<ConversationMember>();
    public DbSet<ConversationUserState> ConversationUserStates => Set<ConversationUserState>();

    // Groups
    public DbSet<GroupProfile> GroupProfiles => Set<GroupProfile>();
    public DbSet<GroupInvitation> GroupInvitations => Set<GroupInvitation>();
    public DbSet<GroupInviteLink> GroupInviteLinks => Set<GroupInviteLink>();
    public DbSet<GroupPin> GroupPins => Set<GroupPin>();

    // Messages
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<MessageEditHistory> MessageEditHistories => Set<MessageEditHistory>();
    public DbSet<MessageUserState> MessageUserStates => Set<MessageUserState>();
    public DbSet<MessageReaction> MessageReactions => Set<MessageReaction>();
    public DbSet<MessageDelivery> MessageDeliveries => Set<MessageDelivery>();
    public DbSet<ConversationReadCursor> ConversationReadCursors => Set<ConversationReadCursor>();

    // Files
    public DbSet<StoredFile> StoredFiles => Set<StoredFile>();
    public DbSet<MessageAttachment> MessageAttachments => Set<MessageAttachment>();

    // Notifications
    public DbSet<Notification> Notifications => Set<Notification>();

    // Moderation
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<ReportEvidence> ReportEvidences => Set<ReportEvidence>();
    public DbSet<AdminAuditLog> AdminAuditLogs => Set<AdminAuditLog>();

    // =====================================================
    // MODEL CONFIGURATION
    // =====================================================

    protected override void OnModelCreating(ModelBuilder model)
    {
        base.OnModelCreating(model);

        // -------------------------------------------------
        // Database provider
        // -------------------------------------------------

        var isPostgreSql = Database.IsNpgsql();

        // -------------------------------------------------
        // USER
        // -------------------------------------------------

        model.Entity<User>(e =>
        {
            e.HasIndex(x => x.NormalizedEmail)
                .IsUnique();

            e.HasIndex(x => x.NormalizedUsername)
                .IsUnique();

            ConfigureRowVersion(
                e,
                isPostgreSql,
                x => x.RowVersion
            );

            e.Property(x => x.Email)
                .HasMaxLength(320);

            e.Property(x => x.Username)
                .HasMaxLength(50);

            e.Property(x => x.DisplayName)
                .HasMaxLength(100);
        });

        // -------------------------------------------------
        // USER PRIVACY SETTINGS
        // -------------------------------------------------

        model.Entity<UserPrivacySetting>(e =>
        {
            e.HasKey(x => x.UserId);

            e.HasOne<User>()
                .WithOne()
                .HasForeignKey<UserPrivacySetting>(x => x.UserId);
        });

        // -------------------------------------------------
        // USER SESSIONS
        // -------------------------------------------------

        model.Entity<UserSession>(e =>
        {
            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.UserId);
        });

        // -------------------------------------------------
        // REFRESH TOKENS
        // -------------------------------------------------

        model.Entity<RefreshToken>(e =>
        {
            e.HasIndex(x => x.TokenHash)
                .IsUnique();

            e.HasOne<UserSession>()
                .WithMany()
                .HasForeignKey(x => x.SessionId);
        });

        // -------------------------------------------------
        // AUTH TOKENS
        // -------------------------------------------------

        model.Entity<AuthToken>(e =>
        {
            e.HasIndex(x => x.TokenHash)
                .IsUnique();

            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.UserId);
        });

        // -------------------------------------------------
        // ACCOUNT SUSPENSIONS
        // -------------------------------------------------

        model.Entity<AccountSuspension>(e =>
        {
            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.UserId);

            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.AdminId);
        });

        // -------------------------------------------------
        // ACCOUNT APPEALS
        // -------------------------------------------------

        model.Entity<AccountAppeal>(e =>
        {
            e.HasOne<AccountSuspension>()
                .WithMany()
                .HasForeignKey(x => x.SuspensionId);

            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.UserId);
        });

        // -------------------------------------------------
        // FRIEND REQUESTS
        // -------------------------------------------------

        model.Entity<FriendRequest>(e =>
        {
            e.HasIndex(x => new
            {
                x.PairUserId1,
                x.PairUserId2
            })
                .IsUnique()
                .HasFilter(
                    isPostgreSql
                        ? "\"Status\" = 'Pending'"
                        : "[Status] = 'Pending'"
                );

            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.SenderUserId);

            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.ReceiverUserId);
        });

        // -------------------------------------------------
        // FRIENDSHIPS
        // -------------------------------------------------

        model.Entity<Friendship>(e =>
        {
            e.HasIndex(x => new
            {
                x.UserId1,
                x.UserId2
            })
                .IsUnique()
                .HasFilter(
                    isPostgreSql
                        ? "\"RemovedAt\" IS NULL"
                        : "[RemovedAt] IS NULL"
                );

            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.UserId1);

            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.UserId2);
        });

        // -------------------------------------------------
        // USER BLOCKS
        // -------------------------------------------------

        model.Entity<UserBlock>(e =>
        {
            e.HasIndex(x => new
            {
                x.BlockerUserId,
                x.BlockedUserId
            })
                .IsUnique()
                .HasFilter(
                    isPostgreSql
                        ? "\"UnblockedAt\" IS NULL"
                        : "[UnblockedAt] IS NULL"
                );

            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.BlockerUserId);

            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.BlockedUserId);
        });

        // -------------------------------------------------
        // CONVERSATIONS
        // -------------------------------------------------

        model.Entity<Conversation>(e =>
        {
            ConfigureRowVersion(
                e,
                isPostgreSql,
                x => x.RowVersion
            );
        });

        // -------------------------------------------------
        // PRIVATE CONVERSATION PAIRS
        // -------------------------------------------------

        model.Entity<PrivateConversationPair>(e =>
        {
            e.HasKey(x => x.ConversationId);

            e.HasIndex(x => new
            {
                x.UserId1,
                x.UserId2
            })
                .IsUnique();

            e.HasOne<Conversation>()
                .WithOne()
                .HasForeignKey<PrivateConversationPair>(
                    x => x.ConversationId
                );
        });

        // -------------------------------------------------
        // PRIVATE CHAT ACCESS
        // -------------------------------------------------

        model.Entity<PrivateChatAccess>(e =>
        {
            e.HasKey(x => new
            {
                x.ConversationId,
                x.SenderUserId,
                x.ReceiverUserId
            });

            e.HasOne<Conversation>()
                .WithMany()
                .HasForeignKey(x => x.ConversationId);
        });

        // -------------------------------------------------
        // MESSAGE REQUESTS
        // -------------------------------------------------

        model.Entity<MessageRequest>(e =>
        {
            e.HasIndex(x => new
            {
                x.ReceiverUserId,
                x.Status,
                x.CreatedAt
            });

            e.HasOne<Conversation>()
                .WithMany()
                .HasForeignKey(x => x.ConversationId);
        });

        // -------------------------------------------------
        // CONVERSATION MEMBERS
        // -------------------------------------------------

        model.Entity<ConversationMember>(e =>
        {
            e.HasIndex(x => new
            {
                x.ConversationId,
                x.UserId
            })
                .IsUnique()
                .HasFilter(
                    isPostgreSql
                        ? "\"LeftAt\" IS NULL"
                        : "[LeftAt] IS NULL"
                );

            e.HasOne<Conversation>()
                .WithMany()
                .HasForeignKey(x => x.ConversationId);

            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.UserId);
        });

        // -------------------------------------------------
        // CONVERSATION USER STATES
        // -------------------------------------------------

        model.Entity<ConversationUserState>(e =>
        {
            e.HasKey(x => new
            {
                x.ConversationId,
                x.UserId
            });

            e.HasOne<Conversation>()
                .WithMany()
                .HasForeignKey(x => x.ConversationId);

            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.UserId);
        });

        // -------------------------------------------------
        // GROUP PROFILES
        // -------------------------------------------------

        model.Entity<GroupProfile>(e =>
        {
            e.HasKey(x => x.ConversationId);

            ConfigureRowVersion(
                e,
                isPostgreSql,
                x => x.RowVersion
            );

            e.HasOne<Conversation>()
                .WithOne()
                .HasForeignKey<GroupProfile>(
                    x => x.ConversationId
                );
        });

        // -------------------------------------------------
        // GROUP INVITATIONS
        // -------------------------------------------------

        model.Entity<GroupInvitation>(e =>
        {
            e.HasIndex(x => new
            {
                x.InviteeUserId,
                x.Status,
                x.CreatedAt
            });

            e.HasOne<Conversation>()
                .WithMany()
                .HasForeignKey(x => x.ConversationId);
        });

        // -------------------------------------------------
        // GROUP INVITE LINKS
        // -------------------------------------------------

        model.Entity<GroupInviteLink>(e =>
        {
            e.HasIndex(x => x.TokenHash)
                .IsUnique();

            e.HasOne<Conversation>()
                .WithMany()
                .HasForeignKey(x => x.ConversationId);

            e.HasOne<ConversationMember>()
                .WithMany()
                .HasForeignKey(x => x.CreatedByMembershipId);
        });

        // -------------------------------------------------
        // GROUP PINS
        // -------------------------------------------------

        model.Entity<GroupPin>(e =>
        {
            e.HasIndex(x => new
            {
                x.ConversationId,
                x.MessageId
            })
            .IsUnique();

            e.HasOne<Conversation>()
                .WithMany()
                .HasForeignKey(x => x.ConversationId);

            e.HasOne<Message>()
                .WithMany()
                .HasForeignKey(x => x.MessageId);
        });

        // -------------------------------------------------
        // MESSAGES
        // -------------------------------------------------

        model.Entity<Message>(e =>
        {
            e.HasIndex(x => new
            {
                x.ConversationId,
                x.Sequence
            })
            .IsUnique();

            e.HasIndex(x => new
            {
                x.SenderUserId,
                x.ClientMessageId
            })
            .IsUnique();

            e.HasOne<Conversation>()
                .WithMany()
                .HasForeignKey(x => x.ConversationId);

            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.SenderUserId);
        });

        // -------------------------------------------------
        // MESSAGE EDIT HISTORIES
        // -------------------------------------------------

        model.Entity<MessageEditHistory>(e =>
        {
            e.HasIndex(x => new
            {
                x.MessageId,
                x.Version
            })
            .IsUnique();

            e.HasOne<Message>()
                .WithMany()
                .HasForeignKey(x => x.MessageId);
        });

        // -------------------------------------------------
        // MESSAGE USER STATES
        // -------------------------------------------------

        model.Entity<MessageUserState>(e =>
        {
            e.HasKey(x => new
            {
                x.MessageId,
                x.UserId
            });

            e.HasOne<Message>()
                .WithMany()
                .HasForeignKey(x => x.MessageId);
        });

        // -------------------------------------------------
        // MESSAGE REACTIONS
        // -------------------------------------------------

        model.Entity<MessageReaction>(e =>
        {
            e.HasIndex(x => new
            {
                x.MessageId,
                x.UserId
            })
            .IsUnique();

            e.HasOne<Message>()
                .WithMany()
                .HasForeignKey(x => x.MessageId);
        });

        // -------------------------------------------------
        // MESSAGE DELIVERIES
        // -------------------------------------------------

        model.Entity<MessageDelivery>(e =>
        {
            e.HasKey(x => new
            {
                x.MessageId,
                x.RecipientUserId
            });

            e.HasOne<Message>()
                .WithMany()
                .HasForeignKey(x => x.MessageId);
        });

        // -------------------------------------------------
        // CONVERSATION READ CURSORS
        // -------------------------------------------------

        model.Entity<ConversationReadCursor>(e =>
        {
            e.HasKey(x => new
            {
                x.ConversationId,
                x.UserId
            });

            e.HasOne<Conversation>()
                .WithMany()
                .HasForeignKey(x => x.ConversationId);
        });

        // -------------------------------------------------
        // STORED FILES
        // -------------------------------------------------

        model.Entity<StoredFile>(e =>
        {
            e.HasIndex(x => x.StorageKey)
                .IsUnique();

            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.UploadedByUserId);
        });

        // -------------------------------------------------
        // MESSAGE ATTACHMENTS
        // -------------------------------------------------

        model.Entity<MessageAttachment>(e =>
        {
            e.HasIndex(x => new
            {
                x.MessageId,
                x.DisplayOrder
            })
            .IsUnique();

            e.HasOne<Message>()
                .WithMany()
                .HasForeignKey(x => x.MessageId);

            e.HasOne<StoredFile>()
                .WithMany()
                .HasForeignKey(x => x.StoredFileId);
        });

        // -------------------------------------------------
        // NOTIFICATIONS
        // -------------------------------------------------

        model.Entity<Notification>(e =>
        {
            e.HasIndex(x => new
            {
                x.RecipientUserId,
                x.CreatedAt
            });

            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.RecipientUserId);
        });

        // -------------------------------------------------
        // REPORTS
        // -------------------------------------------------

        model.Entity<Report>(e =>
        {
            e.HasIndex(x => new
            {
                x.Status,
                x.CreatedAt
            });

            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.ReporterUserId);
        });

        // -------------------------------------------------
        // REPORT EVIDENCE
        // -------------------------------------------------

        model.Entity<ReportEvidence>(e =>
        {
            e.HasOne<Report>()
                .WithMany()
                .HasForeignKey(x => x.ReportId);
        });

        // -------------------------------------------------
        // ADMIN AUDIT LOGS
        // -------------------------------------------------

        model.Entity<AdminAuditLog>(e =>
        {
            e.HasIndex(x => x.CreatedAt);

            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.AdminUserId);
        });

        // =====================================================
        // GLOBAL FOREIGN KEY DELETE BEHAVIOR
        // =====================================================

        // Giữ nguyên hành vi của dự án SQL Server hiện tại.
        foreach (var entity in model.Model.GetEntityTypes())
        {
            foreach (var foreignKey in entity.GetForeignKeys())
            {
                foreignKey.DeleteBehavior = DeleteBehavior.NoAction;
            }
        }
    }

    // =====================================================
    // PROVIDER-SPECIFIC CONCURRENCY
    // =====================================================

    private static void ConfigureRowVersion<TEntity>(
        Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<TEntity> entity,
        bool isPostgreSql,
        System.Linq.Expressions.Expression<Func<TEntity, byte[]>> rowVersionProperty
    )
        where TEntity : class
    {
        if (isPostgreSql)
        {
            // Lấy tên thuộc tính RowVersion từ expression.
            var propertyName =
                ((System.Linq.Expressions.MemberExpression)rowVersionProperty.Body)
                .Member.Name;

            // PostgreSQL không sử dụng SQL Server rowversion.
            entity.Ignore(propertyName);

            // PostgreSQL sử dụng xmin làm concurrency token.
            entity.Property<uint>("xmin")
                .IsRowVersion();
        }
        else
        {
            // SQL Server giữ nguyên byte[] RowVersion.
            entity.Property(rowVersionProperty)
                .IsRowVersion();
        }
    }
}
