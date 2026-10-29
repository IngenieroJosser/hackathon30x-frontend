import { DEMO_POLICY } from '@/lib/mock-data';
import type { PaymentPolicy } from '@/types/payments';
import { validateDemoPolicy, type PolicyAmountKey, type PolicyValues } from '@/lib/policy-validation';

export { POLICY_FIELD_LABEL, validateDemoPolicy } from '@/lib/policy-validation';
export type { PolicyAmountKey, PolicyValues } from '@/lib/policy-validation';

export const POLICY_STORAGE_KEY = 'finvigia-sandbox:active-policy:v1';
export const POLICY_HISTORY_KEY = 'finvigia-sandbox:policy-events:v1';
export const POLICY_UPDATED_EVENT = 'finvigia-sandbox:policy-updated';
export type PolicyHistoryEvent = {
  id: string;
  at: string;
  actor: 'Administrador financiero · Demo';
  version: string;
  changes: { field: PolicyAmountKey; previous: number; next: number }[];
};
const amountFields: PolicyAmountKey[] = ['autonomousLimit', 'hardLimit', 'monthlyBudget'];

export function getDemoPolicy(): PaymentPolicy {
  if (typeof window === 'undefined') return DEMO_POLICY;
  try {
    const content = window.localStorage.getItem(POLICY_STORAGE_KEY);
    if (!content) return DEMO_POLICY;
    const value: unknown = JSON.parse(content);
    if (validateDemoPolicy(value).length) return DEMO_POLICY;
    const record = value as PaymentPolicy;
    return {
      version: typeof record.version === 'string' && /^POL-2026\.10 · v1\.\d+$/.test(record.version) ? record.version : DEMO_POLICY.version,
      currency: 'USD',
      autonomousLimit: record.autonomousLimit,
      hardLimit: record.hardLimit,
      monthlyBudget: record.monthlyBudget,
    };
  } catch { return DEMO_POLICY; }
}

export function getDemoPolicyHistory(): PolicyHistoryEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(POLICY_HISTORY_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is PolicyHistoryEvent =>
      Boolean(entry && typeof entry === 'object' && typeof entry.version === 'string' && typeof entry.at === 'string' && Array.isArray(entry.changes)))
      .slice(0, 15);
  } catch { return []; }
}

/** Writes to local browser storage for demostración académica only. Not a production policy service. */
export function publishDemoPolicy(values: PolicyValues): { policy: PaymentPolicy; event: PolicyHistoryEvent | null } {
  const errors = validateDemoPolicy({ ...values, currency: 'USD' });
  if (errors.length) throw new Error(errors.join(' '));
  if (typeof window === 'undefined') throw new Error('Esta operación necesita un navegador.');
  const previous = getDemoPolicy();
  const changes = amountFields.flatMap(field => previous[field] === values[field] ? [] : [{field,previous:previous[field],next:values[field]}]);
  if (!changes.length) return {policy: previous, event: null};
  const versionIndex = Number(previous.version.match(/v1\.(\d+)/)?.[1] ?? '3') + 1;
  const policy: PaymentPolicy = {...values,currency:'USD',version:`POL-2026.10 · v1.${versionIndex}`};
  const event: PolicyHistoryEvent = {
    id:`${Date.now()}-${versionIndex}`,at:new Date().toISOString(),actor:'Administrador financiero · Demo',version:policy.version,changes,
  };
  // Save audit record before active policy to avoid a visible new policy without a change event.
  window.localStorage.setItem(POLICY_HISTORY_KEY,JSON.stringify([event,...getDemoPolicyHistory()].slice(0,15)));
  window.localStorage.setItem(POLICY_STORAGE_KEY,JSON.stringify(policy));
  window.dispatchEvent(new CustomEvent(POLICY_UPDATED_EVENT));
  return {policy,event};
}
