import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockMarketStream, applyPriceTick } from '../realtime/mockStream';
import { holdings } from '../data/mockData';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('market stream edge cases', () => {
  it('ignores ticks for unknown symbols and does not mutate original holdings', () => {
    const result = applyPriceTick(holdings, { ticker: 'UNKNOWN', price: 10, changePct: 1, timestamp: 1, sequence: 1 });
    expect(result).not.toBe(holdings);
    expect(result).toEqual(holdings);
  });
  it('does not emit ticks while paused, resumes polling, then clears interval on disconnect', () => {
    vi.useFakeTimers();
    const tick = vi.fn(); const status = vi.fn();
    const stream = new MockMarketStream(tick, status, 50);
    stream.connect(); vi.advanceTimersByTime(50); expect(tick).toHaveBeenCalledTimes(5);
    tick.mockClear(); stream.pause(); vi.advanceTimersByTime(100); expect(tick).not.toHaveBeenCalled();
    stream.resume(); vi.advanceTimersByTime(50); expect(tick).toHaveBeenCalledTimes(5);
    stream.disconnect(); tick.mockClear(); vi.advanceTimersByTime(100); expect(tick).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith('paused'); expect(status).toHaveBeenCalledWith('disconnected');
  });
  it('parses valid websocket messages and ignores malformed messages', () => {
    class FakeSocket {
      static OPEN = 1; static CONNECTING = 0; readyState = 0;
      onopen: (() => void) | null = null; onmessage: ((e: {data: string}) => void) | null = null;
      onerror: (() => void) | null = null; onclose: (() => void) | null = null;
      close = vi.fn(); constructor(public url: string) {}
    }
    vi.stubGlobal('WebSocket', FakeSocket);
    const tick = vi.fn(); const status = vi.fn();
    const stream = new MockMarketStream(tick, status, 50, 'ws://localhost');
    stream.connect();
    const socket = (stream as unknown as {socket: FakeSocket}).socket;
    socket.onopen?.(); socket.onmessage?.({data: '{"ticker":"TCS","price":1,"changePct":0,"timestamp":1,"sequence":1}'});
    socket.onmessage?.({data: 'not-json'});
    expect(status).toHaveBeenCalledWith('live'); expect(tick).toHaveBeenCalledTimes(1);
    stream.pause(); socket.onmessage?.({data: '{"ticker":"INFY"}'}); expect(tick).toHaveBeenCalledTimes(1);
    stream.disconnect(); expect(socket.close).toHaveBeenCalled();
  });
});
