# ChitChat Frontend — Feature-Based UI Refactor

## Highlights
- Each feature owns `api`, `pages`, `components` and optional `hooks`, `contexts`, `store`, `types`, `utils`.
- `src/shared/components/AppShell.jsx` unifies navigation for feature pages.
- `src/shared/contexts/ThemeContext.jsx` and `src/shared/components/ThemeToggle.jsx` implement light/dark mode with localStorage preference and system default.
- `src/index.css` retains legacy styles needed by existing component markup; `src/design.css` layers modern visual tokens and dual-scheme styling. Tailwind utilities are used in new shared components and updated feature roots.
- APIs and SignalR event names are preserved. This is a visual and folder refactor, not a migration of backend contracts.
- `/api` and `/hubs` Vite proxies point to **127.0.0.1:5089**. Frontend port **5174**.

## Start on Windows
```powershell
cd frontend
npm ci
npm run build
npm run lint
npm run dev
```

## Testing checklist
- Auth: login, register, verify, forgot/reset, reactivate, logout.
- Settings: profile fields, privacy changes; Account: sessions, change password.
- Friends/requests: send, accept, reject, block/search.
- Chat/Groups: initial conversation, send, reply, forward, edit, delete, recall, attachments, reactions, mute, realtime, read cursor and typing.
- Notifications, reporting, admin and appeal.
- Theme switch and refresh persistence on every route; mobile viewport usability.

## Verification limits
- All local static relative imports were checked against moved source files.
- Node JS syntax check passed for representative JS modules.
- `npm run build` could not complete in the processing environment because `vite` is unavailable and npm dependencies could not be installed. **Run npm ci and build on your Windows machine.**
- Existing business logic is intentionally retained and may have pre-existing issues; theme visual QA and E2E have not been executed.

## Folder policy
The `README.md` placeholders in optional empty feature folders document intended placement; folders are not populated with unused code. In this JavaScript project, `types/` documents potential JSDoc contracts rather than TypeScript stubs.
