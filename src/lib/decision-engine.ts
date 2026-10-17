import type { DecisionResult, Invoice, PaymentPolicy } from '@/types/payments';

/**
 * Regla determinista de demostración. Solo evalúa datos sintéticos en el cliente.
 * En producción debe ejecutarse en un servicio seguro, con persistencia,
 * validación documental y reserva transaccional del presupuesto.
 */
export function evaluateDemoInvoice(
  invoice: Invoice,
  policy: PaymentPolicy,
  remainingBudget: number,
): DecisionResult {
  if (invoice.duplicateOf) return {
    status: 'blocked', ruleCode: 'DUPLICATE_INVOICE',
    reason: `Coincide con la factura ${invoice.duplicateOf} registrada anteriormente. No se permiten cobros duplicados.`,
    checks: ['Identidad de factura duplicada', 'Autorización bloqueada antes de validar límites'],
  };
  if (!invoice.approvedVendor) return {
    status: 'blocked', ruleCode: 'VENDOR_NOT_ALLOWED',
    reason: 'El beneficiario no figura en la lista de proveedores autorizados de la empresa.',
    checks: ['Beneficiario fuera de lista permitida', 'No se genera autorización'],
  };
  if (invoice.agreementLimit !== undefined && invoice.amount > invoice.agreementLimit) return {
    status: 'blocked', ruleCode: 'AGREEMENT_MISMATCH',
    reason: `El importe supera el acuerdo configurado de ${invoice.agreementLimit.toLocaleString('en-US')} USD.`,
    checks: ['Importe superior al acuerdo comercial', 'Se requiere corregir el acuerdo o la factura'],
  };
  if (invoice.amount > policy.hardLimit) return {
    status: 'blocked', ruleCode: 'HARD_LIMIT_EXCEEDED',
    reason: `Supera el límite absoluto de ${policy.hardLimit.toLocaleString('en-US')} USD por factura.`,
    checks: ['Límite absoluto excedido', 'Una aprobación ordinaria no puede omitir esta regla'],
  };
  if (invoice.amount > remainingBudget) return {
    status: 'blocked', ruleCode: 'BUDGET_INSUFFICIENT',
    reason: 'No existe presupuesto disponible suficiente para autorizar esta factura.',
    checks: ['Presupuesto disponible insuficiente', 'No se reserva dinero'],
  };
  if (invoice.confidence === 'needs_review') return {
    status: 'pending', ruleCode: 'LOW_CONFIDENCE',
    reason: 'La información crítica del documento requiere validación humana.',
    checks: ['Documento pendiente de verificación', 'No se autoriza automáticamente'],
  };
  if (invoice.amount > policy.autonomousLimit) return {
    status: 'pending', ruleCode: 'APPROVAL_REQUIRED',
    reason: `Supera el umbral autónomo de ${policy.autonomousLimit.toLocaleString('en-US')} USD. Requiere aprobación humana.`,
    checks: ['Beneficiario y acuerdo validados', 'Dentro del límite absoluto y del presupuesto', 'Aprobación humana pendiente'],
  };
  return {
    status: 'authorized', ruleCode: 'ALL_POLICIES_PASSED',
    reason: 'Factura elegible: beneficiario, acuerdo, presupuesto y límites cumplen las políticas.',
    checks: ['Beneficiario permitido', 'No duplicada', 'Acuerdo verificado', 'Presupuesto suficiente', 'Dentro del límite autónomo'],
  };
}
