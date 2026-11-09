import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const streamMocks = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  setStatus: null as ((status: string) => void) | null,
  onTick: null as ((tick: unknown) => void) | null,
}));

vi.mock("../realtime/mockStream", () => ({
  MockMarketStream: class {
    constructor(
      onTick: (tick: unknown) => void,
      onStatus: (status: string) => void,
    ) {
      streamMocks.onTick = onTick;
      streamMocks.setStatus = onStatus;
    }

    connect = streamMocks.connect;
    disconnect = streamMocks.disconnect;
    pause = streamMocks.pause;
    resume = streamMocks.resume;
  },
}));

import { useMarketStream } from "./useMarketStream";

describe("useMarketStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    streamMocks.setStatus = null;
    streamMocks.onTick = null;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("starts the market stream and returns connecting status", () => {
    const { result } = renderHook(() => useMarketStream(false));

    expect(result.current).toBe("connecting");
    expect(streamMocks.connect).toHaveBeenCalledTimes(1);
  });

  it("updates status when the stream reports a new status", () => {
    const { result } = renderHook(() => useMarketStream(false));

    act(() => {
      streamMocks.setStatus?.("live");
    });

    expect(result.current).toBe("live");
  });

  it("pauses the stream when paused becomes true", () => {
    const { rerender } = renderHook(
      ({ paused }) => useMarketStream(paused),
      {
        initialProps: { paused: false },
      },
    );

    rerender({ paused: true });

    expect(streamMocks.pause).toHaveBeenCalledTimes(1);
  });

  it("resumes the stream when paused becomes false", () => {
    const { rerender } = renderHook(
      ({ paused }) => useMarketStream(paused),
      {
        initialProps: { paused: true },
      },
    );

    rerender({ paused: false });

    expect(streamMocks.resume).toHaveBeenCalled();
  });

  it("disconnects the stream when the hook unmounts", () => {
    const { unmount } = renderHook(() => useMarketStream(false));

    unmount();

    expect(streamMocks.disconnect).toHaveBeenCalledTimes(1);
  });

  it("does not recreate the stream when paused state changes", () => {
    const { rerender } = renderHook(
      ({ paused }) => useMarketStream(paused),
      {
        initialProps: { paused: false },
      },
    );

    rerender({ paused: true });
    rerender({ paused: false });

    expect(streamMocks.connect).toHaveBeenCalledTimes(1);
  });
});