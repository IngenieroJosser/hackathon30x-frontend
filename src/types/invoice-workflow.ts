/** Facturas recibidas por el producto, aisladas de cualquier infraestructura de pagos. */
export type ExtractionMethod = 'ai_multimodal' | 'text_heuristic' | 'manual' | 'demo';
export type InvoiceDraft = {
  number: string;
  vendor: string;
  amount: number | null;
  currency: string;
  dueDate: string;
  issueDate: string;
  description: string;
  method: ExtractionMethod;
  warnings: string[];
  evidence: Record<'number' | 'vendor' | 'amount' | 'currency' | 'dueDate', string>;
};
export type InvoiceDocument = {
  fileName: string;
  mimeType: string;
  bytes: number;
  fingerprint: string;
  source: 'PDF' | 'Imagen' | 'Correo';
  extractionMethod: ExtractionMethod;
  extractedAt: string;
  /** Solo metadatos; no se almacena el archivo binario en localStorage. */
  verifiedAt?: string;
  verifiedBy?: string;
  warnings: string[];
  evidence: InvoiceDraft['evidence'];
};
export type InvoiceAuditEvent = {
  id: string;
  invoiceId: string;
  timestamp: string;
  action: 'imported' | 'extracted' | 'verified' | 'evaluated' | 'approved' | 'rejected';
  actor: string;
  reviewNote?: string;
  description: string;
  ruleCode?: string;
  policySnapshot?: { version: string; autonomousLimit: number; hardLimit: number; monthlyBudget: number; currency: 'USD' };
  beneficiarySnapshot?: { id: string; revision: number; status: string; agreementLimit: number };
};
