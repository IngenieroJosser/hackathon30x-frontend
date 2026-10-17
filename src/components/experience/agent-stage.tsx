'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';

const beats = [
  { kicker:'00 / UNA NUEVA FORMA DE OPERAR', eyebrow:'BLINKA AUTONOMOUS FINANCE',
    heading:<>El criterio<br/>también se<br/><em>automatiza.</em></>,
    detail:'La inteligencia para procesar cada factura. El control para decidir cuáles realmente deben autorizarse.', position:'left' },
  { kicker:'01 / COMPRENSIÓN', eyebrow:'DOCUMENT INTELLIGENCE',
    heading:<>Cada factura<br/>cuenta una<br/><em>historia.</em></>,
    detail:'El agente reconoce importes, monedas, fechas y beneficiarios para convertir documentos en decisiones verificables.', position:'left' },
  { kicker:'02 / GOBERNANZA', eyebrow:'POLICY FIRST',
    heading:<>Autonomía,<br/>con reglas<br/><em>claras.</em></>,
    detail:'Límites, acuerdos, duplicados y presupuesto: ningún criterio financiero queda a la improvisación del modelo.', position:'right' },
  { kicker:'03 / DECISIONES', eyebrow:'CONTROLLED AUTONOMY',
    heading:<>Decide.<br/>Explica.<br/><em>Responde.</em></>,
    detail:'Autoriza lo permitido, bloquea lo incorrecto y escala lo que necesita una segunda mirada.', position:'left' },
  { kicker:'04 / SUPERVISIÓN', eyebrow:'HUMAN IN THE LOOP',
    heading:<>La última<br/>palabra<br/><em>es tuya.</em></>,
    detail:'Cuando una factura supera un umbral o requiere contexto, el agente se detiene y solicita aprobación.', position:'right' },
  { kicker:'05 / EVIDENCIA', eyebrow:'AUDIT BY DESIGN',
    heading:<>Confianza<br/>que se puede<br/><em>demostrar.</em></>,
    detail:'Cada evaluación deja una evidencia consultable: qué cambió, qué política aplicó y por qué se tomó la decisión.', position:'left' },
] as const;

