# ChitChat frontend — Feature API refactor

This frontend separates HTTP endpoints into `src/features/<feature>/api/<feature>Api.js` and a shared Axios client at `src/shared/api/apiClient.js`. React components call the feature API functions. The API functions return Axios responses to preserve the current component behavior and error handling.

## Isolation

- Vite development frontend: `http://localhost:5174`
- API proxy: `/api` -> `http://127.0.0.1:5089`
- SignalR proxy: `/hubs` -> `http://127.0.0.1:5089` (websocket enabled)
- Database target is configured in the backend, **not** in the frontend. Confirm the refactored backend exclusively uses `WebChatCodexDb_Refactor`.

## Setup

Run `npm ci` then `npm run dev`. Run `npm run build` and `npm run lint` after installation.

## Design notes

- Existing React components, UI behavior, auth session handling, and SignalR connections remain in their previous locations.
- HTTP call sites have been moved into per-feature APIs. `usersApi.request()` and `friendsApi.request()` retain generic request shapes used for dynamic settings/actions; these can be replaced with named methods in a subsequent incremental cleanup.
- This stage does not redesign state management, centralize SignalR, or change the backend API contract.
- Do not overwrite your original frontend folder before verifying features. Backup it and test the refactored copy first.
