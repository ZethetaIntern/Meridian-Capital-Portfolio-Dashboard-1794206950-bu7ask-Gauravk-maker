import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard } from '../components/MetricCard';
import { WidgetErrorBoundary } from '../components/WidgetErrorBoundary';

function Crasher({ crash = true }: { crash?: boolean }) {
  if (crash) throw new Error('intentional test failure');
  return <span>Recovered child</span>;
}

describe('MetricCard', () => {
  it('renders label and value without optional trend or icon', () => {
    render(<MetricCard label="Assets under management" value="$45.00B" />);
    expect(screen.getByRole('region', {name:'Assets under management'})).toBeInTheDocument();
    expect(screen.getByText('$45.00B')).toBeInTheDocument();
    expect(document.querySelector('.metric-bottom')).toBeNull();
  });
  it('renders optional trend and icon', () => {
    render(<MetricCard label="Daily P&L" value="+$12.45M" trend="+0.28%" icon={<span data-testid="metric-icon">icon</span>} />);
    expect(screen.getByText('+0.28%')).toBeInTheDocument();
    expect(screen.getByTestId('metric-icon')).toBeInTheDocument();
  });
});

describe('WidgetErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(<WidgetErrorBoundary><Crasher crash={false}/></WidgetErrorBoundary>);
    expect(screen.getByText('Recovered child')).toBeInTheDocument();
  });
  it('shows fallback and supports retry', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<WidgetErrorBoundary title="Holdings"><Crasher /></WidgetErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent('Holdings unavailable');
    expect(screen.getByText(/Other dashboard widgets are still running/)).toBeInTheDocument();
    screen.getByRole('button', {name:'Try again'}).click();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    spy.mockRestore();
  });
  it('uses generic title when title is omitted', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<WidgetErrorBoundary><Crasher /></WidgetErrorBoundary>);
    expect(screen.getByText('Widget unavailable')).toBeInTheDocument();
    spy.mockRestore();
  });
});
