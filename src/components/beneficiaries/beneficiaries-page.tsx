'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Icon } from '@/components/ui/icon';
import { money } from '@/lib/format';
import { INITIAL_INVOICES } from '@/lib/mock-data';
import { getDemoPolicy } from '@/lib/policy-store';
import {
  DEMO_BENEFICIARIES, COUNTRIES, getDemoBeneficiaries, getRegistryEvents,
  normalName, saveDemoBeneficiary, setDemoBeneficiaryStatus, REGISTRY_EVENT,
  type Beneficiary, type BeneficiaryCountry, type BeneficiaryInput,
  type BeneficiaryStatus, type RegistryEvent,
} from '@/lib/beneficiary-registry';
import { BeneficiaryEditor } from './beneficiary-editor';

type Filter = 'all' | BeneficiaryStatus;
const statusLabels:Record<BeneficiaryStatus,string>={authorized:'Autorizado',review:'En revisión',blocked:'Bloqueado'};
const statusHelp:Record<BeneficiaryStatus,string>={
  authorized:'El agente puede considerar sus facturas, sujeto a todas las demás reglas.',
  review:'Las facturas de este proveedor no pueden autorizarse automáticamente.',
  blocked:'Este beneficiario queda fuera de la lista autorizada para nuevas evaluaciones.',
};
const countryCodes:Record<BeneficiaryCountry,string>={Colombia:'CO',México:'MX',Argentina:'AR',Brasil:'BR',Chile:'CL',Perú:'PE'};
const initials=(name:string)=>name.split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
const dateLabel=(iso:string)=>new Date(iso).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'});
const eventText:Record<RegistryEvent['action'],string>={created:'Creación del registro',updated:'Datos y acuerdo actualizados',authorized:'Autorización del beneficiario',review:'Enviado a revisión',blocked:'Beneficiario bloqueado'};

function Status({status}:{status:BeneficiaryStatus}){return <span className={`bn-status bn-status-${status}`}><i/>{statusLabels[status]}</span>;}
function Avatar({name,large=false}:{name:string;large?:boolean}){return <div className={`bn-avatar ${large?'bn-avatar-large':''}`} aria-hidden="true">{initials(name)}</div>;}
function Metric({label,value,note,icon,variant}:{label:string;value:string|number;note:string;icon:'users'|'check'|'clock'|'lock';variant?:string}){return <div className={`bn-metric ${variant??''}`}><div className="bn-metric-head"><span>{label}</span><Icon name={icon} size={17}/></div><strong>{value}</strong><small>{note}</small></div>;}
function RegistryHero({onNew,onExplore,count}:{onNew:()=>void;onExplore:()=>void;count:number}){
  return <section className="bn-hero" aria-labelledby="bn-hero-title">
    <video className="bn-hero-video" autoPlay loop muted playsInline preload="metadata" poster="/metal-human.jpg" aria-hidden="true"><source src="/metal-human.mp4" type="video/mp4"/></video>
    <div className="bn-hero-overlay"/><div className="bn-hero-grid" aria-hidden="true"/><div className="bn-hero-halo" aria-hidden="true"/>
    <div className="bn-hero-content"><div className="bn-breadcrumb"><a href="/">WORKSPACE</a><Icon name="chevron" size={11}/><span>BENEFICIARIOS</span></div>
      <div className="bn-live"><i/> 03 / TRUST REGISTRY <span>—</span> CONTROL DE DESTINATARIOS</div>
      <h1 id="bn-hero-title">Cada pago tiene<br/>un destino<span>.</span><br/><em>Cada destino, una regla.</em></h1>
      <p>Una única fuente de confianza para los beneficiarios, sus acuerdos y los límites que protegen cada decisión del agente.</p>
      <div className="bn-hero-actions"><button type="button" className="bn-button bn-button-primary" onClick={onNew}><Icon name="plus" size={18}/> Nuevo beneficiario</button><button type="button" className="bn-button bn-button-glass" onClick={onExplore}>Explorar directorio <Icon name="arrowDown" size={17}/></button></div>
      <div className="bn-hero-proof"><span><Icon name="shield" size={15}/> Reglas antes que automatización</span><i/><span>Datos sintéticos · Sandbox</span></div>
    </div>
    <div className="bn-hero-capsule" aria-hidden="true"><span className="bn-capsule-pulse"/><div><small>TRUST NETWORK / ONLINE</small><strong>{String(count).padStart(2,'0')} <span>registros</span></strong></div><Icon name="globe" size={23}/></div>
    <div className="bn-hero-index">BLINKA / AGENT INTELLIGENCE <span>03 — 07</span></div>
  </section>;
}

