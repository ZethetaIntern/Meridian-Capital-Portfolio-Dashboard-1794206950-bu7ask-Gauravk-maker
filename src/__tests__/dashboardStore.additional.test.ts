import { beforeEach, describe, expect, it } from 'vitest';
import { useDashboardStore } from '../store/dashboardStore';

const defaults = ['allocation','performance','heatmap','holdings','news','alerts','var','correlation','attribution','ticker','drawdown','treemap'];

describe('dashboard store behavior', () => {
  beforeEach(() => useDashboardStore.getState().reset());
  it('starts with dark theme, default widgets, and unpaused feed', () => {
    const state = useDashboardStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.activeWidgets).toEqual(defaults);
    expect(state.paused).toBe(false);
  });
  it.each(['light','contrast','dark'] as const)('sets %s theme', theme => {
    useDashboardStore.getState().setTheme(theme);
    expect(useDashboardStore.getState().theme).toBe(theme);
  });
  it('adds a widget once and ignores duplicate ids', () => {
    const store = useDashboardStore.getState();
    store.addWidget('custom-widget');
    store.addWidget('custom-widget');
    expect(useDashboardStore.getState().activeWidgets.filter(x => x === 'custom-widget')).toHaveLength(1);
  });
  it('removes existing and unknown widget ids safely', () => {
    useDashboardStore.getState().removeWidget('allocation');
    useDashboardStore.getState().removeWidget('not-present');
    expect(useDashboardStore.getState().activeWidgets).not.toContain('allocation');
    expect(useDashboardStore.getState().activeWidgets).toHaveLength(11);
  });
  it('toggles paused state in both directions', () => {
    useDashboardStore.getState().togglePause();
    expect(useDashboardStore.getState().paused).toBe(true);
    useDashboardStore.getState().togglePause();
    expect(useDashboardStore.getState().paused).toBe(false);
  });
  it('reset restores defaults after changes', () => {
    const store = useDashboardStore.getState();
    store.setTheme('light'); store.addWidget('x'); store.togglePause(); store.reset();
    expect(useDashboardStore.getState()).toMatchObject({theme:'dark',activeWidgets:defaults,paused:false});
  });
});
