import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
export function MetricCard({eyebrow,value,sub,icon,tone='neutral',symbol}:{eyebrow:string;value:string;sub:string;icon:'receipt'|'check'|'cross'|'clock';tone?:'neutral'|'success'|'danger'|'warning';symbol?:ReactNode}) {
  return <article className="metric-card"><div className="metric-head"><span>{eyebrow}</span><span className={`metric-icon metric-${tone}`}><Icon name={icon} size={19}/></span></div><div className="metric-value">{value}{symbol}</div><div className="metric-foot">{sub}</div></article>;
}
