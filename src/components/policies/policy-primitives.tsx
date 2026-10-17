import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { money } from '@/lib/format';
import type { PolicyAmountKey } from '@/lib/policy-store';

type PanelProps={children:ReactNode;className?:string;id?:string};
export function PolicyPanel({children,className='',id}:PanelProps){return <section className={`policy-panel ${className}`} id={id}>{children}</section>;}
export function PolicyEyebrow({children,number}:{children:ReactNode;number:string}){return <div className="policy-eyebrow"><span className="policy-eyebrow-line"/>{number}<span className="policy-eyebrow-slash">/</span>{children}</div>;}
export function PolicyPanelHeading({tag,title,description,icon}:{tag:string;title:string;description:string;icon:'shield'|'wallet'|'chart'|'audit'}){
  return <div className="policy-panel-heading"><span className="policy-panel-symbol"><Icon name={icon} size={20}/></span><div><p className="policy-panel-tag">{tag}</p><h2>{title}</h2><p className="policy-panel-subtitle">{description}</p></div></div>;
}
export function PolicyMoneyField({id,label,helper,value,onChange,invalid,field,disabled=false}:{id:string;label:string;helper:string;value:string;onChange:(value:string)=>void;invalid?:boolean;field:PolicyAmountKey;disabled?:boolean}){
 return <div className={`policy-money-field ${invalid?'policy-field-invalid':''}`}>
   <label htmlFor={id}>{label}</label>
   <div className="policy-money-control"><span>USD</span><input id={id} name={field} type="number" min={1} max={100000000} step={1} inputMode="numeric" value={value} disabled={disabled} aria-invalid={Boolean(invalid)} onChange={event=>onChange(event.target.value)}/><span className="policy-control-suffix">/ pago</span></div>
   <p>{helper}</p>
 </div>;
}
export function PolicyRule({number,title,description,code,critical=false}:{number:string;title:string;description:string;code:string;critical?:boolean}){
 return <div className="policy-rule"><div className="policy-rule-count">{number}</div><div className="policy-rule-body"><strong>{title}</strong><p>{description}</p><span>{code}</span></div><div className="policy-rule-locked" title="Control obligatorio; no se puede desactivar en esta demostración"><Icon name={critical?'lock':'shield'} size={13}/> {critical?'INNEGOCIABLE':'ACTIVA'}</div></div>;
}
export function PolicyMetric({label,value,foot}:{label:string;value:number;foot:string}){
 return <div className="policy-metric"><span>{label}</span><strong>{money(value)}</strong><small>{foot}</small></div>;
}
