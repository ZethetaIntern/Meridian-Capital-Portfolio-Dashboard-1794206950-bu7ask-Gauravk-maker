# Architecture

## Layers
1. **Presentation** — `App.tsx`, responsive React Grid Layout, shared cards, chart/table/feed panels, theme tokens and widget error boundaries.
2. **Widget framework** — `registry/widgetRegistry.ts` validates widget IDs and definitions; `registerBuiltins.tsx` registers the built-in catalogue; `data/eventBus.ts` provides typed cross-widget events.
3. **Data/realtime** — `data/api.ts` is the TanStack Query boundary; `data/mockData.ts` provides deterministic synthetic data; `realtime/` contains the browser simulator; `server/mock-ws.mjs` is the optional local WebSocket server.
4. **Domain analytics** — `finance/analytics.ts` contains pure financial calculations without UI dependencies.
5. **State/persistence** — Zustand persists theme, active widgets and feed preference; `layout/serializer.ts` validates import/export JSON with Zod.

## Widget lifecycle and isolation
Widgets are selected by stable IDs from the catalogue. Each visible widget is wrapped in `WidgetErrorBoundary`; a rendering failure replaces only that panel with a recovery message. `eventBus` uses typed event payloads and returns an unsubscribe callback from `on`.

## Data flow
TanStack Query fetches portfolio summary with a 10-second refresh while the feed is active. The optional WebSocket simulator broadcasts synthetic ticks; browser client falls back to a local two-second polling simulator when the socket cannot connect. `PRICE_TICK` events update matching rows in the holdings widget. The stream is paused/resumed with the dashboard control.

## Layout format
Layout JSON contains `version`, `name`, `theme`, and a list of `{i,x,y,w,h}` entries. Zod validates the import before the grid applies it. Local browser storage stores the current grid and Zustand preferences. This is local-device persistence, not server-side collaboration or version history.
