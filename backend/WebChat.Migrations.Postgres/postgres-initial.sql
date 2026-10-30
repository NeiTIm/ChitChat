CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;
CREATE TABLE "Conversations" (
    "Id" uuid NOT NULL,
    "Type" text NOT NULL,
    "Status" text NOT NULL,
    "LastSequence" bigint NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_Conversations" PRIMARY KEY ("Id")
);

CREATE TABLE "Users" (
    "Id" uuid NOT NULL,
    "Email" character varying(320) NOT NULL,
    "NormalizedEmail" text NOT NULL,
    "Username" character varying(50) NOT NULL,
    "NormalizedUsername" text NOT NULL,
    "PasswordHash" text NOT NULL,
    "DisplayName" character varying(100) NOT NULL,
    "Bio" text,
    "AvatarFileId" uuid,
    "SystemRole" text NOT NULL,
    "EmailVerifiedAt" timestamp with time zone,
    "LastUsernameChangedAt" timestamp with time zone,
    "DeactivatedAt" timestamp with time zone,
    "LastSeenAt" timestamp with time zone,
    "FailedLoginCount" integer NOT NULL,
    "LockoutUntil" timestamp with time zone,
    "CreatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_Users" PRIMARY KEY ("Id")
);

CREATE TABLE "ConversationReadCursors" (
    "ConversationId" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "LastReadSequence" bigint NOT NULL,
    "UpdatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_ConversationReadCursors" PRIMARY KEY ("ConversationId", "UserId"),
    CONSTRAINT "FK_ConversationReadCursors_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations" ("Id")
);

CREATE TABLE "GroupInvitations" (
    "Id" uuid NOT NULL,
    "ConversationId" uuid NOT NULL,
    "InviterUserId" uuid NOT NULL,
    "InviteeUserId" uuid NOT NULL,
    "InviteLinkId" uuid,
    "Status" text NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "ExpiresAt" timestamp with time zone,
    "RespondedAt" timestamp with time zone,
    CONSTRAINT "PK_GroupInvitations" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_GroupInvitations_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations" ("Id")
);

CREATE TABLE "GroupProfiles" (
    "ConversationId" uuid NOT NULL,
    "Name" text NOT NULL,
    "Description" text,
    "AvatarFileId" uuid,
    "CreatedByUserId" uuid NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_GroupProfiles" PRIMARY KEY ("ConversationId"),
    CONSTRAINT "FK_GroupProfiles_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations" ("Id")
);

CREATE TABLE "MessageRequests" (
    "Id" uuid NOT NULL,
    "ConversationId" uuid NOT NULL,
    "SenderUserId" uuid NOT NULL,
    "ReceiverUserId" uuid NOT NULL,
    "Status" text NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "RespondedAt" timestamp with time zone,
    CONSTRAINT "PK_MessageRequests" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_MessageRequests_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations" ("Id")
);

CREATE TABLE "PrivateChatAccess" (
    "ConversationId" uuid NOT NULL,
    "SenderUserId" uuid NOT NULL,
    "ReceiverUserId" uuid NOT NULL,
    "Status" text NOT NULL,
    "AcceptedAt" timestamp with time zone,
    "RejectedAt" timestamp with time zone,
    "RevokedAt" timestamp with time zone,
    "UpdatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_PrivateChatAccess" PRIMARY KEY ("ConversationId", "SenderUserId", "ReceiverUserId"),
    CONSTRAINT "FK_PrivateChatAccess_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations" ("Id")
);

CREATE TABLE "PrivateConversationPairs" (
    "ConversationId" uuid NOT NULL,
    "UserId1" uuid NOT NULL,
    "UserId2" uuid NOT NULL,
    CONSTRAINT "PK_PrivateConversationPairs" PRIMARY KEY ("ConversationId"),
    CONSTRAINT "FK_PrivateConversationPairs_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations" ("Id")
);

CREATE TABLE "AccountSuspensions" (
    "Id" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "AdminId" uuid NOT NULL,
    "Reason" text NOT NULL,
    "Status" text NOT NULL,
    "StartedAt" timestamp with time zone NOT NULL,
    "ExpiresAt" timestamp with time zone,
    "RevokedAt" timestamp with time zone,
    CONSTRAINT "PK_AccountSuspensions" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_AccountSuspensions_Users_AdminId" FOREIGN KEY ("AdminId") REFERENCES "Users" ("Id"),
    CONSTRAINT "FK_AccountSuspensions_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id")
);

