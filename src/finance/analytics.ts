/** Pure financial analytics used by the dashboard. Returns are decimal (0.01 = 1%). */
export type VaRMethod = 'historical' | 'parametric';
export interface VaRResult { method: VaRMethod; confidence: number; horizonDays: number; value: number; expectedShortfall: number; observations: number; }

const assertReturns = (returns: number[]) => {
  if (!Array.isArray(returns) || returns.length < 2 || returns.some(v => !Number.isFinite(v))) {
    throw new Error('At least two finite return observations are required.');
  }
};
const quantile = (values: number[], p: number) => {
  const sorted = [...values].sort((a,b) => a-b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1));
  return sorted[index];
};
const mean = (xs: number[]) => xs.reduce((a,b)=>a+b,0)/xs.length;
const stdev = (xs: number[]) => { const m=mean(xs); return Math.sqrt(xs.reduce((s,x)=>s+(x-m)**2,0)/(xs.length-1)); };

/** Historical simulation VaR and average loss beyond the VaR threshold. */
export function historicalVaR(returns:number[], portfolioValue:number, confidence=.99, horizonDays=1):VaRResult {
  assertReturns(returns); validateRiskInputs(portfolioValue,confidence,horizonDays);
  const scaled=returns.map(r=>r*Math.sqrt(horizonDays));
  const loss=scaled.map(r=>-r*portfolioValue);
  const value=Math.max(0,quantile(loss,confidence));
  const tail=loss.filter(x=>x>=value);
  return {method:'historical',confidence,horizonDays,value,expectedShortfall:tail.length?Math.max(value,mean(tail)):value,observations:returns.length};
}
/** Parametric normal VaR. z-values are standard-normal quantiles for common confidence levels. */
export function parametricVaR(returns:number[], portfolioValue:number, confidence=.99, horizonDays=1):VaRResult {
  assertReturns(returns); validateRiskInputs(portfolioValue,confidence,horizonDays);
  const zTable:Record<number,number>={.90:1.2816,.95:1.6449,.975:1.96,.99:2.3263,.995:2.5758,.999:3.0902};
  const z=zTable[confidence]; if(!z) throw new Error('Supported confidence levels: 90%, 95%, 97.5%, 99%, 99.5%, 99.9%.');
  const dailyMean=mean(returns), sigma=stdev(returns), scale=Math.sqrt(horizonDays);
  const value=Math.max(0,(z*sigma-dailyMean*scale)*portfolioValue*scale);
  const phi=Math.exp(-z*z/2)/Math.sqrt(2*Math.PI);
  const expectedShortfall=Math.max(value,(sigma*phi/(1-confidence)-dailyMean*scale)*portfolioValue*scale);
  return {method:'parametric',confidence,horizonDays,value,expectedShortfall,observations:returns.length};
}
function validateRiskInputs(value:number,confidence:number,horizon:number){if(!Number.isFinite(value)||value<=0)throw new Error('Portfolio value must be positive.');if(confidence<=0||confidence>=1)throw new Error('Confidence must be between 0 and 1.');if(!Number.isInteger(horizon)||horizon<1)throw new Error('Horizon must be a positive whole number of days.');}

export interface DrawdownPoint { index:number; value:number; peak:number; drawdown:number; }
export function calculateDrawdowns(values:number[]):DrawdownPoint[]{if(values.length===0||values.some(v=>!Number.isFinite(v)||v<=0))throw new Error('Portfolio values must be positive finite numbers.');let peak=values[0];return values.map((value,index)=>{peak=Math.max(peak,value);return {index,value,peak,drawdown:(value/peak)-1};});}
export function maximumDrawdown(values:number[]):number{return Math.min(0,...calculateDrawdowns(values).map(p=>p.drawdown));}
export function sharpeRatio(returns:number[],annualRiskFreeRate=.065,tradingDays=252):number{assertReturns(returns);const dailyRf=Math.pow(1+annualRiskFreeRate,1/tradingDays)-1;const sd=stdev(returns);return sd===0?0:(mean(returns)-dailyRf)/sd*Math.sqrt(tradingDays);}
export interface BrinsonInput {sector:string;portfolioWeight:number;benchmarkWeight:number;portfolioReturn:number;benchmarkReturn:number;}
export interface BrinsonRow extends BrinsonInput {allocation:number;selection:number;interaction:number;total:number;}
/** Brinson-Fachler effects in decimal return units. */
export function brinsonAttribution(rows:BrinsonInput[],benchmarkReturn?:number):BrinsonRow[]{if(!rows.length)throw new Error('At least one sector is required.');const rb=benchmarkReturn??rows.reduce((s,r)=>s+r.benchmarkWeight*r.benchmarkReturn,0);return rows.map(r=>{const allocation=(r.portfolioWeight-r.benchmarkWeight)*(r.benchmarkReturn-rb);const selection=r.benchmarkWeight*(r.portfolioReturn-r.benchmarkReturn);const interaction=(r.portfolioWeight-r.benchmarkWeight)*(r.portfolioReturn-r.benchmarkReturn);return {...r,allocation,selection,interaction,total:allocation+selection+interaction};});}
export function correlation(a:number[],b:number[]):number{if(a.length!==b.length||a.length<2)throw new Error('Series must have equal length and at least two observations.');assertReturns(a);assertReturns(b);const ma=mean(a),mb=mean(b);const cov=a.reduce((s,x,i)=>s+(x-ma)*(b[i]-mb),0);const denom=Math.sqrt(a.reduce((s,x)=>s+(x-ma)**2,0)*b.reduce((s,x)=>s+(x-mb)**2,0));return denom===0?0:Math.max(-1,Math.min(1,cov/denom));}
