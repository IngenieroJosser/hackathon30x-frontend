import type { Invoice, PaymentPolicy, DecisionResult } from '@/types/payments';
import type { InvoiceDraft } from '@/types/invoice-workflow';
import type { Beneficiary } from '@/lib/beneficiary-registry';
import { invoiceWithBeneficiary, normalName } from '@/lib/beneficiary-registry';
import { evaluateDemoInvoice } from '@/lib/decision-engine';

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const allowed = ['application/pdf','image/jpeg','image/png','image/webp'];

export function validateUpload(file: { name: string; type: string; size: number }): string | null {
  if (file.size < 1 || file.size > MAX_DOCUMENT_BYTES) return 'El archivo debe pesar entre 1 byte y 5 MB.';
  if (!allowed.includes(file.type.toLowerCase())) return 'Solo se permiten PDF, JPG, PNG y WEBP.';
  return null;
}

/** Convierte fechas ISO o DD/MM/YYYY a ISO, evitando el rollover de Date. */
export function normalizeDate(input: string): string {
  const text = input.trim();
  const parts = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(text) || /^([0-9]{2})[\/\-.]([0-9]{2})[\/\-.]([0-9]{4})$/.exec(text);
  if (!parts) return '';
  const [y,m,d] = parts[1].length === 4 ? [Number(parts[1]),Number(parts[2]),Number(parts[3])] : [Number(parts[3]),Number(parts[2]),Number(parts[1])];
  if (y < 2020 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return '';
  const valid = new Date(Date.UTC(y,m-1,d));
  if (valid.getUTCFullYear()!==y || valid.getUTCMonth()!==m-1 || valid.getUTCDate()!==d) return '';
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

export function parseAmount(input: unknown): number | null {
  if (typeof input === 'number') return Number.isFinite(input) && input > 0 && input <= 1e9 ? Math.round(input*100)/100 : null;
  if (typeof input !== 'string') return null;
  let value = input.replace(/(?:USD|COP|MXN|EUR|BRL|US\$|\$)/gi,'').replace(/\s/g,'');
  if (!/^[\d.,]+$/.test(value)) return null;
  // Separador decimal definido por el último signo, si hay dos; para uno, 3 dígitos finales indican miles.
  const lastComma=value.lastIndexOf(','), lastDot=value.lastIndexOf('.');
  if (lastComma!==-1&&lastDot!==-1) value = lastComma>lastDot ? value.replace(/\./g,'').replace(',','.') : value.replace(/,/g,'');
  else if (lastComma!==-1) value = /,\d{1,2}$/.test(value) ? value.replace(',','.') : value.replace(/,/g,'');
  else if (lastDot!==-1 && /\.\d{3}$/.test(value)) value=value.replace(/\./g,'');
  const num=Number(value);
  return Number.isFinite(num) && num>0 && num<=1e9 && Math.abs(Math.round(num*100)/100-num)<1e-7 ? num : null;
}

export function sanitizeDraft(input: Partial<InvoiceDraft>): InvoiceDraft {
  const warnings=Array.isArray(input.warnings)? input.warnings.filter(x=>typeof x==='string').slice(0,12).map(x=>x.slice(0,220)):[];
  const evidence = input.evidence && typeof input.evidence==='object' ? input.evidence : {} as InvoiceDraft['evidence'];
  const fields = ['number','vendor','amount','currency','dueDate'] as const;
  const cleanEvidence = Object.fromEntries(fields.map(k=>[k,typeof evidence[k]==='string'?evidence[k].slice(0,220):''])) as InvoiceDraft['evidence'];
  const amount=parseAmount(input.amount);
  const vendor=typeof input.vendor==='string' ? input.vendor.trim().slice(0,100) : '';
  const number=typeof input.number==='string' ? input.number.trim().slice(0,70) : '';
  const dueDate=normalizeDate(String(input.dueDate??''));
  const currency=String(input.currency??'').trim().toUpperCase().slice(0,6);
  if (!number) warnings.push('Falta el número de factura.');
  if (!vendor) warnings.push('Falta el beneficiario.');
  if (amount===null) warnings.push('No se pudo verificar un importe válido.');
  if (!dueDate) warnings.push('La fecha de vencimiento es ilegible o no está disponible.');
  if (!currency || !/^[A-Z]{3}$/.test(currency)) warnings.push('Falta la moneda de facturación.');
  if (currency && currency !== 'USD') warnings.push('La moneda no es USD: requiere revisión; no hay tasa de cambio configurada.');
  return { number,vendor,amount,currency,dueDate,issueDate:normalizeDate(String(input.issueDate??'')),description:String(input.description??'').slice(0,350),method:input.method??'manual',warnings:[...new Set(warnings)],evidence:cleanEvidence };
}

export function validateDraftForReview(draft: InvoiceDraft): string[] {
  const errors: string[]=[];
  if (draft.number.length<3 || draft.number.length>70) errors.push('El número debe tener de 3 a 70 caracteres.');
  if (draft.vendor.length<3 || draft.vendor.length>100) errors.push('El beneficiario debe tener entre 3 y 100 caracteres.');
  if (draft.amount===null || draft.amount<=0) errors.push('El importe debe ser mayor que cero.');
  if (!/^[A-Z]{3}$/.test(draft.currency)) errors.push('Se necesita un código de moneda ISO de tres letras.');
  if (!normalizeDate(draft.dueDate)) errors.push('La fecha de vencimiento debe ser válida.');
  return errors;
}

const normalizeNumber = (value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export function findDuplicate(invoice: Pick<Invoice,'id'|'vendor'|'number'>, other: Invoice[]):Invoice|undefined {
  const ref=normalizeNumber(invoice.number), vendor=normalName(invoice.vendor);
  if(!ref || !vendor)return undefined;
  return other.find(item=>item.id!==invoice.id && normalName(item.vendor)===vendor && normalizeNumber(item.number)===ref);
}

/**
 * Evaluación PURA para lectura, previsualización y prerender. No consulta reloj,
 * navegador ni almacenamiento: mismo contexto => mismo resultado.
 */
export function previewInvoiceDecision(invoice:Invoice, previous:Invoice[], policy:PaymentPolicy, beneficiaries:Beneficiary[]):Invoice {
  const duplicate=findDuplicate(invoice,previous);
  const source=invoiceWithBeneficiary({...invoice,duplicateOf:duplicate?.number},beneficiaries);
  const consumed=previous.filter(x=>x.status==='authorized'&&x.id!==invoice.id&&x.currency==='USD').reduce((total,x)=>total+x.amount,0);
  const remaining=Math.max(0,policy.monthlyBudget-consumed);
  const result:DecisionResult = evaluateDemoInvoice(source,policy,remaining);
  return {...source,...result,policyVersion:policy.version};
}

/**
 * Sella la fecha SOLO al registrar una evaluación mediante una acción explícita.
 * Nunca debe llamarse durante un render o useMemo de un componente React.
 */
export function evaluateInvoiceSafely(invoice:Invoice, previous:Invoice[], policy:PaymentPolicy, beneficiaries:Beneficiary[], evaluatedAt?:string):Invoice {
  return {...previewInvoiceDecision(invoice,previous,policy,beneficiaries),evaluatedAt:evaluatedAt??new Date().toISOString()};
}

export function heuristicTextExtraction(text:string):InvoiceDraft {
  const pick=(pattern:RegExp)=>text.match(pattern)?.[1]?.trim()??'';
  const vendor=pick(/(?:proveedor|beneficiario|vendor|from|emisor)\s*[:\-]\s*([^\n\r]{3,90})/i);
  const number=pick(/(?:n[úu]mero(?:\s+de\s+factura)?|invoice\s*(?:no\.?|number|#)|factura(?:\s*(?:n[oú.]?|#))?)\s*[:#\-]?\s*([A-Z0-9\-/]{3,70})/i);
  const amountText=pick(/(?:total(?:\s+a\s+pagar)?|importe(?:\s+total)?|amount(?:\s+due)?)\s*[:\-]?\s*(?:US\$|\$)?\s*([0-9.,]+)/i);
  const dueDate=pick(/(?:vencimiento|due\s*date|fecha\s*(?:de\s*)?vencimiento)\s*[:\-]\s*([\d/\-.]{8,10})/i);
  const currency=pick(/(?:moneda|currency)\s*[:\-]\s*(USD|COP|MXN|BRL|EUR)/i) || (/(?:US\$|\bUSD\b)/i.test(text)?'USD':'');
  return sanitizeDraft({vendor,number,amount:parseAmount(amountText),currency,dueDate,issueDate:'',description:'',method:'text_heuristic',warnings:['Extracción heurística de texto: confirma los campos antes de evaluar.'],evidence:{vendor,number,amount:amountText,currency,dueDate}});
}