export function BeneficiariesPage(){
  const [items,setItems]=useState<Beneficiary[]>(DEMO_BENEFICIARIES);
  const [events,setEvents]=useState<RegistryEvent[]>([]);
  const [selectedId,setSelectedId]=useState('ben-02');
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState<Filter>('all');
  const [country,setCountry]=useState('all');
  const [editing,setEditing]=useState<Beneficiary|null|undefined>(undefined);
  const [confirmation,setConfirmation]=useState<{id:string;status:BeneficiaryStatus}|null>(null);
  const [toast,setToast]=useState<string|null>(null);
  const searchRef=useRef<HTMLInputElement>(null);
  const registryRef=useRef<HTMLElement>(null);
  const confirmRef=useRef<HTMLDivElement>(null);
  const [policyLimit,setPolicyLimit]=useState(5000);
  const refresh=useCallback(()=>{setItems(getDemoBeneficiaries());setEvents(getRegistryEvents());setPolicyLimit(getDemoPolicy().hardLimit);},[]);
  useEffect(()=>{
    const task=requestAnimationFrame(refresh);
    window.addEventListener(REGISTRY_EVENT,refresh);
    window.addEventListener('storage',refresh);
    return()=>{cancelAnimationFrame(task);window.removeEventListener(REGISTRY_EVENT,refresh);window.removeEventListener('storage',refresh);};
  },[refresh]);
  useEffect(()=>{
    if(!confirmation)return;
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    confirmRef.current?.focus();
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){setConfirmation(null);return;}
      if(e.key!=='Tab')return;
      const controls=confirmRef.current?.querySelectorAll<HTMLElement>('button');
      if(!controls?.length)return;
      if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls[controls.length-1].focus();}
      else if(!e.shiftKey&&document.activeElement===controls[controls.length-1]){e.preventDefault();controls[0].focus();}
    };
    document.addEventListener('keydown',onKey);
    return()=>{document.removeEventListener('keydown',onKey);previous?.focus();};
  },[confirmation]);
  const selected=items.find(b=>b.id===selectedId)??items[0]??null;
  const counts=useMemo(()=>({total:items.length,authorized:items.filter(b=>b.status==='authorized').length,review:items.filter(b=>b.status==='review').length,blocked:items.filter(b=>b.status==='blocked').length}),[items]);
  const visible=useMemo(()=>items.filter(b=>{
    const matchesQuery=normalName(`${b.name} ${b.category} ${b.agreementReference} ${b.country}`).includes(normalName(query));
    return matchesQuery&&(filter==='all'||b.status===filter)&&(country==='all'||b.country===country);
  }).sort((a,b)=>a.name.localeCompare(b.name,'es')),[items,query,filter,country]);
  const exposure=useMemo(()=>{
    const map=new Map<string,{invoices:number;total:number;pending:number}>();
    for(const invoice of INITIAL_INVOICES){
      const key=normalName(invoice.vendor),prev=map.get(key)??{invoices:0,total:0,pending:0};
      map.set(key,{invoices:prev.invoices+1,total:prev.total+invoice.amount,pending:prev.pending+(invoice.status==='pending'?1:0)});
    }
    return map;
  },[]);
  const invoicesForSelected=selected?INITIAL_INVOICES.filter(i=>normalName(i.vendor)===normalName(selected.name)):[];
  const selectedExposure=selected?exposure.get(normalName(selected.name)):undefined;
  const activeConfirmation=confirmation?items.find(b=>b.id===confirmation.id):undefined;
  const focusSearch=()=>{registryRef.current?.scrollIntoView({behavior:'smooth',block:'start'});window.setTimeout(()=>searchRef.current?.focus(),220);};
  const save=(data:BeneficiaryInput,id?:string)=>{
    try{
      const record=saveDemoBeneficiary(data,id);
      refresh();setSelectedId(record.id);setEditing(undefined);
      setToast(id?record.status==='review'?'Cambios guardados: el beneficiario debe aprobarse de nuevo.':'Beneficiario actualizado y registrado.':'Beneficiario creado en revisión. Aún no está autorizado.');
    }catch(error){setToast(error instanceof Error?error.message:'No fue posible guardar los datos.');}
  };
  const commitStatus=()=>{
    if(!confirmation)return;
    try{
      const changed=setDemoBeneficiaryStatus(confirmation.id,confirmation.status);
      refresh();setSelectedId(changed.id);
      setToast(`Estado actualizado: ${statusLabels[changed.status].toLowerCase()}. Se aplicará a nuevas evaluaciones.`);
    }catch(error){setToast(error instanceof Error?error.message:'No se pudo guardar el estado.');}
    setConfirmation(null);
  };
  const exportRegistry=()=>{
    const payload={environment:'synthetic-demo',generatedAt:new Date().toISOString(),paymentExecution:false,identityVerification:false,beneficiaries:items,auditEvents:events};
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='blinka-beneficiarios-demo.json';document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
    setToast('Directorio y cambios exportados en formato JSON.');
  };
  return <AppShell currentPage="beneficiaries" alerts={INITIAL_INVOICES.filter(i=>i.status==='pending').length} onPendingClick={()=>{window.location.href='/#facturas';}} onSearchClick={focusSearch}>
    <div className="bn-page"><RegistryHero count={counts.total} onNew={()=>setEditing(null)} onExplore={()=>registryRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}/>
      <div className="bn-container">
        <div className="bn-section-lead"><div><span className="bn-eyebrow">TRUST INFRASTRUCTURE / 01</span><h2>El control empieza<br/><em>antes del pago.</em></h2><p>El agente consulta este directorio al decidir si un beneficiario está permitido y cuánto contempla su acuerdo.</p></div><div className="bn-system-state"><i/> DIRECTORIO ACTIVO <span>V1.0 / LOCAL SANDBOX</span></div></div>
        <section className="bn-metrics" aria-label="Resumen de beneficiarios">
          <Metric label="REGISTROS TOTALES" value={counts.total.toString().padStart(2,'0')} note="Directorio sintético" icon="users"/>
          <Metric label="AUTORIZADOS" value={counts.authorized.toString().padStart(2,'0')} note="Habilitados según política" icon="check" variant="bn-metric-green"/>
          <Metric label="EN REVISIÓN" value={counts.review.toString().padStart(2,'0')} note="Sin autorización autónoma" icon="clock" variant="bn-metric-amber"/>
          <Metric label="BLOQUEADOS" value={counts.blocked.toString().padStart(2,'0')} note="Fuera de lista permitida" icon="lock" variant="bn-metric-red"/>
        </section>
        <div className="bn-workspace" id="directorio">
          <section className="bn-directory" ref={registryRef} aria-labelledby="bn-directory-title">
            <div className="bn-panel-heading"><div><span className="bn-eyebrow">02 / BENEFICIARY DIRECTORY</span><h2 id="bn-directory-title">Directorio de confianza<span>.</span></h2><p>Gestiona quién puede cobrar y bajo qué acuerdo.</p></div><div className="bn-heading-actions"><button type="button" className="bn-icon-button" onClick={exportRegistry} title="Exportar directorio a JSON" aria-label="Exportar directorio"><Icon name="download" size={18}/></button><button type="button" className="bn-button bn-button-primary bn-add-inline" onClick={()=>setEditing(null)}><Icon name="plus" size={17}/> Agregar</button></div></div>
            <div className="bn-directory-tools"><div className="bn-search"><Icon name="search" size={17}/><input ref={searchRef} type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar beneficiario, acuerdo…" aria-label="Buscar beneficiarios"/><span>⌕</span></div><label className="bn-select-country"><span className="sr-only">Filtrar por país</span><Icon name="globe" size={15}/><select value={country} onChange={e=>setCountry(e.target.value)}><option value="all">Todos los países</option>{COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}</select></label></div>
            <div className="bn-filter-row" role="group" aria-label="Filtrar por estado">{([{key:'all',label:'Todos',count:counts.total},{key:'authorized',label:'Autorizados',count:counts.authorized},{key:'review',label:'En revisión',count:counts.review},{key:'blocked',label:'Bloqueados',count:counts.blocked}] as {key:Filter;label:string;count:number}[]).map(entry=><button type="button" key={entry.key} className={`bn-filter ${filter===entry.key?'is-active':''}`} onClick={()=>setFilter(entry.key)} aria-pressed={filter===entry.key}>{entry.label}<span>{entry.count}</span></button>)}</div>
            <div className="bn-table-scroll"><table className="bn-table"><thead><tr><th>BENEFICIARIO</th><th>ACUERDO / USD</th><th>ESTADO</th><th aria-label="Seleccionar"/></tr></thead><tbody>{visible.map(item=><tr key={item.id} className={selected?.id===item.id?'bn-table-selected':''}><td><button type="button" className="bn-person-button" onClick={()=>setSelectedId(item.id)} aria-label={`Ver ficha de ${item.name}`}><Avatar name={item.name}/><span><strong>{item.name}</strong><small>{countryCodes[item.country]} <span>·</span> {item.category}</small></span></button></td><td><div className="bn-agreement-cell"><strong>{money(item.agreementLimit)}</strong><small>{item.agreementReference}</small></div></td><td><Status status={item.status}/></td><td><button type="button" className="bn-view" onClick={()=>setSelectedId(item.id)} aria-label={`Ver ${item.name}`} title="Ver ficha"><Icon name="arrowUp" size={15}/></button></td></tr>)}</tbody></table>{visible.length===0&&<div className="bn-empty"><Icon name="search" size={27}/><strong>No hay resultados</strong><p>Prueba otro nombre, país o estado.</p><button type="button" className="bn-button bn-button-outline" onClick={()=>{setQuery('');setCountry('all');setFilter('all');}}>Limpiar filtros</button></div>}</div>
            <div className="bn-table-footer"><span>Mostrando {visible.length} de {counts.total} beneficiarios</span><span><Icon name="lock" size={12}/> Referencias ficticias · USD</span></div>
          </section>
          <aside className="bn-profile" aria-label="Ficha de beneficiario seleccionado">{selected?<>
            <div className="bn-profile-header"><span className="bn-eyebrow">03 / BENEFICIARY DOSSIER</span><button type="button" className="bn-icon-button" aria-label={`Editar ${selected.name}`} title="Editar registro" onClick={()=>setEditing(selected)}><Icon name="settings" size={18}/></button></div>
            <div className="bn-profile-identity"><Avatar name={selected.name} large/><span className="bn-profile-country">{countryCodes[selected.country]} / {selected.country.toUpperCase()}</span><h2>{selected.name}</h2><p>{selected.category}</p><Status status={selected.status}/></div>
            <div className="bn-profile-trust"><div><Icon name="shield" size={18}/><strong>Política de autorización</strong></div><p>{statusHelp[selected.status]}</p></div>
            <div className="bn-profile-agreement"><span className="bn-eyebrow">ACUERDO ACTIVO EN DEMO</span><div className="bn-profile-limit-label">Límite por factura <span>USD</span></div><strong className="bn-profile-limit">{money(selected.agreementLimit)}</strong><div className="bn-limit-track"><span style={{width:`${Math.min(100,selected.agreementLimit/Math.max(1,policyLimit)*100)}%`}}/></div><div className="bn-limit-captions"><span>Acuerdo del proveedor</span><span>Política general: {money(policyLimit)}</span></div><div className="bn-profile-reference"><span>REFERENCIA DEL ACUERDO</span><strong>{selected.agreementReference}</strong></div></div>
            <div className="bn-profile-facts"><div><span>ID INTERNO</span><strong title={selected.id}>{selected.id.length>24?`${selected.id.slice(0,20)}…`:selected.id}</strong></div><div><span>VERSIÓN DEL REGISTRO</span><strong>r{selected.revision}</strong></div><div><span>ÚLTIMO CAMBIO</span><strong>{dateLabel(selected.updatedAt)}</strong></div><div><span>FACTURAS DE MUESTRA</span><strong>{selectedExposure?.invoices??0}</strong></div></div>
            <div className="bn-profile-history"><div><span className="bn-eyebrow">MUESTRA DE FACTURAS</span><span>{invoicesForSelected.length}</span></div>{invoicesForSelected.length?invoicesForSelected.slice(0,3).map(invoice=><div className="bn-profile-invoice" key={invoice.id}><span>{invoice.number}</span><strong>{money(invoice.amount)}</strong></div>):<p>Sin facturas asociadas en el lote inicial.</p>}</div>
            <div className="bn-profile-action-group"><button type="button" className="bn-button bn-button-outline" onClick={()=>setEditing(selected)}><Icon name="settings" size={16}/> Editar acuerdo</button>{selected.status!=='authorized'&&<button type="button" className="bn-button bn-button-primary" onClick={()=>setConfirmation({id:selected.id,status:'authorized'})}><Icon name="check" size={17}/> Autorizar</button>}{selected.status==='authorized'&&<button type="button" className="bn-button bn-button-danger" onClick={()=>setConfirmation({id:selected.id,status:'blocked'})}><Icon name="lock" size={16}/> Bloquear</button>}{selected.status==='blocked'&&<button type="button" className="bn-button bn-button-outline" onClick={()=>setConfirmation({id:selected.id,status:'review'})}>Enviar a revisión</button>}{selected.status==='review'&&<button type="button" className="bn-button bn-button-danger" onClick={()=>setConfirmation({id:selected.id,status:'blocked'})}>Bloquear</button>}</div>
            <p className="bn-profile-disclaimer">La autorización corresponde únicamente al directorio ficticio. No valida identidad ni ejecuta pagos.</p>
          </>:<p>No hay beneficiarios registrados.</p>}</aside>
        </div>
        <section className="bn-bottom-grid"><div className="bn-trace" id="actividad"><div className="bn-bottom-heading"><div><span className="bn-eyebrow">04 / TRACEABILITY</span><h2>Cada cambio deja huella<span>.</span></h2></div><span>REGISTRO LOCAL</span></div>{events.length?events.slice(0,5).map(event=><div className="bn-event" key={event.id}><span className="bn-event-symbol"><Icon name={event.action==='authorized'?'check':event.action==='blocked'?'lock':event.action==='created'?'plus':'refresh'} size={15}/></span><div><strong>{eventText[event.action]}</strong><p>{event.name} · Registro r{event.revision} · {event.actor}</p></div><time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</time></div>):<div className="bn-event-empty"><Icon name="audit" size={22}/><div><strong>Sin modificaciones registradas en este navegador.</strong><p>Crear, editar o cambiar el estado de un beneficiario generará una entrada trazable.</p></div></div>}</div>
        <div className="bn-principle"><div className="bn-principle-top"><span className="bn-eyebrow">THE TRUST PRINCIPLE</span><Icon name="sparkles" size={20}/></div><div className="bn-principle-art"><div className="bn-principle-orbit"/><div className="bn-principle-orbit bn-orbit-two"/><Icon name="shield" size={40}/></div><h2>No es a quién<br/>el agente <em>quiere pagar.</em><br/>Es a quién <em>puede pagar.</em></h2><p>Los beneficiarios y sus acuerdos se verifican antes de aplicar umbrales y presupuestos. Si el destinatario no está autorizado, la evaluación se bloquea.</p><a href="/politicas">Explorar políticas <Icon name="arrowUp" size={15}/></a></div></section>
        <footer className="site-footer bn-footer"><span>© 2026 BLINKA DECISION ENGINE / BENEFICIARY CONTROL</span><span>UN CONCEPTO DE ZYRA · SANDBOX / NO REAL PAYMENTS</span></footer>
      </div>
    </div>
    {editing!==undefined&&<BeneficiaryEditor editing={editing} existing={items} onClose={()=>setEditing(undefined)} onSubmit={save}/>}
    {confirmation&&activeConfirmation&&<div className="bn-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setConfirmation(null);}}><div className="bn-confirm" role="dialog" aria-modal="true" aria-labelledby="bn-confirm-title" tabIndex={-1} ref={confirmRef}><div className="bn-confirm-icon"><Icon name={confirmation.status==='blocked'?'lock':'shield'} size={24}/></div><span className="bn-eyebrow">HUMAN CONTROL / SANDBOX</span><h2 id="bn-confirm-title">{confirmation.status==='authorized'?'¿Autorizar beneficiario?':confirmation.status==='blocked'?'¿Bloquear beneficiario?':'¿Enviar a revisión?'}</h2><p>Vas a cambiar el estado de <strong>{activeConfirmation.name}</strong> a <strong>{statusLabels[confirmation.status]}</strong>. Este cambio afectará únicamente nuevas evaluaciones del agente en este navegador.</p>{confirmation.status==='authorized'&&<div className="bn-confirm-warning"><Icon name="alert" size={17}/> Confirma que revisaste el registro y su acuerdo. La demostración no verifica identidad ni cuentas bancarias.</div>}<div className="bn-confirm-actions"><button type="button" className="bn-button bn-button-outline" onClick={()=>setConfirmation(null)}>Cancelar</button><button type="button" className={`bn-button ${confirmation.status==='blocked'?'bn-button-danger':'bn-button-primary'}`} onClick={commitStatus}>Confirmar cambio <Icon name="arrow" size={16}/></button></div></div></div>}
    {toast&&<div className="toast" role="status"><Icon name="info" size={17}/><span>{toast}</span><button type="button" onClick={()=>setToast(null)} aria-label="Cerrar mensaje"><Icon name="close" size={15}/></button></div>}
  </AppShell>;
}
