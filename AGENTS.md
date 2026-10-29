<!-- RESTRUCTURE NOTE: This is a copy under the ChitChat project root. The original path F:\Learn\Codex\WebChat below describes the source workspace, not permission to edit either that old workspace or unrelated repositories. Confirm the current ChitChat workspace path with the user before allowing an autonomous agent to make filesystem changes. -->
# WebChat — Repository Execution Policy (EXECUTION-READY)

> Status: **EXECUTION-READY POLICY**. This file alone does not authorize work. The user authorizes non-destructive implementation only when they explicitly submit the WebChat Codex Master Prompt in the Codex Extension. This approval does not authorize destructive migrations, production deployment, remote Git operations, privileged exceptions or unrelated-system access.

## 1. Project scope and authoritative sources

- **Allowed project root:** `F:\Learn\Codex\WebChat` on the user's Windows machine. The user has shown a VS Code Explorer screenshot confirming the root contains `AGENTS.md` and `docs/spec/` with 14 Markdown files. Do not alter neighboring or legacy repositories.
- **Backend:** .NET 10 ASP.NET Core Web API, EF Core 10, SQL Server 2022, SignalR; one `WebChat.Api` Layered Architecture + Feature Folders; separate xUnit tests. Repositories are optional where justified; avoid CQRS/MediatR/microservices without a documented requirement.
- **Frontend:** ReactJS + Vite, JavaScript/JSX, Tailwind CSS v4, React Router, Axios, Lucide and SignalR client. Keep a consistent Messenger-style responsive UI.
- **Canonical business requirements:** `docs/spec/01-business-requirements.md`, frozen decisions **Q001–Q125**. Later, more specific business decisions override conflicting earlier general decisions; business rules override technical suggestions.
- **Architecture and design sources:** `docs/spec/02-architecture.md`, `03-database-spec.md`, `04-permission-matrix.md`, `05-rest-api-contract.md`, `06-signalr-contract.md`, `07-implementation-roadmap.md`, `09-final-consistency-audit.md`, `11-final-policy-freeze.md`, `12-requirements-traceability.md`.
- **Observed environment information:** `docs/spec/13-environment-preflight-verified.md` supersedes the stale _unknown/unverified status_ in `docs/spec/10-new-database-preflight.md`, without relaxing any database safety rules.
- Before planning a phase, read relevant specs and check dependencies; do not silently invent or override user decisions. Record any genuinely unresolved blocker in `docs/roadmap.md`.

## 2. Absolute safety boundaries

- **Protected legacy database:** `WebChatDb` belongs to another project. **Never connect to it from this app, query its business data, migrate, seed, reset, delete, back up over, or modify it.** Its name may appear only as a protected identifier in docs or safe environment verification.
- **The only permitted application database:** `WebChatCodexDb` on `localhost` SQL Server via Windows Authentication. Before the first migration and before any destructive-risk action, verify the resolved server and database by read-only queries and fail closed if the name is not exactly `WebChatCodexDb`.
- User-confirmed preflight on **2026-10-28**: `WebChatCodexDb` is ONLINE with **0 user tables**. **Recheck** immediately before the initial migration; do not assume the state has remained unchanged.
- Do not use `EnsureDeleted`, `DROP DATABASE`, destructive resets, `TRUNCATE`, data-loss migrations, or risky seed operations. A brand-new additive migration to verified empty `WebChatCodexDb` may be performed only after implementation is explicitly authorized and targets are reverified; potentially destructive changes require separate user approval.
- Never read, write, reset or deploy unrelated systems or repositories. Do not access production services or use real user data without authorization.
- Do not create or expose secrets: no real keys/passwords in tracked files, console logs, commits or documentation. Use local-only configuration, development secret storage or environment variables. Keep private uploads outside public web root.
- Do not push to any Git remote, create releases, deploy, or publish without explicit permission. Local git commits/checkpoints are allowed **only if the user explicitly enables local commits**; never claim a commit/push was made without checking results.
- Never disable authorization, CSRF protections or tests merely to make a phase pass. Never grant System Admin unrestricted access to private messages.

## 3. Autonomous phase workflow (when implementation is authorized)