CREATE TABLE "AdminAuditLogs" (
    "Id" uuid NOT NULL,
    "AdminUserId" uuid NOT NULL,
    "Action" text NOT NULL,
    "TargetType" text NOT NULL,
    "TargetId" uuid,
    "CreatedAt" timestamp with time zone NOT NULL,
    "Details" text,
    "LegalHold" boolean NOT NULL,
    CONSTRAINT "PK_AdminAuditLogs" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_AdminAuditLogs_Users_AdminUserId" FOREIGN KEY ("AdminUserId") REFERENCES "Users" ("Id")
);

CREATE TABLE "AuthTokens" (
    "Id" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "Type" text NOT NULL,
    "TokenHash" text NOT NULL,
    "PendingEmail" text,
    "ExpiresAt" timestamp with time zone NOT NULL,
    "UsedAt" timestamp with time zone,
    CONSTRAINT "PK_AuthTokens" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_AuthTokens_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id")
);

CREATE TABLE "ConversationMembers" (
    "Id" uuid NOT NULL,
    "ConversationId" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "Role" text NOT NULL,
    "JoinSequence" bigint NOT NULL,
    "LeaveSequence" bigint,
    "JoinedAt" timestamp with time zone NOT NULL,
    "LeftAt" timestamp with time zone,
    "LeftReason" text,
    CONSTRAINT "PK_ConversationMembers" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_ConversationMembers_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations" ("Id"),
    CONSTRAINT "FK_ConversationMembers_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id")
);

CREATE TABLE "ConversationUserStates" (
    "ConversationId" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "HiddenThroughSequence" bigint NOT NULL,
    "IsHidden" boolean NOT NULL,
    "MutedUntil" timestamp with time zone,
    "RequestReadSequence" bigint NOT NULL,
    "RequestReadAt" timestamp with time zone,
    CONSTRAINT "PK_ConversationUserStates" PRIMARY KEY ("ConversationId", "UserId"),
    CONSTRAINT "FK_ConversationUserStates_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations" ("Id"),
    CONSTRAINT "FK_ConversationUserStates_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id")
);

CREATE TABLE "FriendRequests" (
    "Id" uuid NOT NULL,
    "SenderUserId" uuid NOT NULL,
    "ReceiverUserId" uuid NOT NULL,
    "PairUserId1" uuid NOT NULL,
    "PairUserId2" uuid NOT NULL,
    "Status" text NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "RespondedAt" timestamp with time zone,
    CONSTRAINT "PK_FriendRequests" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_FriendRequests_Users_ReceiverUserId" FOREIGN KEY ("ReceiverUserId") REFERENCES "Users" ("Id"),
    CONSTRAINT "FK_FriendRequests_Users_SenderUserId" FOREIGN KEY ("SenderUserId") REFERENCES "Users" ("Id")
);

CREATE TABLE "Friendships" (
    "Id" uuid NOT NULL,
    "UserId1" uuid NOT NULL,
    "UserId2" uuid NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "RemovedAt" timestamp with time zone,
    CONSTRAINT "PK_Friendships" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Friendships_Users_UserId1" FOREIGN KEY ("UserId1") REFERENCES "Users" ("Id"),
    CONSTRAINT "FK_Friendships_Users_UserId2" FOREIGN KEY ("UserId2") REFERENCES "Users" ("Id")
);

CREATE TABLE "Messages" (
    "Id" uuid NOT NULL,
    "ConversationId" uuid NOT NULL,
    "SenderUserId" uuid NOT NULL,
    "ClientMessageId" uuid NOT NULL,
    "Sequence" bigint NOT NULL,
    "Type" text NOT NULL,
    "Content" text,
    "ReplyToMessageId" uuid,
    "IsForwarded" boolean NOT NULL,
    "Status" text NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "EditedAt" timestamp with time zone,
    "RecalledAt" timestamp with time zone,
    CONSTRAINT "PK_Messages" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Messages_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations" ("Id"),
    CONSTRAINT "FK_Messages_Users_SenderUserId" FOREIGN KEY ("SenderUserId") REFERENCES "Users" ("Id")
);

CREATE TABLE "Notifications" (
    "Id" uuid NOT NULL,
    "RecipientUserId" uuid NOT NULL,
    "ActorUserId" uuid,
    "Type" text NOT NULL,
    "ReferenceId" uuid,
    "CreatedAt" timestamp with time zone NOT NULL,
    "ReadAt" timestamp with time zone,
    CONSTRAINT "PK_Notifications" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Notifications_Users_RecipientUserId" FOREIGN KEY ("RecipientUserId") REFERENCES "Users" ("Id")
);

