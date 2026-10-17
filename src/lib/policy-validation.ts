import type { PaymentPolicy } from '@/types/payments';

export type PolicyAmountKey = 'autonomousLimit' | 'hardLimit' | 'monthlyBudget';
export type PolicyValues = Pick<PaymentPolicy, PolicyAmountKey>;
export const POLICY_FIELD_LABEL: Record<PolicyAmountKey, string> = {
  autonomousLimit: 'Límite autónomo',
  hardLimit: 'Límite absoluto',
  monthlyBudget: 'Presupuesto mensual',
};
const fields: PolicyAmountKey[] = ['autonomousLimit', 'hardLimit', 'monthlyBudget'];
const maxAmount = 100_000_000;

/** Fail closed: malformed amounts and inconsistent limits can never be published. */
export function validateDemoPolicy(input: unknown): string[] {
  if (!input || typeof input !== 'object') return ['No se recibieron valores de política.'];
  const value = input as Partial<PaymentPolicy>;
  const errors: string[] = [];
  for (const field of fields) {
    const amount = value[field];
    if (typeof amount !== 'number' || !Number.isFinite(amount) || !Number.isSafeInteger(amount) || amount <= 0 || amount > maxAmount) {
      errors.push(`${POLICY_FIELD_LABEL[field]} debe ser un número entero entre 1 y 100.000.000 USD.`);
    }
  }
  if (errors.length) return errors;
  if (value.autonomousLimit! > value.hardLimit!) errors.push('El límite autónomo no puede superar el límite absoluto.');
  if (value.hardLimit! > value.monthlyBudget!) errors.push('El límite absoluto no puede superar el presupuesto mensual de esta demostración.');
  if (value.currency !== undefined && value.currency !== 'USD') errors.push('La demostración solo admite USD.');
  return errors;
}
