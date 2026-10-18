import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha esperada YYYY-MM-DD');
export const registerInvoiceSchema = z.object({
  sandbox: z.literal(true),
  externalNumber: z.string().trim().min(3).max(80).optional(),
  vendorName: z.string().trim().min(3).max(160).optional(),
  // Decimales como string para evitar errores de precisión IEEE754 en importes financieros.
  amount: z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/, 'Monto decimal positivo').refine(x=>Number(x)>0).optional(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
  issueDate: isoDate.optional(),
  dueDate: isoDate.optional(),
  description: z.string().trim().max(500).optional(),
  source: z.enum(['PDF','IMAGE','EMAIL','TEXT']).default('TEXT'),
  idempotencyKey: z.string().min(8).max(120).optional(),
}).strict();

export function parseUTCDate(value: string | undefined): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.toISOString().slice(0,10) !== value) throw new Error('Fecha inexistente: '+value);
  return date;
}