CREATE TABLE "Reports" (
    "Id" uuid NOT NULL,
    "ReporterUserId" uuid NOT NULL,
    "TargetType" text NOT NULL,
    "TargetId" uuid NOT NULL,
    "Reason" text NOT NULL,
    "Status" text NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "ReviewedByAdminId" uuid,
    "ReviewedAt" timestamp with time zone,
    CONSTRAINT "PK_Reports" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Reports_Users_ReporterUserId" FOREIGN KEY ("ReporterUserId") REFERENCES "Users" ("Id")
);

CREATE TABLE "StoredFiles" (
    "Id" uuid NOT NULL,
    "StorageKey" text NOT NULL,
    "OriginalFileName" text NOT NULL,
    "ContentType" text NOT NULL,
    "SizeBytes" bigint NOT NULL,
    "UploadedByUserId" uuid NOT NULL,
    "Purpose" text NOT NULL,
    "Status" text NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "DeletedAt" timestamp with time zone,
    CONSTRAINT "PK_StoredFiles" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_StoredFiles_Users_UploadedByUserId" FOREIGN KEY ("UploadedByUserId") REFERENCES "Users" ("Id")
);

CREATE TABLE "UserBlocks" (
    "Id" uuid NOT NULL,
    "BlockerUserId" uuid NOT NULL,
    "BlockedUserId" uuid NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UnblockedAt" timestamp with time zone,
    CONSTRAINT "PK_UserBlocks" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_UserBlocks_Users_BlockedUserId" FOREIGN KEY ("BlockedUserId") REFERENCES "Users" ("Id"),
    CONSTRAINT "FK_UserBlocks_Users_BlockerUserId" FOREIGN KEY ("BlockerUserId") REFERENCES "Users" ("Id")
);

CREATE TABLE "UserPrivacySettings" (
    "UserId" uuid NOT NULL,
    "ShowOnline" boolean NOT NULL,
    "ShowLastSeen" boolean NOT NULL,
    "AllowStrangerMessages" boolean NOT NULL,
    "AllowGroupInvites" boolean NOT NULL,
    CONSTRAINT "PK_UserPrivacySettings" PRIMARY KEY ("UserId"),
    CONSTRAINT "FK_UserPrivacySettings_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id")
);

CREATE TABLE "UserSessions" (
    "Id" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "DeviceName" text NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "LastActivityAt" timestamp with time zone NOT NULL,
    "RevokedAt" timestamp with time zone,
    CONSTRAINT "PK_UserSessions" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_UserSessions_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id")
);

CREATE TABLE "AccountAppeals" (
    "Id" uuid NOT NULL,
    "SuspensionId" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "Reason" text NOT NULL,
    "Status" text NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "ReviewedByAdminId" uuid,
    "ReviewedAt" timestamp with time zone,
    "ReviewNote" text,
    CONSTRAINT "PK_AccountAppeals" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_AccountAppeals_AccountSuspensions_SuspensionId" FOREIGN KEY ("SuspensionId") REFERENCES "AccountSuspensions" ("Id"),
    CONSTRAINT "FK_AccountAppeals_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id")
);

CREATE TABLE "GroupInviteLinks" (
    "Id" uuid NOT NULL,
    "ConversationId" uuid NOT NULL,
    "CreatedByMembershipId" uuid NOT NULL,
    "TokenHash" text NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "ExpiresAt" timestamp with time zone,
    "RevokedAt" timestamp with time zone,
    CONSTRAINT "PK_GroupInviteLinks" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_GroupInviteLinks_ConversationMembers_CreatedByMembershipId" FOREIGN KEY ("CreatedByMembershipId") REFERENCES "ConversationMembers" ("Id"),
    CONSTRAINT "FK_GroupInviteLinks_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations" ("Id")
);

CREATE TABLE "GroupPins" (
    "Id" uuid NOT NULL,
    "ConversationId" uuid NOT NULL,
    "MessageId" uuid NOT NULL,
    "PinnedByUserId" uuid NOT NULL,
    "PinnedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_GroupPins" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_GroupPins_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations" ("Id"),
    CONSTRAINT "FK_GroupPins_Messages_MessageId" FOREIGN KEY ("MessageId") REFERENCES "Messages" ("Id")
);

CREATE TABLE "MessageDeliveries" (
    "MessageId" uuid NOT NULL,
    "RecipientUserId" uuid NOT NULL,
    "DeliveredAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_MessageDeliveries" PRIMARY KEY ("MessageId", "RecipientUserId"),
    CONSTRAINT "FK_MessageDeliveries_Messages_MessageId" FOREIGN KEY ("MessageId") REFERENCES "Messages" ("Id")
);

