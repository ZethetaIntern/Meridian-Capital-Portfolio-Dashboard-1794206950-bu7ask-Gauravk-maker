# Meridian Capital — Portfolio Analytics Dashboard

A React 18 + TypeScript portfolio analytics dashboard built against the supplied Portfolio Analytics Dashboard assignment. It is an assessment/demo application: all portfolio positions, news, prices and performance series are synthetic. It is **not** connected to a broker, exchange, SEBI reporting system or live financial data provider.

## Requirements
- Node.js 20.19+ or 22.12+
- npm 10+
- VS Code (recommended)

## Run on Windows (PowerShell)
```powershell
# 1. Extract the ZIP and open this folder in VS Code
cd path\to\meridian-dashboard

# 2. Install dependencies (internet is required the first time)
npm install

# 3. Start the dashboard
npm run dev
```
Open the local URL printed by Vite (normally `http://localhost:5173`).

## Run the optional WebSocket simulator
Open a second terminal in the project folder:
```powershell
npm run dev:stream
```
Copy `.env.example` to `.env`, keep `VITE_MARKET_WS_URL=ws://localhost:3001`, then restart `npm run dev`. The browser connects to the local mock WebSocket server. If it cannot connect, the browser-side simulator automatically falls back to polling. Without `.env`, the local polling simulator is used.

## Quality commands
```powershell
npm run test
npm run test:coverage
npm run build
npm run lint
npm run storybook
```
`npm run build` runs TypeScript project checks before the Vite production build. `npm run test:coverage` writes a coverage report to `coverage/`.

## Implemented features
- 12 dashboard panels: asset allocation, NAV/performance vs benchmark, sector heat map, searchable/sortable holdings with CSV export, market news, dismissible alerts, VaR, correlation matrix, Brinson attribution, market ticker, drawdown analysis and exposure treemap.
- Responsive drag/resize grid using React Grid Layout; remove and add widgets; search widget catalogue; save, import and export a schema-validated JSON layout; local preference persistence.
- Dark, light and high-contrast themes.
- TanStack Query refresh for portfolio summary, pause/resume controls and mock data timestamps.
- Optional WebSocket simulator plus local polling fallback; price ticks update matching holdings.
- Financial analytics functions: historical and parametric VaR, expected shortfall, Sharpe ratio, running drawdown / maximum drawdown, correlation and Brinson-Fachler attribution.
- Per-widget React error boundary, typed event bus, widget registry and Storybook gallery stories.
- Unit/component tests for registry, serializer, event bus, widgets, financial analytics and stream handling.

## Project structure
```text
server/                 Optional Node WebSocket mock server
src/
  __tests__/             Vitest tests
  components/            Shared UI and widget error boundary
  data/                  Mock portfolio data, query API, event bus
  finance/                Pure financial analytics calculations
  hooks/                  Clock and market stream hooks
  layout/                 Zod-validated layout import/export
  realtime/               Browser mock stream and tick helpers
  registry/               Widget definitions and built-in registration
  store/                  Persisted Zustand dashboard state
  types/                  Shared TypeScript contracts
  widgets/                Twelve widget implementations
```

## Financial methodology notes
- Historical VaR sorts the observed portfolio loss series and selects the empirical confidence quantile. Expected shortfall is the average tail loss at or beyond that threshold.
- Parametric VaR uses sample standard deviation, a normal quantile for supported confidence levels, and square-root-of-time scaling. It is an illustrative normal-model estimate, not a validated risk-engine output.
- Sharpe ratio annualises daily excess returns using the configured annual risk-free rate and trading-day count.
- Drawdown is current value divided by the running peak minus one.
- Brinson-Fachler allocation, selection and interaction effects are calculated by sector. Inputs and results are synthetic.
- Correlations are Pearson correlations of generated daily return series; lookback options are provided in the widget.

## Important scope and verification disclosures
This repository is a runnable front-end prototype, not an institutional production trading system. It uses synthetic static portfolio series and a local simulator. It does not provide authentication/roles, a real market-data adapter, server-side shared layouts/version history, persistent server storage, compliance controls, investment advice or trade execution. Storybook has a gallery with one story per widget; it does not claim 90% component coverage. WCAG 2.1 AA, Lighthouse >85, <100ms end-to-end data latency, 55+ FPS, <50KB layout limits and >70% coverage must be measured in the target environment before claiming those acceptance criteria. See `PERFORMANCE.md`, `ARCHITECTURE.md` and `TESTING.md`.

## Troubleshooting
- `npm install` needs registry access. If your network blocks npm, retry on a stable connection; do not delete `package-lock.json` if one is generated.
- If port 5173 is busy, Vite will print another local URL.
- If port 3001 is busy, set `WS_PORT=3002` in `.env` and update `VITE_MARKET_WS_URL=ws://localhost:3002`.
- If the WebSocket is unavailable, the browser stream falls back to simulated polling.
