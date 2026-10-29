import type { Invoice, PaymentPolicy } from '@/types/payments';
import type { Beneficiary } from '@/lib/beneficiary-registry';
import { previewInvoiceDecision } from '@/lib/invoice-processing';

/**
 * Functional preview of a human-approval attempt. The same guard is re-run by
 * the write operation; UI affordances do not grant permission to authorize.
 * All values belong to the synthetic browser-only sandbox académico.
 */
export function assessHumanApproval(
  invoice: Invoice,
  invoices: Invoice[],
  policy: PaymentPolicy,
  beneficiaries: Beneficiary[],
) {
  const candidate = previewInvoiceDecision(
    invoice,
    invoices.filter(item => item.id !== invoice.id),
    policy,
    beneficiaries,
  );
  const reasons: string[] = [];
  if (invoice.status !== 'pending') reasons.push('El expediente ya no tiene una solicitud pendiente.');
  if (invoice.document && invoice.verified !== true) reasons.push('El documento requiere verificación humana de sus campos.');
  if (candidate.ruleCode !== 'APPROVAL_REQUIRED') reasons.push(candidate.reason);
  return {
    eligible: reasons.length === 0,
    reasons,
    candidate,
    policyChanged: Boolean(invoice.policyVersion && invoice.policyVersion !== policy.version),
    vendorChanged: Boolean(invoice.beneficiaryRevision && candidate.beneficiaryRevision !== invoice.beneficiaryRevision),
  };
}

/** An empty or generic note is not an accountable human review. */
export function validateReviewNote(value: string): string | null {
  const note = value.trim().replace(/\s+/g, ' ');
  if (note.length < 12) return 'Explica el motivo de la decisión con al menos 12 caracteres.';
  if (note.length > 500) return 'El comentario no puede superar 500 caracteres.';
  return null;
}
