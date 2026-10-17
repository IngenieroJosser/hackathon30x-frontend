/** Tipos de dominio para el frontend. No representan movimientos bancarios. */
export type DecisionStatus = 'authorized' | 'blocked' | 'pending' | 'unprocessed';

export type Invoice = {
  id: string;
  number: string;
  vendor: string;
  vendorInitials: string;
  country: string;
  countryCode: string;
  category: string;
  amount: number;
  currency: 'USD';
  dueDate: string; // ISO 8601
  receivedAt: string; // ISO 8601
  status: DecisionStatus;
  reason: string;
  ruleCode: string;
  checks: string[];
  source: 'PDF' | 'Correo' | 'Imagen';
  confidence: 'high' | 'needs_review';
  // These are simulated input flags, not outputs from an LLM.
  approvedVendor: boolean;
  duplicateOf?: string;
  agreementLimit?: number;
  reviewedBy?: string;
  beneficiaryRevision?: string; // referencia ficticia del proveedor al decidir
  policyVersion?: string; // versión asociada a la evaluación o resolución ficticia
};

export type PaymentPolicy = {
  version: string;
  autonomousLimit: number;
  hardLimit: number;
  monthlyBudget: number;
  currency: 'USD';
};

export type DecisionResult = {
  status: Exclude<DecisionStatus, 'unprocessed'>;
  reason: string;
  ruleCode: string;
  checks: string[];
};

export type DecisionFilter = 'all' | 'authorized' | 'blocked' | 'pending';
