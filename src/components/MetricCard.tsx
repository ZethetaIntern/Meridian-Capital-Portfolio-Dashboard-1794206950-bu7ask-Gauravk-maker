import type { ReactNode } from 'react';
interface MetricCardProps { label:string; value:string; trend?:string; icon?:ReactNode; }
export function MetricCard({label,value,trend,icon}:MetricCardProps){return <section className="summary-card" aria-label={label}><div className="metric-top"><span>{label}</span>{icon}</div><strong>{value}</strong>{trend&&<div className="metric-bottom"><span className="positive">{trend}</span></div>}</section>;}
