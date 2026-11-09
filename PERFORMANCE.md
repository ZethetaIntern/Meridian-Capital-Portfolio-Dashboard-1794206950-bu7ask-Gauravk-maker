# Performance and reliability notes

The dashboard uses React components, Recharts, React Grid Layout and a small synthetic data set. Chart containers use `ResponsiveContainer`; chart series are generated once at module load rather than regenerated on each render. Financial calculations are pure functions and can be unit-tested independently. Widget error boundaries prevent one component exception from taking down the whole dashboard.

## Required measurement before an acceptance claim
The supplied assignment asks for sub-100ms widget updates, 55+ FPS drag interactions, Lighthouse above 85 and layout JSON below 50KB. These are measurement targets, not guaranteed values. Measure on the assessor's target hardware/browser:

1. Run `npm run build`, then `npm run preview` and use Lighthouse in Chrome DevTools.
2. Record drag/resize frame rate with Chrome Performance panel on the target 4K display and a realistic widget count.
3. Instrument receipt of a tick through the visible widget update using `performance.now()` and report p50/p95 over at least 1,000 events.
4. Export representative layout JSON and check `new Blob([json]).size` against 50KB.
5. Profile memory and verify event listeners, timers and WebSocket connections are released after unmount.

No FPS, Lighthouse, latency or bundle-size benchmark is claimed in this repository because those measurements depend on runtime hardware and have not been performed here.
