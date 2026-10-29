# ChitChat — WebChat.Api + React

This is the feature-first **folder restructuring** of the supplied WebChat project. The root folder is `ChitChat` while the backend assembly remains `WebChat.Api`, the SQL database target remains `WebChatCodexDb`, and the existing HTTP/SignalR contracts remain unchanged.

**Architecture:** one ASP.NET Core 10 API project using feature folders and layered responsibility (controller → service → repository where introduced → EF Core); SQL Server / EF Core 10 / SignalR; React + Vite frontend. Features retain original namespaces to avoid breaking references during physical relocation. See [docs/architecture/FEATURE_LAYOUT.md](docs/architecture/FEATURE_LAYOUT.md) for detailed mappings, limitations, and verification commands.

**Security:** do not change or migrate another project's `WebChatDb`. Local application access is restricted to `localhost` / `WebChatCodexDb` through `DatabaseTarget`. No database migrations or external actions were executed during this ZIP restructuring. Generated files, `private-uploads`, `node_modules`, `bin`, `obj`, and secret files were omitted from the distributable archive.

## Original project notes

# WebChat

Local WebChat implementation following the frozen Q001–Q125 rules in `docs/spec/`. Private chat, message requests, groups, media, notifications and moderation use SQL Server and real APIs. Implementation status and acceptance gaps are recorded in `docs/roadmap.md`; the project is not yet accepted as v1.0.

## Development

Requirements: .NET SDK 10, Node 22.12+ and npm, SQL Server 2022 on `localhost` with Windows Authentication. The only permitted database is `WebChatCodexDb`. Verify the configured target and inspect migration SQL before applying a new migration. Do not reset or delete database data.

```powershell
dotnet build WebChat.slnx
dotnet test WebChat.slnx
dotnet run --project backend/WebChat.Api --urls http://localhost:5080
```

In another terminal:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

The frontend uses `/api` and `/hubs/chat` through the Vite proxy. Open the Vite URL printed by `npm.cmd run dev`. Health: `GET http://localhost:5080/api/health`. Feature APIs and database migrations are tracked by phase in `docs/roadmap.md`.

Phase 02 Auth needs a JWT signing key stored outside the repository. On this workstation it has been generated in .NET User Secrets for `backend/WebChat.Api`; on another workstation, run `dotnet user-secrets init --project backend/WebChat.Api` and set `Jwt:Key` to a randomly generated value of at least 32 bytes. Do not put it in tracked `appsettings` or command history. Development verification/reset messages are written only to ignored `backend/WebChat.Api/private-uploads/dev-mail/`; production requires an email provider before auth is usable.

Import the Postman collections and example environment from `docs/postman/`. Fill synthetic account variables locally. Copy verification and reset tokens from the development mail pickup without committing them. The `WebChat.Security.postman_collection.json` smoke collection accepts `baseUrl` and a normal user's `accessToken`. Run with `npm.cmd exec --yes --package newman -- newman run docs/postman/WebChat.Security.postman_collection.json -e <ignored-local-environment.json>`. It checks authentication and selected negative authorization cases; broader Postman matrices remain open in the roadmap.

System Admin cannot self-promote through the API. Provision a local development Admin only through a reviewed, one-off operation on the verified `WebChatCodexDb` target; never publish Admin credentials or use a blanket role update. The admin console is `/admin`. A suspended user can authenticate to `/appeal` for a limited appeal session; an accepted appeal does not restore access automatically.

Automated regression: `dotnet test WebChat.slnx` from the repository root. With the local API running, `cd frontend; node scripts/realtime-smoke.mjs; node scripts/group-realtime-smoke.mjs; node scripts/status-realtime-smoke.mjs` exercises synthetic multi-account SignalR flows. Browser visual/reconnect and full Postman acceptance remain marked **NOT VERIFIED** until run. Uploaded files and development mail live under ignored `backend/WebChat.Api/private-uploads/` outside the public web root.
