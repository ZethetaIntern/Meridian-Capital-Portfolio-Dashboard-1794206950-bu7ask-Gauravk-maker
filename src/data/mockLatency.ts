
export type MockLatencyProfile = "fast" | "normal" | "slow";

export const MOCK_LATENCY: Record<MockLatencyProfile, number> = {
  fast: 50,
  normal: 200,
  slow: 500,
};

/**
 * Simulates network latency for mock API responses.
 */
export function simulateMockLatency<T>(
  data: T,
  profile: MockLatencyProfile = "normal",
): Promise<T> {
  const delay = MOCK_LATENCY[profile];

  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve(data);
    }, delay);
  });
}
