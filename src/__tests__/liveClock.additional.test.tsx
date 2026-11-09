import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useLiveClock } from '../hooks/useLiveClock';
function ClockProbe(){const now=useLiveClock();return <output>{now.toISOString()}</output>}
describe('useLiveClock',()=>{
 afterEach(()=>vi.useRealTimers());
 it('returns a date immediately and updates on interval',()=>{
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  render(<ClockProbe/>); expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.getByText('2026-01-01T00:00:00.000Z')).toBeInTheDocument();
  act(()=>{vi.advanceTimersByTime(1000)});
  expect(screen.getByText('2026-01-01T00:00:01.000Z')).toBeInTheDocument();
 });
});