CREATE TABLE "MessageEditHistories" (
    "Id" uuid NOT NULL,
    "MessageId" uuid NOT NULL,
    "Version" integer NOT NULL,
    "PreviousContent" text NOT NULL,
    "EditedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_MessageEditHistories" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_MessageEditHistories_Messages_MessageId" FOREIGN KEY ("MessageId") REFERENCES "Messages" ("Id")
);

CREATE TABLE "MessageReactions" (
    "Id" uuid NOT NULL,
    "MessageId" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "Emoji" text NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_MessageReactions" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_MessageReactions_Messages_MessageId" FOREIGN KEY ("MessageId") REFERENCES "Messages" ("Id")
);

CREATE TABLE "MessageUserStates" (
    "MessageId" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "DeletedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_MessageUserStates" PRIMARY KEY ("MessageId", "UserId"),
    CONSTRAINT "FK_MessageUserStates_Messages_MessageId" FOREIGN KEY ("MessageId") REFERENCES "Messages" ("Id")
);

CREATE TABLE "ReportEvidences" (
    "Id" uuid NOT NULL,
    "ReportId" uuid NOT NULL,
    "SourceMessageId" uuid,
    "EvidenceContent" text,
    "StoredFileId" uuid,
    "CapturedAt" timestamp with time zone NOT NULL,
    "RetainUntil" timestamp with time zone,
    "LegalHold" boolean NOT NULL,
    CONSTRAINT "PK_ReportEvidences" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_ReportEvidences_Reports_ReportId" FOREIGN KEY ("ReportId") REFERENCES "Reports" ("Id")
);

CREATE TABLE "MessageAttachments" (
    "Id" uuid NOT NULL,
    "MessageId" uuid NOT NULL,
    "StoredFileId" uuid NOT NULL,
    "DisplayOrder" integer NOT NULL,
    CONSTRAINT "PK_MessageAttachments" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_MessageAttachments_Messages_MessageId" FOREIGN KEY ("MessageId") REFERENCES "Messages" ("Id"),
    CONSTRAINT "FK_MessageAttachments_StoredFiles_StoredFileId" FOREIGN KEY ("StoredFileId") REFERENCES "StoredFiles" ("Id")
);

CREATE TABLE "RefreshTokens" (
    "Id" uuid NOT NULL,
    "SessionId" uuid NOT NULL,
    "TokenHash" text NOT NULL,
    "ExpiresAt" timestamp with time zone NOT NULL,
    "RevokedAt" timestamp with time zone,
    "ReplacedByTokenId" uuid,
    CONSTRAINT "PK_RefreshTokens" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_RefreshTokens_UserSessions_SessionId" FOREIGN KEY ("SessionId") REFERENCES "UserSessions" ("Id")
);

CREATE INDEX "IX_AccountAppeals_SuspensionId" ON "AccountAppeals" ("SuspensionId");

CREATE INDEX "IX_AccountAppeals_UserId" ON "AccountAppeals" ("UserId");

CREATE INDEX "IX_AccountSuspensions_AdminId" ON "AccountSuspensions" ("AdminId");

CREATE INDEX "IX_AccountSuspensions_UserId" ON "AccountSuspensions" ("UserId");

CREATE INDEX "IX_AdminAuditLogs_AdminUserId" ON "AdminAuditLogs" ("AdminUserId");

CREATE INDEX "IX_AdminAuditLogs_CreatedAt" ON "AdminAuditLogs" ("CreatedAt");

CREATE UNIQUE INDEX "IX_AuthTokens_TokenHash" ON "AuthTokens" ("TokenHash");

CREATE INDEX "IX_AuthTokens_UserId" ON "AuthTokens" ("UserId");

CREATE UNIQUE INDEX "IX_ConversationMembers_ConversationId_UserId" ON "ConversationMembers" ("ConversationId", "UserId") WHERE "LeftAt" IS NULL;

CREATE INDEX "IX_ConversationMembers_UserId" ON "ConversationMembers" ("UserId");

CREATE INDEX "IX_ConversationUserStates_UserId" ON "ConversationUserStates" ("UserId");

CREATE UNIQUE INDEX "IX_FriendRequests_PairUserId1_PairUserId2" ON "FriendRequests" ("PairUserId1", "PairUserId2") WHERE "Status" = 'Pending';

