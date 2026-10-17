'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';

type NavIcon='grid'|'file'|'users'|'wallet'|'shield'|'audit'|'chart';
const sections:{title:string;items:{title:string;icon:NavIcon;anchor?:string}[]}[]=[
  {title:'WORKSPACE',items:[
    {title:'Inicio',icon:'grid',anchor:'inicio'},
    {title:'Operaciones',icon:'chart',anchor:'operaciones'},
    {title:'Facturas',icon:'file',anchor:'facturas'},
    {title:'Aprobaciones',icon:'users',anchor:'approvals'},
  ]},
  {title:'PRÓXIMAMENTE',items:[
    {title:'Beneficiarios',icon:'wallet'},
    {title:'Políticas',icon:'shield'},
    {title:'Auditoría',icon:'audit'},
  ]},
];

export function AppShell({children,alerts,onPendingClick,onSearchClick}:{
  children:ReactNode;alerts:number;onPendingClick:()=>void;onSearchClick:()=>void;
}){
  const [menuOpen,setMenuOpen]=useState(false);
  const [notificationsOpen,setNotificationsOpen]=useState(false);
  const move=(anchor:string)=>{
    setMenuOpen(false);setNotificationsOpen(false);
    if(anchor==='approvals'){onPendingClick();return;}
    if(anchor==='inicio'){window.scrollTo({top:0,behavior:'smooth'});return;}
    document.getElementById(anchor)?.scrollIntoView({behavior:'smooth',block:'start'});
  };
  return <div className="app-frame" id="inicio">
    {menuOpen&&<button className="mobile-scrim" type="button" aria-label="Cerrar menú" onClick={()=>setMenuOpen(false)}/>}
    <header className="topbar">
      <a href="/" className="brand-logo" aria-label="Blinka Decision Engine, inicio"><span className="brand-mark" aria-hidden="true"><span/><span/></span><span className="brand-wordmark">blinka<span className="brand-dot">.</span></span><span className="brand-divider"/><span className="brand-product">DECISION ENGINE</span></a>
      <div className="topbar-center"><span className="header-slash">/</span><span>ATLAS GLOBAL INC.</span><span className="header-slash">/</span><span className="header-current">OVERVIEW</span></div>
      <div className="topbar-right">
        <span className="header-sandbox"><i/> SANDBOX MODE</span>
        <button type="button" className="topbar-tool" onClick={onSearchClick} aria-label="Buscar factura" title="Buscar factura"><Icon name="search" size={18}/></button>
        <div className="notification-wrap"><button type="button" className="topbar-tool notification-button" onClick={()=>setNotificationsOpen(v=>!v)} aria-expanded={notificationsOpen} aria-label={`Notificaciones: ${alerts} pendientes`}><Icon name="bell" size={18}/>{alerts>0&&<span className="notification-count"/>}</button>
          {notificationsOpen&&<div className="notification-menu"><strong>Solicitudes que esperan aprobación</strong><p>{alerts} {alerts===1?'factura necesita':'facturas necesitan'} revisión humana.</p><button type="button" onClick={()=>{setNotificationsOpen(false);onPendingClick();}}>Revisar solicitudes <Icon name="arrowUp" size={15}/></button></div>}
        </div>
        <span className="header-user" title="Administrador financiero · Demo">AF</span>
        <button type="button" className="topbar-tool menu-toggle" onClick={()=>setMenuOpen(v=>!v)} aria-expanded={menuOpen} aria-label={menuOpen?'Cerrar navegación':'Abrir navegación'}><Icon name={menuOpen?'close':'menu'} size={20}/></button>
      </div>
    </header>
    <aside className={`sidebar ${menuOpen?'sidebar-open':''}`} aria-label="Navegación principal">
      <nav className="sidebar-navigation">
        {sections.map((group,i)=><div className="nav-group" key={group.title}>
          <span className="nav-heading">{i===0?'01':'02'}</span>
          {group.items.map(item=><button key={item.title} type="button" className={`nav-item ${item.anchor?'':'nav-disabled'}`} title={item.anchor?item.title:`${item.title} · Disponible próximamente`} aria-label={item.title} disabled={!item.anchor} onClick={()=>item.anchor&&move(item.anchor)}><Icon name={item.icon} size={19}/><span className="nav-tooltip">{item.title}</span></button>)}
        </div>)}
      </nav>
      <div className="sidebar-bottom"><span className="rail-status"><i/>LIVE</span><button type="button" className="rail-help" title="Ir a operaciones" aria-label="Ir a operaciones" onClick={()=>move('operaciones')}><Icon name="arrowDown" size={18}/></button></div>
    </aside>
    <main className="main-column" id="contenido-principal">{children}</main>
  </div>;
}
