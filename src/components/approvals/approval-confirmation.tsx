'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { validateReviewNote } from '@/lib/approval-workflow';
import { money } from '@/lib/format';
import type { Invoice } from '@/types/payments';

type Props={invoice:Invoice;intent:'approve'|'reject';eligible:boolean;onClose:()=>void;onConfirm:(reason:string)=>void;busy:boolean};
export function ApprovalConfirmation({invoice,intent,eligible,onClose,onConfirm,busy}:Props){
  const [reason,setReason]=useState('');
  const [acknowledged,setAcknowledged]=useState(false);
  const dialogRef=useRef<HTMLDivElement>(null);
  const inputRef=useRef<HTMLTextAreaElement>(null);
  const isApprove=intent==='approve';
  const error=validateReviewNote(reason);
  useEffect(()=>{
    const focusBefore=document.activeElement instanceof HTMLElement?document.activeElement:null;
    inputRef.current?.focus();
    const onKeyDown=(e:KeyboardEvent)=>{
      if(e.key==='Escape'&&!busy){e.preventDefault();onClose();}
      if(e.key!=='Tab')return;
      const focusable=dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),textarea,input:not(:disabled)');
      if(!focusable?.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',onKeyDown);
    return()=>{document.removeEventListener('keydown',onKeyDown);focusBefore?.focus();};
  },[onClose,busy]);
  const allowed=!busy&&!error&&(!isApprove||(eligible&&acknowledged));
  return <div className="ap-dialog-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}>
    <div className="ap-dialog" role="dialog" aria-modal="true" aria-labelledby="ap-dialog-heading" ref={dialogRef}>
      <div className="ap-dialog-top"><span><Icon name="shield" size={15}/> FINANCIAL CONTROL / SANDBOX</span><button type="button" aria-label="Cerrar confirmación" onClick={onClose} disabled={busy}><Icon name="close" size={20}/></button></div>
      <div className={`ap-dialog-symbol ${isApprove?'ap-dialog-symbol-safe':'ap-dialog-symbol-reject'}`}><Icon name={isApprove?'check':'cross'} size={26}/></div>
      <h2 id="ap-dialog-heading">{isApprove?'Confirmar autorización':'Rechazar solicitud'}<em>.</em></h2>
      <p>Vas a {isApprove?'autorizar en simulación':'rechazar'} la factura <strong>{invoice.number}</strong> de {invoice.vendor} por <strong>{money(invoice.amount)} {invoice.currency}</strong>.</p>
      <div className="ap-dialog-warning"><Icon name="info" size={17}/>{isApprove?'Las reglas, el beneficiario y el presupuesto se volverán a verificar justo antes de registrar la autorización.':'El rechazo cerrará esta solicitud, sin mover dinero ni modificar los límites de la empresa.'}</div>
      <label className="ap-dialog-label" htmlFor="ap-reason">JUSTIFICACIÓN DE LA DECISIÓN <span>* OBLIGATORIA</span></label>
      <textarea ref={inputRef} id="ap-reason" rows={4} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} placeholder={isApprove?'Ej.: Verifiqué el contrato y confirmo este importe dentro de los límites vigentes.':'Ej.: El servicio no corresponde al periodo acordado con este proveedor.'} disabled={busy} aria-describedby="ap-reason-hint"/>
      <div className="ap-reason-meta" id="ap-reason-hint"><span>{reason.length>0&&error?error:'El comentario quedará asociado a la auditoría del expediente.'}</span><span>{reason.length}/500</span></div>
      {isApprove&&<label className="ap-ack"><input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)} disabled={busy}/><span>He revisado el expediente y entiendo que esta acción solo autoriza una decisión ficticia, sin ejecutar pagos reales.</span></label>}
      <div className="ap-dialog-actions"><button type="button" className="ap-outline" disabled={busy} onClick={onClose}>Cancelar</button><button type="button" className={`ap-primary ${!isApprove?'ap-danger':''}`} disabled={!allowed} onClick={()=>onConfirm(reason.trim())}>{busy?'Registrando…':isApprove?'Autorizar factura':'Rechazar solicitud'} <Icon name="arrow" size={16}/></button></div>
      <small>Operación en el navegador. Sin control de acceso real ni almacenamiento inmutable.</small>
    </div>
  </div>;
}