CREATE INDEX "IX_FriendRequests_ReceiverUserId" ON "FriendRequests" ("ReceiverUserId");

CREATE INDEX "IX_FriendRequests_SenderUserId" ON "FriendRequests" ("SenderUserId");

CREATE UNIQUE INDEX "IX_Friendships_UserId1_UserId2" ON "Friendships" ("UserId1", "UserId2") WHERE "RemovedAt" IS NULL;

CREATE INDEX "IX_Friendships_UserId2" ON "Friendships" ("UserId2");

CREATE INDEX "IX_GroupInvitations_ConversationId" ON "GroupInvitations" ("ConversationId");

CREATE INDEX "IX_GroupInvitations_InviteeUserId_Status_CreatedAt" ON "GroupInvitations" ("InviteeUserId", "Status", "CreatedAt");

CREATE INDEX "IX_GroupInviteLinks_ConversationId" ON "GroupInviteLinks" ("ConversationId");

CREATE INDEX "IX_GroupInviteLinks_CreatedByMembershipId" ON "GroupInviteLinks" ("CreatedByMembershipId");

CREATE UNIQUE INDEX "IX_GroupInviteLinks_TokenHash" ON "GroupInviteLinks" ("TokenHash");

CREATE UNIQUE INDEX "IX_GroupPins_ConversationId_MessageId" ON "GroupPins" ("ConversationId", "MessageId");

CREATE INDEX "IX_GroupPins_MessageId" ON "GroupPins" ("MessageId");

CREATE UNIQUE INDEX "IX_MessageAttachments_MessageId_DisplayOrder" ON "MessageAttachments" ("MessageId", "DisplayOrder");

CREATE INDEX "IX_MessageAttachments_StoredFileId" ON "MessageAttachments" ("StoredFileId");

CREATE UNIQUE INDEX "IX_MessageEditHistories_MessageId_Version" ON "MessageEditHistories" ("MessageId", "Version");

CREATE UNIQUE INDEX "IX_MessageReactions_MessageId_UserId" ON "MessageReactions" ("MessageId", "UserId");

CREATE INDEX "IX_MessageRequests_ConversationId" ON "MessageRequests" ("ConversationId");

CREATE INDEX "IX_MessageRequests_ReceiverUserId_Status_CreatedAt" ON "MessageRequests" ("ReceiverUserId", "Status", "CreatedAt");

CREATE UNIQUE INDEX "IX_Messages_ConversationId_Sequence" ON "Messages" ("ConversationId", "Sequence");

CREATE UNIQUE INDEX "IX_Messages_SenderUserId_ClientMessageId" ON "Messages" ("SenderUserId", "ClientMessageId");

CREATE INDEX "IX_Notifications_RecipientUserId_CreatedAt" ON "Notifications" ("RecipientUserId", "CreatedAt");

CREATE UNIQUE INDEX "IX_PrivateConversationPairs_UserId1_UserId2" ON "PrivateConversationPairs" ("UserId1", "UserId2");

CREATE INDEX "IX_RefreshTokens_SessionId" ON "RefreshTokens" ("SessionId");

CREATE UNIQUE INDEX "IX_RefreshTokens_TokenHash" ON "RefreshTokens" ("TokenHash");

CREATE INDEX "IX_ReportEvidences_ReportId" ON "ReportEvidences" ("ReportId");

CREATE INDEX "IX_Reports_ReporterUserId" ON "Reports" ("ReporterUserId");

CREATE INDEX "IX_Reports_Status_CreatedAt" ON "Reports" ("Status", "CreatedAt");

CREATE UNIQUE INDEX "IX_StoredFiles_StorageKey" ON "StoredFiles" ("StorageKey");

CREATE INDEX "IX_StoredFiles_UploadedByUserId" ON "StoredFiles" ("UploadedByUserId");

CREATE INDEX "IX_UserBlocks_BlockedUserId" ON "UserBlocks" ("BlockedUserId");

CREATE UNIQUE INDEX "IX_UserBlocks_BlockerUserId_BlockedUserId" ON "UserBlocks" ("BlockerUserId", "BlockedUserId") WHERE "UnblockedAt" IS NULL;

CREATE UNIQUE INDEX "IX_Users_NormalizedEmail" ON "Users" ("NormalizedEmail");

CREATE UNIQUE INDEX "IX_Users_NormalizedUsername" ON "Users" ("NormalizedUsername");

CREATE INDEX "IX_UserSessions_UserId" ON "UserSessions" ("UserId");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20261030161251_InitialPostgres', '10.0.12');

COMMIT;

