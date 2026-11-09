import {describe,it,expect,vi} from 'vitest';
import {applyPriceTick,MockMarketStream} from '../realtime/mockStream';
import {holdings} from '../data/mockData';
describe('mock market stream',()=>{
 it('applies a price tick immutably',()=>{const next=applyPriceTick(holdings,{ticker:'TCS',price:4000,changePct:2,timestamp:1,sequence:1});expect(next.find(h=>h.ticker==='TCS')?.price).toBe(4000);expect(holdings.find(h=>h.ticker==='TCS')?.price).toBe(3921);});
 it('starts polling and disconnects cleanly',()=>{vi.useFakeTimers();const statuses:string[]=[];const ticks=vi.fn();const stream=new MockMarketStream(ticks,s=>statuses.push(s),100);stream.connect();vi.advanceTimersByTime(110);expect(ticks).toHaveBeenCalled();stream.pause();stream.resume();stream.disconnect();expect(statuses).toContain('polling');expect(statuses).toContain('disconnected');vi.useRealTimers();});
});