export function AgentStage({resolved,total,pending,onEnter,onPending}:{
  resolved:number;total:number;pending:number;onEnter:()=>void;onPending:()=>void;
}) {
  const stage = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [step,setStep] = useState(0);
  const [mutedMotion,setMutedMotion] = useState(false);
  const [videoFailed,setVideoFailed] = useState(false);
  const showBeat = (index:number) => {
    if (!stage.current) return;
    const vh = window.innerHeight;
    const scrollSpace = Math.max(stage.current.offsetHeight-vh,1);
    window.scrollTo({top:stage.current.getBoundingClientRect().top+window.scrollY+(index/(beats.length-1))*scrollSpace,behavior:mutedMotion?'instant':'smooth'});
  };

  useEffect(()=>{
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion=()=>setMutedMotion(reduced.matches);
    syncMotion();reduced.addEventListener('change',syncMotion);
    const section=stage.current;
    if(!section) return ()=>reduced.removeEventListener('change',syncMotion);
    let frame=0;
    const calculate=()=>{
      frame=0;
      const rect=section.getBoundingClientRect();
      const range=Math.max(1,rect.height-window.innerHeight);
      const progress=Math.min(1,Math.max(0,-rect.top/range));
      const selected=Math.min(beats.length-1,Math.floor(progress*beats.length));
      section.style.setProperty('--scene-progress',String(progress));
      section.style.setProperty('--camera-scale',String(1+progress*.20));
      section.style.setProperty('--camera-drift',`${Math.sin(progress*Math.PI)*-3}%`);
      section.style.setProperty('--scene-fade',String(Math.min(1,Math.max(0,1-progress*0.3))));
      setStep(current=>current===selected?current:selected);
    };
    const update=()=>{if(!frame)frame=requestAnimationFrame(calculate);};
    calculate();window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update,{passive:true});
    return ()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',update);window.removeEventListener('resize',update);reduced.removeEventListener('change',syncMotion);};
  },[]);

  useEffect(()=>{
    const element=video.current;
    if(!element||mutedMotion) return;
    const observer=new IntersectionObserver(entries=>{
      if(entries[0]?.isIntersecting) {element.play().catch(()=>undefined);} else {element.pause();}
    },{threshold:.05});
    observer.observe(element);
    return ()=>observer.disconnect();
  },[mutedMotion]);

  return <section className="agent-stage" ref={stage} aria-label="Experiencia visual del agente Blinka">
    <div className="agent-scene-sticky">
      <div className="scene-art" aria-hidden="true">
        <div className="scene-image"/>
        {!mutedMotion&&!videoFailed&&<video ref={video} className="scene-video" src="/metal-human.mp4" poster="/metal-human.jpg" autoPlay loop muted playsInline preload="metadata" disablePictureInPicture onError={()=>setVideoFailed(true)}/>}
        <div className="scene-aurora scene-aurora-a"/><div className="scene-aurora scene-aurora-b"/>
        <div className="scene-screen-grain"/><div className="scene-edge-vignette"/>
        <div className="scene-scanline"/><div className="scene-crosshair scene-crosshair-a"/><div className="scene-crosshair scene-crosshair-b"/>
        <span className="scene-hairline scene-hairline-left"/><span className="scene-hairline scene-hairline-right"/>
      </div>
      <div className="scene-headline-track" aria-live="off">
        {beats.map((beat,index)=><article key={index} className={`scene-beat scene-beat-${beat.position} ${step===index?'scene-beat-active':''}`} aria-hidden={step!==index} inert={step!==index}>
          <div className="scene-beat-kicker"><span className="tiny-diamond"/> {beat.kicker}</div>
          <div className="scene-beat-eyebrow">{beat.eyebrow}</div>
          <h1>{beat.heading}</h1>
          <p>{beat.detail}</p>
          {index===0&&<div className="scene-actions"><button type="button" className="action-neon" onClick={onEnter}>Entrar al dashboard <Icon name="arrowUp" size={17}/></button><button type="button" className="action-quiet" onClick={()=>showBeat(1)}>Descubrir el agente <Icon name="arrowDown" size={15}/></button></div>}
          {index===beats.length-1&&<button type="button" className="action-neon scene-final-action" onClick={onEnter}>Ver centro de control <Icon name="arrowUp" size={17}/></button>}
        </article>)}
      </div>
      <div className="scene-vertical-index" aria-label="Navegación por capítulos">
        <span className="scene-index-title">THE SYSTEM / 2026</span>
        <div className="scene-index-buttons">{beats.map((beat,index)=><button className={`scene-index-button ${index===step?'is-current':''}`} type="button" key={index} onClick={()=>showBeat(index)} aria-label={`Ir a escena ${index+1}: ${beat.eyebrow}`} aria-current={index===step?'step':undefined}><span/></button>)}</div>
        <span className="scene-index-count">0{step+1} <i/> 0{beats.length}</span>
      </div>
      <div className="scene-telemetry" aria-hidden="true"><div className="telemetry-live"><i/> AGENT ONLINE <span>·</span> SANDBOX</div><span>SECURE · NO LIVE TRANSACTIONS</span></div>
      <div className="scene-bottom-bar">
        <span className="scene-scroll-cue"><Icon name="arrowDown" size={15}/> DESLIZA PARA EXPLORAR</span>
        <span className="scene-bottom-metric"><b>{resolved}%</b><span>DECISIONES RESUELTAS<br/>{total-pending} / {total} SIN INTERVENCIÓN</span></span>
        <button className="scene-approval-link" type="button" onClick={onPending}>{pending} por revisar <Icon name="arrowUp" size={15}/></button>
      </div>
      <div className="scene-progress"><span style={{width:`${((step+1)/beats.length)*100}%`}}/></div>
    </div>
  </section>;
}
