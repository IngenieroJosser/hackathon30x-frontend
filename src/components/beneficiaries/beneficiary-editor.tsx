'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Icon } from '@/components/ui/icon';
import { COUNTRIES, type Beneficiary, type BeneficiaryInput, type BeneficiaryCountry, validateBeneficiary } from '@/lib/beneficiary-registry';

type Props = {
  editing: Beneficiary | null;
  existing: Beneficiary[];
  onClose: () => void;
  onSubmit: (data:BeneficiaryInput,editingId?:string) => void;
};
const empty: BeneficiaryInput = {
  name:'',country:'Colombia',category:'',agreementReference:'',agreementLimit:1000,contactEmail:'',notes:'',
};
const fields: {key:keyof BeneficiaryInput;label:string;placeholder:string}[] = [
  {key:'name',label:'Nombre del beneficiario',placeholder:'Ej. Horizonte Software'},
  {key:'category',label:'Categoría de servicio',placeholder:'Ej. Desarrollo de software'},
  {key:'agreementReference',label:'Referencia del acuerdo',placeholder:'Ej. AGR-2026-001'},
  {key:'contactEmail',label:'Email de contacto · Opcional',placeholder:'proveedor@example.test'},
];
export function BeneficiaryEditor({editing,existing,onClose,onSubmit}:Props){
  const [form,setForm]=useState<BeneficiaryInput>(()=>editing?{
    name:editing.name,country:editing.country,category:editing.category,
    agreementReference:editing.agreementReference,agreementLimit:editing.agreementLimit,
    contactEmail:editing.contactEmail,notes:editing.notes,
  }:empty);
  const [errors,setErrors]=useState<Record<string,string>>({});
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    ref.current?.focus();
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){onClose();return;}
      if(e.key!=='Tab')return;
      const items=ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])');
      if(!items?.length)return;
      if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items[items.length-1].focus();}
      else if(!e.shiftKey&&document.activeElement===items[items.length-1]){e.preventDefault();items[0].focus();}
    };
    document.addEventListener('keydown',onKey);
    document.body.style.overflow='hidden';
    return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow='';previous?.focus();};
  },[onClose]);
  const update=<K extends keyof BeneficiaryInput>(key:K,value:BeneficiaryInput[K])=>{
    setForm(f=>({...f,[key]:value}));
    setErrors(e=>{const next={...e};delete next[key];return next;});
  };
  const submit=(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    const next=validateBeneficiary(form,existing,editing?.id);
    setErrors(next);
    if(Object.keys(next).length)return;
    onSubmit(form,editing?.id);
  };
  return <div className="bn-modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)onClose();}}>
    <div ref={ref} tabIndex={-1} className="bn-editor" role="dialog" aria-modal="true" aria-labelledby="bn-editor-title">
      <div className="bn-editor-header"><div><span className="bn-eyebrow">TRUST REGISTRY / {editing?'EDIT RECORD':'CREATE RECORD'}</span><h2 id="bn-editor-title">{editing?'Editar beneficiario':'Nuevo beneficiario'}<em>.</em></h2><p>Los cambios se registran en el entorno ficticio de FinVigía.</p></div><button type="button" className="bn-icon-button" aria-label="Cerrar formulario" onClick={onClose}><Icon name="close" size={18}/></button></div>
      <form onSubmit={submit} noValidate className="bn-form">
        {fields.slice(0,1).map(field=><div className="bn-field" key={field.key}><label htmlFor={`bn-${field.key}`}>{field.label} <b>*</b></label><input id={`bn-${field.key}`} autoFocus={!editing} value={String(form[field.key])} placeholder={field.placeholder} onChange={e=>update(field.key,e.target.value as never)} maxLength={95}/>{errors[field.key]&&<span className="bn-field-error" role="alert">{errors[field.key]}</span>}</div>)}
        <div className="bn-field-row">
          <div className="bn-field"><label htmlFor="bn-country">País <b>*</b></label><select id="bn-country" value={form.country} onChange={e=>update('country',e.target.value as BeneficiaryCountry)}>{COUNTRIES.map(country=><option value={country} key={country}>{country}</option>)}</select>{errors.country&&<span className="bn-field-error">{errors.country}</span>}</div>
          <div className="bn-field"><label htmlFor="bn-category">Categoría <b>*</b></label><input id="bn-category" value={form.category} onChange={e=>update('category',e.target.value)} placeholder="Ej. Desarrollo" maxLength={75}/>{errors.category&&<span className="bn-field-error">{errors.category}</span>}</div>
        </div>
        <div className="bn-form-separator"><span>ACUERDO COMERCIAL</span><span>USD ONLY · SANDBOX</span></div>
        <div className="bn-field-row">
          <div className="bn-field"><label htmlFor="bn-agreementReference">Referencia del acuerdo <b>*</b></label><input id="bn-agreementReference" value={form.agreementReference} onChange={e=>update('agreementReference',e.target.value)} placeholder="AGR-2026-001" maxLength={36}/>{errors.agreementReference&&<span className="bn-field-error">{errors.agreementReference}</span>}</div>
          <div className="bn-field"><label htmlFor="bn-agreementLimit">Máximo por factura <b>*</b></label><div className="bn-currency-input"><span>USD</span><input id="bn-agreementLimit" type="number" min="1" max="100000000" step="1" value={form.agreementLimit} onChange={e=>update('agreementLimit',Number(e.target.value))}/></div>{errors.agreementLimit&&<span className="bn-field-error">{errors.agreementLimit}</span>}</div>
        </div>
        <div className="bn-field"><label htmlFor="bn-contactEmail">Email de contacto · Opcional</label><input id="bn-contactEmail" type="email" value={form.contactEmail} onChange={e=>update('contactEmail',e.target.value)} placeholder="contacto@example.test" maxLength={120}/>{errors.contactEmail&&<span className="bn-field-error">{errors.contactEmail}</span>}</div>
        <div className="bn-field"><label htmlFor="bn-notes">Notas internas · Opcional</label><textarea id="bn-notes" value={form.notes} onChange={e=>update('notes',e.target.value)} placeholder="Observaciones para el equipo financiero…" rows={3} maxLength={300}/><small className="bn-field-count">{form.notes.length}/300</small></div>
        <div className="bn-form-notice"><Icon name="shield" size={16}/><p>{editing?'Modificar nombre, país o condiciones comerciales moverá automáticamente este registro a revisión.':'El nuevo beneficiario ingresará como «En revisión» y no podrá recibir autorizaciones automáticas hasta su aprobación.'}</p></div>
        <div className="bn-form-actions"><button type="button" onClick={onClose} className="bn-button bn-button-outline">Cancelar</button><button type="submit" className="bn-button bn-button-primary">{editing?'Guardar cambios':'Crear en revisión'} <Icon name="arrow" size={17}/></button></div>
      </form>
    </div>
  </div>;
}
