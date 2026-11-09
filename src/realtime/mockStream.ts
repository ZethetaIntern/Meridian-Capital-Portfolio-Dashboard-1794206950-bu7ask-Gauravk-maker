
import type { Holding } from "../types/widget";

export interface PriceTick {
  ticker: string;
  price: number;
  changePct: number;
  timestamp: number;
  sequence: number;
}

export type StreamStatus =
  | "connecting"
  | "live"
  | "polling"
  | "paused"
  | "disconnected";

export class MockMarketStream {
  private timer: number | undefined;
  private socket: WebSocket | undefined;
  private sequence = 0;
  private paused = false;

  constructor(
    private readonly onTick: (tick: PriceTick) => void,
    private readonly onStatus: (status: StreamStatus) => void,
    private readonly intervalMs = 2000,
    private readonly socketUrl?: string
  ) {}

  connect() {
    this.paused = false;
    this.onStatus("connecting");

    if (
      this.socketUrl &&
      typeof WebSocket !== "undefined"
    ) {
      try {
        this.socket = new WebSocket(this.socketUrl);

        this.socket.onopen = () => {
          this.stopPolling();
          this.onStatus("live");
        };

        this.socket.onmessage = (event) => {
          if (this.paused) return;

          try {
            const data = JSON.parse(String(event.data));

            if (
              typeof data.ticker === "string" &&
              Number.isFinite(data.price) &&
              Number.isFinite(data.changePct) &&
              Number.isFinite(data.timestamp) &&
              Number.isFinite(data.sequence)
            ) {
              this.onTick(data as PriceTick);
            }
          } catch {
            // Ignore invalid WebSocket messages.
          }
        };

        this.socket.onerror = () => {
          this.startPolling();
        };

        this.socket.onclose = () => {
          if (!this.paused) {
            this.startPolling();
          }
        };

        return;
      } catch {
        this.startPolling();
        return;
      }
    }

    this.startPolling();
  }

  private startPolling() {
    if (this.paused || this.timer !== undefined) return;

    this.onStatus("polling");

    const basePrices: Record<string, number> = {
      RELIANCE: 1284.5,
      TCS: 3921,
      INFY: 1842.6,
      HDFCBANK: 1765.2,
      NIFTY: 24328,
    };

    this.timer = window.setInterval(() => {
      if (this.paused) return;

      Object.entries(basePrices).forEach(([ticker, base]) => {
        const change =
          Math.sin((this.sequence + ticker.length) * 1.7) *
          0.0015;

        this.onTick({
          ticker,
          price: Number((base * (1 + change)).toFixed(2)),
          changePct: change * 100,
          timestamp: Date.now(),
          sequence: ++this.sequence,
        });
      });
    }, this.intervalMs);
  }

  private stopPolling() {
    if (this.timer !== undefined) {
      window.clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  pause() {
    this.paused = true;
    this.stopPolling();
    this.onStatus("paused");
  }

  resume() {
    this.paused = false;

    if (
      this.socket &&
      this.socket.readyState === WebSocket.OPEN
    ) {
      this.onStatus("live");
      return;
    }

    if (
      this.socket &&
      this.socket.readyState === WebSocket.CONNECTING
    ) {
      this.onStatus("connecting");
      return;
    }

    this.startPolling();
  }

  disconnect() {
    this.paused = true;
    this.stopPolling();

    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;

      this.socket.close();
      this.socket = undefined;
    }

    this.onStatus("disconnected");
  }
}

export function applyPriceTick(
  holdings: Holding[],
  tick: PriceTick
): Holding[] {
  return holdings.map((holding) =>
    holding.ticker === tick.ticker
      ? {
          ...holding,
          price: tick.price,
          marketValue: holding.quantity * tick.price,
          pnl: tick.changePct,
        }
      : holding
  );
}
