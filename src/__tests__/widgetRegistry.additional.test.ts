import { beforeEach, describe, expect, it } from 'vitest';
import { clearRegistry, getAllWidgets, getWidget, getWidgetsByCategory, registerWidget, unregisterWidget } from '../registry/widgetRegistry';
import type { WidgetDefinition } from '../types/widget';
const makeWidget = (id: string, category: WidgetDefinition['category']): WidgetDefinition => ({ id, name: id, description: `${id} description`, category, defaultSize: { w: 2, h: 2 }, minSize: { w: 1, h: 1 }, defaultConfig: {}, component: () => null, dataSource: { refreshMs: 1000 } });
beforeEach(() => clearRegistry());
describe('widget registry behavior', () => {
  it('registers and retrieves a widget', () => { const item = makeWidget('sample', 'CHART'); registerWidget(item); expect(getWidget('sample')).toBe(item); expect(getAllWidgets()).toEqual([item]); });
  it('rejects duplicate IDs and supports category filtering', () => { registerWidget(makeWidget('a', 'CHART')); registerWidget(makeWidget('b', 'FEED')); expect(() => registerWidget(makeWidget('a', 'TABLE'))).toThrow(/already registered/); expect(getWidgetsByCategory('CHART').map(x => x.id)).toEqual(['a']); });
  it('returns false for missing unregister and true for registered item', () => { expect(unregisterWidget('missing')).toBe(false); registerWidget(makeWidget('a', 'TABLE')); expect(unregisterWidget('a')).toBe(true); expect(getWidget('a')).toBeUndefined(); });
});
