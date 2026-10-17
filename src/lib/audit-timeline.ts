/**
 * Auditoría de la DEMO: compone eventos locales, sin fabricar decisiones históricas.
 * No constituye un log inmutable, sellado ni firmado. Producción: backend + eventos append-only.
 */
import type { Invoice } from '@/types/payments';
import type { InvoiceAuditEvent } from '@/types/invoice-workflow';
import type { PolicyHistoryEvent } from '@/lib/policy-store';
import type { RegistryEvent } from '@/lib/beneficiary-registry';

export type AuditCategory = 'invoice' | 'approval' | 'policy' | 'beneficiary' | 'baseline';
export type AuditEntry = {
  id: string;
  category: AuditCategory;
  timestamp: string;
  entityId: string;
  title: string;
  description: string;
  actor: string;
  action: string;
  reference: string;
  ruleCode?: string;
  invoice?: Invoice;
  invoiceEvent?: InvoiceAuditEvent;
  policyEvent?: PolicyHistoryEvent;
  registryEvent?: RegistryEvent;
  evidence: 'recorded' | 'not-recorded';
};

const invoiceActions: Record<InvoiceAuditEvent['action'],string> = {
  imported:'Factura recibida', extracted:'Extracción documental', verified:'Campos confirmados',
  evaluated:'Decisión del agente', approved:'Autorización humana', rejected:'Rechazo humano',
};
const registryActions: Record<RegistryEvent['action'],string> = {
  created:'Beneficiario registrado', updated:'Acuerdo modificado',
  authorized:'Beneficiario autorizado', review:'Beneficiario en revisión', blocked:'Beneficiario bloqueado',
};

/** Determinista e independiente de Date.now / efectos de navegador. */
export function buildAuditTimeline(
  invoices: Invoice[],
  invoiceEvents: InvoiceAuditEvent[],
  policyEvents: PolicyHistoryEvent[],
  registryEvents: RegistryEvent[],
): AuditEntry[] {
  const byId = new Map(invoices.map(invoice=>[invoice.id,invoice]));
  const auditedIds = new Set(invoiceEvents.map(event=>event.invoiceId));
  const entries:AuditEntry[] = [];
  for(const event of invoiceEvents){
    const invoice=byId.get(event.invoiceId);
    entries.push({
      id:`invoice:${event.id}`,
      category:event.action==='approved'||event.action==='rejected'?'approval':'invoice',
      timestamp:event.timestamp,
      entityId:event.invoiceId,
      title:invoiceActions[event.action],
      description:event.description,
      actor:event.actor,
      action:event.action,
      reference:invoice?.number??event.invoiceId,
      ruleCode:event.ruleCode,
      invoice,invoiceEvent:event,evidence:'recorded',
    });
  }
  for(const event of policyEvents){
    entries.push({
      id:`policy:${event.id}`,category:'policy',timestamp:event.at,entityId:event.version,
      title:'Política publicada',
      description:`${event.changes.length} ${event.changes.length===1?'límite modificado':'límites modificados'} en la configuración financiera.`,
      actor:event.actor,action:'published',reference:event.version,policyEvent:event,evidence:'recorded',
    });
  }
  for(const event of registryEvents){
    entries.push({
      id:`beneficiary:${event.id}`,category:'beneficiary',timestamp:event.occurredAt,entityId:event.beneficiaryId,
      title:registryActions[event.action],description:`${event.name} · Registro revisión ${event.revision}.`,
      actor:event.actor,action:event.action,reference:event.name,registryEvent:event,evidence:'recorded',
    });
  }
  // Los fixtures iniciales no tienen eventos históricos: se muestran explícitamente
  // como estado importado NO AUDITABLE, nunca como evaluaciones inventadas.
  for(const invoice of invoices){
    if(auditedIds.has(invoice.id))continue;
    entries.push({
      id:`baseline:${invoice.id}`,category:'baseline',timestamp:invoice.receivedAt,
      entityId:invoice.id,title:'Estado inicial sin eventos',
      description:'Esta factura pertenece al conjunto de demostración y no dispone de historial de decisiones persistido.',
      actor:'Datos sintéticos precargados',action:'baseline',reference:invoice.number,invoice,evidence:'not-recorded',
    });
  }
  return entries.sort((a,b)=> b.timestamp.localeCompare(a.timestamp) || a.id.localeCompare(b.id));
}

export function auditCoverage(invoices:Invoice[],invoiceEvents:InvoiceAuditEvent[]){
  const observed = new Set(invoiceEvents.map(e=>e.invoiceId));
  const covered=invoices.filter(invoice=>observed.has(invoice.id)).length;
  return {covered,total:invoices.length,missing:invoices.length-covered,
    percent:invoices.length?Math.round(100*covered/invoices.length):0};
}

export function searchAuditEntries(entries:AuditEntry[], query:string,category:AuditCategory|'all'){
  const term=query.trim().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return entries.filter(entry=>{
    if(category!=='all'&&entry.category!==category)return false;
    if(!term)return true;
    const haystack=[entry.title,entry.description,entry.actor,entry.reference,entry.ruleCode,
      entry.invoice?.vendor,entry.invoice?.number,entry.invoiceEvent?.reviewNote,
      entry.policyEvent?.changes.map(c=>c.field).join(' '),entry.registryEvent?.name].filter(Boolean).join(' ').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return haystack.includes(term);
  });
}

export function exportAuditPayload(entries:AuditEntry[], coverage:ReturnType<typeof auditCoverage>, activePolicyVersion:string){
  return {environment:'SANDBOX', realPaymentsExecuted:false, origin:'browser-localStorage',
    tamperProof:false, historicalCompleteness:false, disclaimer:'Eventos locales de prueba, editables en el navegador; no constituyen auditoría financiera inmutable.',
    activePolicyVersion, coverage, records:entries};
}
