Chat state is currently held in ChatPage and the existing SignalR lifecycle. Introduce a store only when shared state requires it; avoid duplicate sources of truth.
