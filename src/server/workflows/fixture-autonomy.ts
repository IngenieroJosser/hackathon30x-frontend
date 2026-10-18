/**
 * Autonomía acotada del sandbox: no se confía en el LLM para validar un documento.
 * Se permite omitir la confirmación humana únicamente para bytes idénticos a un
 * ejemplar sintético conocido, cuando TODOS los campos extraídos coinciden.
 * La decisión financiera sigue siendo exclusiva del motor transaccional.
 */
import { createHash } from 'node:crypto';
import manifest from '../../../public/demo/facturas/manifest.json' with { type: 'json' };
import { normalizeDate, validateDraftForReview } from '@/lib/invoice-processing';
import { isSandboxDisclaimer } from '@/lib/document-notices';
import type { InvoiceDraft } from '@/types/invoice-workflow';

type TrustedFixture = (typeof manifest.cases)[number];
export type FixtureMatch = { trusted: true; id: string; sha256: string };
export type FixtureReview = { trusted: false; reason: string };
export type FixtureCheck = FixtureMatch | FixtureReview;

const compareText = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
const compareInvoice = (value: string) => value.normalize('NFKD').toUpperCase().replace(/[^A-Z0-9]/g, '');

function mimeMatchesFixture(item: TrustedFixture, mime: string): boolean {
  return item.type === 'PDF' ? mime === 'application/pdf'
    : item.type === 'PNG' ? mime === 'image/png'
    : item.type === 'TXT' ? mime === 'text/plain'
    : false;
}

export function checkCertifiedFixture(bytes: Buffer, mime: string, draft: InvoiceDraft): FixtureCheck {
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  return checkCertifiedFixtureHash(sha256,mime,draft);
}

/** Para una factura previamente importada, la huella se recupera de Neon. */
export function checkCertifiedFixtureHash(sha256: string, mime: string, draft: InvoiceDraft): FixtureCheck {
  const found = manifest.cases.find(item => item.sha256 === sha256 && mimeMatchesFixture(item, mime));
  if (!found) return { trusted: false, reason: 'Documento ajeno al conjunto certificado: requiere verificación humana.' };

  // No permitir que un documento incompleto se certifique con inferencias de la IA.
  if (validateDraftForReview(draft).length > 0)
    return { trusted: false, reason: `Caso ${found.id}: faltan campos críticos; requiere revisión humana.` };
  if (found.amount === null || !found.due || !found.currency)
    return { trusted: false, reason: `Caso ${found.id}: el documento de referencia contiene campos ambiguos o incompletos.` };
  if (draft.method !== 'ai_multimodal')
    return { trusted: false, reason: 'La certificación automática requiere extracción multimodal con IA.' };

  const agrees = compareInvoice(draft.number) === compareInvoice(found.number)
    && compareText(draft.vendor) === compareText(found.vendor)
    && draft.amount !== null && Math.round(draft.amount * 100) === Math.round(found.amount * 100)
    && draft.currency === found.currency
    && normalizeDate(draft.dueDate) === found.due;
  if (!agrees)
    return { trusted: false, reason: `Caso ${found.id}: la IA no coincide con los datos certificados. Revisar los campos.` };

  // El aviso de moneda distinta de USD es una regla financiera: el motor
  // produce ESCALATED, nunca AUTHORIZED. No es una falla de lectura del PDF.
  const policyWarnings = new Set(['La moneda no es USD: requiere revisión; no hay tasa de cambio configurada.']);
  const material = draft.warnings.filter(w => !isSandboxDisclaimer(w) && !policyWarnings.has(w));
  if (material.length)
    return { trusted: false, reason: `Caso ${found.id}: la extracción incluye alertas materiales; se requiere revisión humana.` };

  return { trusted: true, id: found.id, sha256 };
}
