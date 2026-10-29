'use client';
import {createContext,useContext,useEffect,useState,type FormEvent,type ReactNode} from 'react';
import type {UserRole} from '@/server/security/roles';
export type SessionUser={id:string;email:string;displayName:string;role:UserRole};
const SessionContext=createContext<{user:SessionUser;signOut:()=>Promise<void>}|null>(null);
export function useSession(){return useContext(SessionContext);}
type Step='password'|'challenge'|'enroll'|'recovery';
export function AccessGate({children}:{children:ReactNode}){
 const [user,setUser]=useState<SessionUser|null>(null),[checking,setChecking]=useState(true);
 const [step,setStep]=useState<Step>('password');
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[code,setCode]=useState('');
 const [secret,setSecret]=useState(''),[recoveryCodes,setRecoveryCodes]=useState<string[]>([]);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let alive=true;fetch('/api/auth/session',{cache:'no-store',credentials:'same-origin'})
   .then(async r=>{if(!r.ok)throw new Error('No se pudo comprobar la sesión.');return r.json();})
   .then(j=>{if(alive){setUser(j.user??null);if(j.mfaSetupRequired)setStep('enroll');else if(j.mfaChallengeRequired)setStep('challenge');}})
   .catch(()=>{if(alive)setError('No se pudo comprobar la sesión.');})
   .finally(()=>{if(alive)setChecking(false);});return()=>{alive=false;};},[]);
 async function json(path:string,payload:unknown){
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify(payload)});
  const result=await response.json();if(!response.ok)throw new Error(result.error??'Operación no disponible.');return result;
 }
 async function enter(event:FormEvent){event.preventDefault();setBusy(true);setError('');
  try{const result=await json('/api/auth/session',{email:email.trim(),password});
   setPassword('');setEmail('');setCode('');
   if(result.requiresMfa)setStep('challenge');else if(result.mfaSetupRequired)setStep('enroll');else if(result.user)setUser(result.user);
  }catch(e){setError(e instanceof Error?e.message:'Acceso denegado.');}finally{setBusy(false);}
 }
 async function handleChallenge(event:FormEvent){event.preventDefault();setBusy(true);setError('');
  try{const result=await json('/api/auth/mfa/verify',{code:code.trim()});setUser(result.user);setCode('');setStep('password');}
  catch(e){setError(e instanceof Error?e.message:'Verificación fallida.');}finally{setBusy(false);}
 }
 async function startEnrollment(){setBusy(true);setError('');
  try{const result=await json('/api/auth/mfa/enroll',{action:'start'});setSecret(result.secret);setCode('');}
  catch(e){setError(e instanceof Error?e.message:'No se pudo configurar MFA.');}finally{setBusy(false);}
 }
 async function confirmEnrollment(event:FormEvent){event.preventDefault();setBusy(true);setError('');
  try{const result=await json('/api/auth/mfa/enroll',{action:'confirm',code:code.trim()});setRecoveryCodes(result.recoveryCodes);setSecret('');setCode('');setStep('recovery');}
  catch(e){setError(e instanceof Error?e.message:'No se pudo activar MFA.');}finally{setBusy(false);}
 }
 async function continueAfterRecovery(){setBusy(true);
  try{const response=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'});const result=await response.json();if(!response.ok||!result.user)throw new Error('Sesión no confirmada.');setUser(result.user);setRecoveryCodes([]);setStep('password');}
  catch(e){setError(e instanceof Error?e.message:'Error en la sesión.');}finally{setBusy(false);}
 }
 async function signOut(){setBusy(true);try{const r=await fetch('/api/auth/session',{method:'DELETE',credentials:'same-origin'});if(!r.ok)throw new Error('No fue posible cerrar sesión.');setUser(null);setSecret('');setRecoveryCodes([]);window.location.assign('/');}catch(e){setError(e instanceof Error?e.message:'Error al salir.');}finally{setBusy(false);}}
 return <SessionContext.Provider value={user?{user,signOut}:null}>
   {checking&&<main className="ws-auth"><div className="ws-auth-panel"><strong>BLINKA<span>.</span> DECISION ENGINE</strong><p>Comprobando sesión personal en Neon…</p></div></main>}
   {!checking&&!user&&<main className="ws-auth"><video autoPlay loop muted playsInline poster="/metal-human.jpg" aria-hidden="true"><source src="/metal-human.mp4" type="video/mp4"/></video><div className="ws-auth-panel"><span className="ws-eyebrow">BLINKA / SECURITY · ACCESO CON MFA</span><h1>Inteligencia con<br/><em>control.</em></h1>
   {step==='password'&&<><p>Acceso individual. Es obligatorio configurar un segundo factor antes de ejecutar operaciones.</p><form onSubmit={enter}><label htmlFor="auth-email">Correo del usuario</label><input id="auth-email" type="email" autoComplete="username" required maxLength={255} value={email} onChange={e=>setEmail(e.target.value)} placeholder="usuario@empresa.test"/><label htmlFor="auth-password">Contraseña</label><input id="auth-password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Contraseña individual"/><button disabled={busy}>{busy?'Comprobando…':'Continuar →'}</button></form></>}
   {step==='challenge'&&<><p>Introduce el código de seis dígitos de tu aplicación autenticadora. También puedes usar uno de los códigos de recuperación guardados.</p><form onSubmit={handleChallenge}><label htmlFor="mfa-code">Código MFA o recuperación</label><input id="mfa-code" autoFocus autoComplete="one-time-code" required value={code} onChange={e=>setCode(e.target.value)} maxLength={32} placeholder="000000"/><button disabled={busy}>{busy?'Verificando…':'Verificar segundo factor →'}</button></form></>}
   {step==='enroll'&&<><p>Activación obligatoria de MFA TOTP. Instala una app compatible (Google Authenticator, Aegis, etc.). No se requiere Azure.</p>{!secret?<button disabled={busy} onClick={startEnrollment}>Generar clave TOTP →</button>:<><p>En tu app autenticadora, agrega una cuenta manual con emisor <strong>Blinka</strong> y clave:</p><p style={{overflowWrap:'anywhere',fontFamily:'monospace',userSelect:'all'}}>{secret}</p><p>Algoritmo SHA-1 · 6 dígitos · 30 segundos. No envíes esta clave a nadie.</p><form onSubmit={confirmEnrollment}><label htmlFor="mfa-enroll-code">Código generado en la app</label><input id="mfa-enroll-code" autoComplete="one-time-code" autoFocus required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value)}/><button disabled={busy}>Activar MFA →</button></form></>}</>}
   {step==='recovery'&&<><p><strong>MFA activado.</strong> Copia tus ocho códigos de recuperación y guárdalos en un lugar privado, preferiblemente fuera de este dispositivo. Se muestran una sola vez.</p><pre style={{whiteSpace:'pre-wrap',userSelect:'all',padding:'12px',background:'#131c29',borderRadius:'8px'}}>{recoveryCodes.join('\n')}</pre><button disabled={busy} onClick={continueAfterRecovery}>Ya guardé los códigos. Acceder →</button></>}
   {error&&<p role="alert" className="ws-auth-error">{error}</p>}<small>Semillero académico · Datos sintéticos · No ejecuta transferencias</small></div></main>}
   <div hidden={checking||!user} style={{display:checking||!user?'none':undefined}} aria-hidden={checking||!user}>{children}</div>
 </SessionContext.Provider>;
}