1. Start with `docs/spec/00-README.md`, `docs/spec/01-business-requirements.md`, this file and `docs/spec/07-implementation-roadmap.md`.
2. Maintain one working progress source at `docs/roadmap.md` with **Phase 00–14**, and mark phase state: `Not Started`, `In Progress`, `Implemented`, `Blocked`, or `Completed`.
3. Work in dependency order. Before editing, document the current phase, involved requirements Q IDs, affected files, database implications and acceptance checks.
4. Implement Backend, database, Frontend and tests for that slice, making reasonable local technical decisions consistent with frozen rules. Keep Controllers thin; put business rules and authorization in application Services; do not duplicate message logic in SignalR Hub.
5. Run applicable builds, automated tests and authorized smoke tests. Fix observed failures; do not fake passing output or substitute mocks for a required live integration.
6. Update `docs/roadmap.md`: changed files, tests/commands actually run, outcomes, relevant Q IDs, residual risks, and next phase. When a phase remains blocked, mark it `Blocked` rather than `Completed`.
7. Continue automatically to the next unblocked phase **only within the permission and tool limits of the current session**. If context/session stops, provide an exact resume point from documentation. Do not promise background execution beyond the active session.
8. Use the MVP Core checkpoint after Phase 07 and Full Scope checkpoint after Phase 14. MVP does not cancel advanced requirements.

## 4. Completion evidence

- `Implemented` means code exists; **`Completed` requires evidence**. Applicable backend/frontend builds must succeed, relevant xUnit tests pass, permissions/negative cases be exercised, and real integration be validated where tools permit.
- **Postman is the designated Backend API manual/collection testing tool.** For each endpoint, document method, URL, headers/auth, request body, expected response, and negative/authorization cases. If Postman or a compatible runner cannot be executed, mark **Not Verified** rather than claiming the API passed Postman testing.
- SignalR requires multi-account and multi-device scenarios, permission revocation, reconnection, replay recovery, Delivered ACK, Seen cursor and unread sync as relevant.
- Frontend must use real API contracts at acceptance, show loading/empty/error states and remain responsive; do not mark end-to-end complete based only on screenshots or mocked data.
- Maintain requirement-to-test traceability across Q001–Q125; avoid implementing a feature partially and marking it finished.

## 5. Authorization and business invariants

- All sensitive REST requests, Hub invocations, SignalR fanout and file previews/downloads verify **current** server-side permissions.
- Private Message Requests/rejection and private messaging permission are **direction-aware**: B rejecting A blocks A→B, but permits B to initiate; Unblock alone does not reinstate prior permissions. Accepted Message Requests do not auto-friend users.
- After a user hides a conversation, authorized new messages may resurface it, but previously hidden history remains hidden for that user. Different users' Delete for Me does not delete shared content.
- Group membership has historical intervals; deny access outside permitted intervals. Group cap is 100, verified atomically at acceptance.
- `Dissolved` group is read-only, including **no Recall (Q121)**. Former group members may Recall their own historical messages only in an **Active** group if their other access requirements are satisfied (Q113).
- Blocked users in a shared group may still Reply/Reaction under group authorization (Q124), but cannot direct-message, invite, or see each other's restricted Presence/Typing.
- All active group members may invite, modify group profile and pin messages; link management: Member owns their links, Owner/Admin may manage all. Only Owner demotes Group Admin; Owner transfers ownership before leaving. Kicked members need a newly created eligible invite/link for re-entry. `AllowGroupInvites=false` does not prevent voluntary valid-link join (Q125).
- Forwarded messages and forwarded media have independent permission lifecycles; Recall of source does not automatically recall authorized forwards. Edit changes text only within 15 minutes; Recall lifetime is unlimited **unless** group has dissolved.
- Delivered must be acknowledged by a recipient device; Seen only after actual viewing; account-wide read cursor is monotonic. Message Requests keep a separate badge; pending request Seen is hidden from the stranger sender.
- Admin Suspension is not SelfDeactivation. Suspended users may submit authenticated-limited appeals, never bypass suspension. Owner suspension does not auto-transfer ownership (Q122); absent an approved special workflow, **deny** exception transfer.
- Report evidence retained **90 days after resolution**, subject to lawful/effective hold; Admin Audit Logs retained **12 months**, with hold exceptions. Evidence access is case-scoped and audited.
- No per-day business quota on friend requests/stranger messages, but technical anti-abuse rate limiting and safe upload constraints remain mandatory.

## 6. Stop/escalation conditions

Stop the unsafe operation and report the exact blocker when:

- Target SQL Server/database is ambiguous or differs from `WebChatCodexDb`, or migration may delete/rewrite existing data.
- A spec conflict would alter privacy, ownership, group access or data retention and is not resolved by the Q-number precedence rules.
- External credentials, provider setup, destructive file actions, production deployment, remote Git operations or privileged exception approval are required.
- A required test cannot run or a failing test cannot be resolved safely; record accurate evidence and proceed with independent work if possible.

## 7. Expected reporting style

At each phase checkpoint, report: `Phase`, `State`, `Requirements covered`, `Changed files`, `Build/Test evidence`, `Security checks`, `Database impact`, `Blockers`, `Next phase`.

**This file is a durable repository policy. Submitting the separately provided WebChat Codex Master Prompt is the explicit implementation request. Do not start coding merely because this file is present.**
