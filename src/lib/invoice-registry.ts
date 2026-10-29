/** Shared browser storage for the sandbox académico. NOT financial-grade persistence. */
import type {Invoice, PaymentPolicy} from '@/types/payments';
import type {InvoiceAuditEvent, InvoiceDraft, InvoiceDocument} from '@/types/invoice-workflow';
import {INITIAL_INVOICES,DEMO_BATCH} from '@/lib/mock-data';
import { getDemoPolicy } from '@/lib/policy-store';
import { getDemoBeneficiaries,invoiceWithBeneficiary,normalName,type Beneficiary } from '@/lib/beneficiary-registry';
import {evaluateInvoiceSafely,validateDraftForReview} from '@/lib/invoice-processing';
import {assessHumanApproval,validateReviewNote} from '@/lib/approval-workflow';

export const INVOICE_STORE_KEY='finvigia-sandbox:invoices:v2';
export const INVOICE_EVENT_KEY='finvigia-sandbox:invoice-events:v2';
export const INVOICE_UPDATED_EVENT='finvigia-sandbox:invoices-updated';
const ACTOR='Admin Finance · Sandbox';

function isInvoice(x:unknown):x is Invoice{
  if(!x||typeof x!=='object')return false;
  const r=x as Partial<Invoice>;
  return typeof r.id==='string' && r.id.length<100 && typeof r.number==='string'&&typeof r.vendor==='string'&&typeof r.amount==='number'&&Number.isFinite(r.amount)&&(r.amount>0||(r.amount===0&&r.status==='unprocessed')) && typeof r.currency==='string' && typeof r.dueDate==='string' && ['authorized','blocked','pending','unprocessed'].includes(r.status??'')&&typeof r.ruleCode==='string'&&typeof r.reason==='string'&&Array.isArray(r.checks);
}
export function getInvoices():Invoice[]{
  if(typeof window==='undefined')return INITIAL_INVOICES.map(x=>({...x}));
  try{const raw=localStorage.getItem(INVOICE_STORE_KEY);if(!raw)return INITIAL_INVOICES.map(x=>({...x}));const items:unknown=JSON.parse(raw);if(Array.isArray(items)&&items.length<=600&&items.every(isInvoice))return items as Invoice[];}catch{}
  return INITIAL_INVOICES.map(x=>({...x}));
}
export function getInvoiceEvents():InvoiceAuditEvent[]{
  if(typeof window==='undefined')return [];
  try{const value:unknown=JSON.parse(localStorage.getItem(INVOICE_EVENT_KEY)??'[]');return Array.isArray(value)?value.slice(0,1000) as InvoiceAuditEvent[]:[];}catch{return [];}
}
function event(invoiceId:string,action:InvoiceAuditEvent['action'],description:string,more:Partial<InvoiceAuditEvent>={}):InvoiceAuditEvent {
  return {id:crypto.randomUUID(),invoiceId,action,description,timestamp:new Date().toISOString(),actor:ACTOR,...more};
}
function commit(items:Invoice[],newEvents:InvoiceAuditEvent[]){
  if(typeof window==='undefined')throw new Error('La demo requiere un navegador.');
  // Best effort local writes; NOT atomic or tamper proof. Backend + DB required for production.
  localStorage.setItem(INVOICE_EVENT_KEY,JSON.stringify([...newEvents,...getInvoiceEvents()].slice(0,1000)));
  localStorage.setItem(INVOICE_STORE_KEY,JSON.stringify(items.slice(0,600)));
  window.dispatchEvent(new CustomEvent(INVOICE_UPDATED_EVENT));
}
export function createDocumentInvoice(draft:InvoiceDraft,doc:InvoiceDocument):Invoice{
  const now=new Date().toISOString();
  const validAmount=draft.amount ?? 0;
  return {id:`doc-${crypto.randomUUID()}`,number:draft.number||'PENDIENTE',vendor:draft.vendor||'SIN IDENTIFICAR',vendorInitials:draft.vendor.slice(0,2).toUpperCase()||'--',country:'Por validar',countryCode:'--',category:draft.description||'Servicios',amount:validAmount,currency:draft.currency||'N/D',dueDate:draft.dueDate||'',receivedAt:now,status:'unprocessed',ruleCode:'UNVERIFIED_EXTRACTION',reason:'Los datos extraídos aún no fueron confirmados por una persona.',checks:['Validación documental pendiente'],source:doc.source,confidence:'needs_review',approvedVendor:false,document:doc,issuedAt:draft.issueDate,description:draft.description,verified:false,sourceType:'uploaded'};
}
export function saveExtractedDocument(draft:InvoiceDraft,doc:InvoiceDocument):Invoice{
  const invoice=createDocumentInvoice(draft,doc);
  const items=getInvoices();
  commit([invoice,...items],[event(invoice.id,'imported',`Recepción de ${doc.fileName}`),event(invoice.id,'extracted',`Extracción ${doc.extractionMethod}; falta verificación de campos.`)]);
  return invoice;
}
export function verifyAndEvaluate(id:string,draft:InvoiceDraft,opts?:{policy?:PaymentPolicy;beneficiaries?:Beneficiary[]}):Invoice {
  const errors=validateDraftForReview(draft);
  if(errors.length)throw new Error(errors[0]);
  const current=getInvoices();const existing=current.find(x=>x.id===id);
  if(!existing)throw new Error('Factura no encontrada.');
  if(existing.status!=='unprocessed')throw new Error('Esta factura ya tiene una decisión.');
  const policy=opts?.policy??getDemoPolicy(),beneficiaries=opts?.beneficiaries??getDemoBeneficiaries();
  const beneficiary=beneficiaries.find(b=>normalName(b.name)===normalName(draft.vendor));
  const confirmed:Invoice={...existing,country:beneficiary?.country??'Sin registrar',category:beneficiary?.category??(draft.description||'Sin categoría'),number:draft.number,vendor:draft.vendor,amount:draft.amount!,currency:draft.currency,dueDate:draft.dueDate,issuedAt:draft.issueDate,description:draft.description,confidence:'high',verified:true,document:existing.document?{...existing.document,verifiedAt:new Date().toISOString(),verifiedBy:ACTOR}:undefined};
  const checked=evaluateInvoiceSafely(confirmed,current,policy,beneficiaries);
  const updated=current.map(item=>item.id===id?checked:item);
  commit(updated,[event(id,'verified','Campos extraídos confirmados por un operador.'),event(id,'evaluated',checked.reason,{ruleCode:checked.ruleCode,policySnapshot:{...policy},beneficiarySnapshot:beneficiary?{id:beneficiary.id,revision:beneficiary.revision,status:beneficiary.status,agreementLimit:beneficiary.agreementLimit}:undefined})]);
  return checked;
}
export function runDemoBatch():Invoice[]{
  let items=getInvoices();
  const existing=items.filter(x=>x.id.startsWith('batch-'));
  if(existing.length)return existing;
  const policy=getDemoPolicy(),beneficiaries=getDemoBeneficiaries();
  const outcomes:Invoice[]=[];
  for(const source of DEMO_BATCH){
    const invoice=evaluateInvoiceSafely(invoiceWithBeneficiary({...source,verified:true,sourceType:'seed'},beneficiaries),[...outcomes,...items],policy,beneficiaries);
    outcomes.push(invoice);
  }
  items=[...outcomes,...items];
  commit(items,outcomes.map(x=>event(x.id,'evaluated',x.reason,{ruleCode:x.ruleCode,policySnapshot:{...policy}})));
  return outcomes;
}
/** Human-in-the-loop sandbox action; a reason is mandatory for either outcome. */
export function resolveInvoice(id:string,approved:boolean,justification:string):Invoice{
  const note=justification.trim().replace(/\s+/g,' ');
  const noteError=validateReviewNote(note);
  if(noteError)throw new Error(noteError);
  const items=getInvoices();const existing=items.find(x=>x.id===id);
  if(!existing||existing.status!=='pending')throw new Error('La solicitud ya no está pendiente. Actualiza la bandeja.');
  const policy=getDemoPolicy();
  const beneficiaries=getDemoBeneficiaries();
  const assessment=assessHumanApproval(existing,items,policy,beneficiaries);
  if(approved&&!assessment.eligible)throw new Error(`No se puede aprobar: ${assessment.reasons.join(' ')}`);
  const checked=assessment.candidate;
  const beneficiary=beneficiaries.find(b=>normalName(b.name)===normalName(existing.vendor));
  const reviewedAt=new Date().toISOString();
  const next:Invoice=approved?
    {...checked,evaluatedAt:reviewedAt,status:'authorized',ruleCode:'HUMAN_APPROVAL_GRANTED',reviewedBy:ACTOR,reviewedAt,reviewNote:note,
      reason:'Autorización humana simulada tras reevaluar las políticas vigentes. Motivo: '+note,
      checks:[...checked.checks,'Aprobación explícita de Admin Finance · Sandbox']}:
    {...existing,status:'blocked',ruleCode:'HUMAN_APPROVAL_REJECTED',reviewedBy:ACTOR,reviewedAt,reviewNote:note,
      reason:'Solicitud rechazada por revisión humana. Motivo: '+note,
      checks:[...existing.checks,'Rechazo humano registrado con justificación']};
  commit(items.map(x=>x.id===id?next:x),[event(id,approved?'approved':'rejected',next.reason,{
    ruleCode:next.ruleCode,reviewNote:note,policySnapshot:{...policy},
    beneficiarySnapshot:beneficiary?{id:beneficiary.id,revision:beneficiary.revision,status:beneficiary.status,agreementLimit:beneficiary.agreementLimit}:undefined,
  })]);
  return next;
}
export function hasDemoBatch():boolean{return getInvoices().some(item=>item.id.startsWith('batch-'));}
