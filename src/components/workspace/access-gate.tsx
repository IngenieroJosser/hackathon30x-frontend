'use client';
import { createContext,useContext,useEffect,useState,type FormEvent,type ReactNode } from 'react';
import type { UserRole } from '@/server/security/roles';
export type SessionUser={id:string;email:string;displayName:string;role:UserRole};
const SessionContext=createContext<{user:SessionUser;signOut:()=>Promise<void>}|null>(null);
export function useSession(){return useContext(SessionContext);}
export function AccessGate({children}:{children:ReactNode}){
 const [user,setUser]=useState<SessionUser|null>(null),[checking,setChecking]=useState(true);
 const [email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let alive=true;fetch('/api/auth/session',{cache:'no-store',credentials:'same-origin'})
   .then(async r=>{if(!r.ok)throw new Error('No se pudo comprobar la sesión.');return r.json();})
   .then(j=>{if(alive)setUser(j.user??null);}).catch(()=>{if(alive)setError('No se pudo comprobar la sesión.');})
   .finally(()=>{if(alive)setChecking(false);});return()=>{alive=false;};},[]);
 async function enter(event:FormEvent){event.preventDefault();setBusy(true);setError('');
  try{const response=await fetch('/api/auth/session',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({email:email.trim(),password})});
   const result=await response.json();if(!response.ok)throw new Error(result.error??'No se pudo ingresar.');
   setUser(result.user);setPassword('');setEmail('');
  }catch(e){setError(e instanceof Error?e.message:'Acceso denegado.');}finally{setBusy(false);}
 }
 async function signOut(){setBusy(true);try{const r=await fetch('/api/auth/session',{method:'DELETE',credentials:'same-origin'});if(!r.ok)throw new Error('No fue posible cerrar sesión.');setUser(null);window.location.assign('/');}catch(e){setError(e instanceof Error?e.message:'Error al salir.');}finally{setBusy(false);}}
 // Keep the route segment mounted during prerender. Otherwise the client-side
 // gate drops all child pages and Next.js cannot validate instant navigation.
 // This is presentation-only: every data API independently checks the session.
 return <SessionContext.Provider value={user?{user,signOut}:null}>
   {checking&&<main className="ws-auth"><div className="ws-auth-panel"><strong>BLINKA<span>.</span> DECISION ENGINE</strong><p>Comprobando sesión personal en Neon…</p></div></main>}
   {!checking&&!user&&<main className="ws-auth"><video autoPlay loop muted playsInline poster="/metal-human.jpg" aria-hidden="true"><source src="/metal-human.mp4" type="video/mp4"/></video><div className="ws-auth-panel"><span className="ws-eyebrow">BLINKA / 30X · ACCESO INDIVIDUAL</span><h1>Inteligencia con<br/><em>control.</em></h1><p>Ingresa con tu usuario asignado. Cada cambio, autorización y evento se atribuye a una identidad con permisos definidos.</p><form onSubmit={enter}><label htmlFor="auth-email">Correo corporativo de demostración</label><input id="auth-email" type="email" autoComplete="username" required maxLength={255} value={email} onChange={e=>setEmail(e.target.value)} placeholder="usuario@empresa.test"/><label htmlFor="auth-password">Contraseña</label><input id="auth-password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Contraseña individual"/><button disabled={busy}>{busy?'Comprobando…':'Ingresar al centro de operaciones →'}</button></form>{error&&<p role="alert" className="ws-auth-error">{error}</p>}<small>Administrador · Aprobador · Auditor / Facturas ficticias · Sin dinero real</small></div></main>}
   <div hidden={checking||!user} style={{display:checking||!user?'none':undefined}} aria-hidden={checking||!user}>{children}</div>
 </SessionContext.Provider>;
}
