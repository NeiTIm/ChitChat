# ChitChat UI refactor (incremental, compatibility-preserving)

React 19 / Vite 8 / Tailwind 4. Reusable shadcn-inspired primitive components are in src/components/ui (local implementations; not installed Radix/shadcn official distribution). All original API, auth session and SignalR calls have been preserved. Current pages retain portions of legacy CSS for compatibility, so this is NOT a complete 100%-Tailwind/shadcn migration.

Theme uses the `.dark` class, Tailwind `@custom-variant dark` and localStorage. UI baseline updated across all JSX files with Tailwind classes; authentication was entirely redesigned.

To run on Windows: npm ci ; npm run build ; npm run dev. Proxy remains 5174 -> 5089. No backend/database files included.

Remaining work: fully replace legacy semantic CSS selectors in existing business feature pages, wire toast hook to every action, replace text loading states by skeleton components across all states, implement official shadcn/Radix components and test end-to-end.
