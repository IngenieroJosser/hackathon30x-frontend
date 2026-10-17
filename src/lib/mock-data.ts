import type { Invoice, PaymentPolicy } from '@/types/payments';

/** 100 % ficticio: empresas, importes, fechas, reglas y resultados. */
export const DEMO_POLICY: PaymentPolicy = {
  version: 'POL-2026.10 · v1.3', autonomousLimit: 1000, hardLimit: 5000,
  monthlyBudget: 20000, currency: 'USD',
};

const base: Omit<Invoice, 'status' | 'reason' | 'ruleCode' | 'checks'>[] = [
  { id: 'inv-01', number: 'INV-2026-1042', vendor: 'Northstar Studio', vendorInitials: 'NS', country: 'Colombia', countryCode: 'CO', category: 'Diseño & producto', amount: 845, currency: 'USD', dueDate: '2026-10-20', receivedAt: '2026-10-17', source: 'PDF', confidence: 'high', approvedVendor: true, agreementLimit: 1000 },
  { id: 'inv-02', number: 'BIL-2026-0891', vendor: 'Andes Cloud', vendorInitials: 'AC', country: 'México', countryCode: 'MX', category: 'Infraestructura', amount: 2480, currency: 'USD', dueDate: '2026-10-21', receivedAt: '2026-10-17', source: 'Correo', confidence: 'high', approvedVendor: true, agreementLimit: 3000 },
  { id: 'inv-03', number: 'FAC-2026-0147', vendor: 'Orbita Labs', vendorInitials: 'OL', country: 'Argentina', countryCode: 'AR', category: 'Consultoría', amount: 1390, currency: 'USD', dueDate: '2026-10-23', receivedAt: '2026-10-16', source: 'PDF', confidence: 'high', approvedVendor: true, agreementLimit: 2000 },
  { id: 'inv-04', number: 'INV-2026-1042', vendor: 'Northstar Studio', vendorInitials: 'NS', country: 'Colombia', countryCode: 'CO', category: 'Diseño & producto', amount: 845, currency: 'USD', dueDate: '2026-10-20', receivedAt: '2026-10-16', source: 'Imagen', confidence: 'high', approvedVendor: true, duplicateOf: 'INV-2026-1042' },
  { id: 'inv-05', number: 'BIL-2026-3312', vendor: 'Lima Digital', vendorInitials: 'LD', country: 'Perú', countryCode: 'PE', category: 'Desarrollo web', amount: 690, currency: 'USD', dueDate: '2026-10-24', receivedAt: '2026-10-15', source: 'PDF', confidence: 'high', approvedVendor: true, agreementLimit: 900 },
  { id: 'inv-06', number: 'INV-2026-0079', vendor: 'Delta Networks', vendorInitials: 'DN', country: 'Brasil', countryCode: 'BR', category: 'Infraestructura', amount: 930, currency: 'USD', dueDate: '2026-10-25', receivedAt: '2026-10-15', source: 'PDF', confidence: 'high', approvedVendor: false },
  { id: 'inv-07', number: 'FAC-2026-0808', vendor: 'Pixel Nomad', vendorInitials: 'PN', country: 'Colombia', countryCode: 'CO', category: 'Creatividad', amount: 460, currency: 'USD', dueDate: '2026-10-27', receivedAt: '2026-10-14', source: 'Correo', confidence: 'high', approvedVendor: true, agreementLimit: 600 },
  { id: 'inv-08', number: 'INV-2026-0112', vendor: 'Sierra Analytics', vendorInitials: 'SA', country: 'Chile', countryCode: 'CL', category: 'Análisis de datos', amount: 1150, currency: 'USD', dueDate: '2026-10-26', receivedAt: '2026-10-14', source: 'PDF', confidence: 'high', approvedVendor: true, agreementLimit: 950 },
  { id: 'inv-09', number: 'INV-2026-0027', vendor: 'Soluciones Río', vendorInitials: 'SR', country: 'México', countryCode: 'MX', category: 'Soporte técnico', amount: 970, currency: 'USD', dueDate: '2026-10-28', receivedAt: '2026-10-13', source: 'PDF', confidence: 'high', approvedVendor: true, agreementLimit: 1050 },
  { id: 'inv-10', number: 'BIL-2026-0054', vendor: 'Vector Partners', vendorInitials: 'VP', country: 'Colombia', countryCode: 'CO', category: 'Operaciones', amount: 3150, currency: 'USD', dueDate: '2026-10-29', receivedAt: '2026-10-12', source: 'Imagen', confidence: 'high', approvedVendor: true, agreementLimit: 3500 },
  { id: 'inv-11', number: 'INV-2026-0061', vendor: 'Terra Systems', vendorInitials: 'TS', country: 'Argentina', countryCode: 'AR', category: 'Software', amount: 520, currency: 'USD', dueDate: '2026-10-18', receivedAt: '2026-10-11', source: 'PDF', confidence: 'high', approvedVendor: true, agreementLimit: 900 },
  { id: 'inv-12', number: 'INV-2026-0377', vendor: 'Cumbre Dev', vendorInitials: 'CD', country: 'Colombia', countryCode: 'CO', category: 'Desarrollo web', amount: 740, currency: 'USD', dueDate: '2026-10-23', receivedAt: '2026-10-10', source: 'Correo', confidence: 'high', approvedVendor: true, agreementLimit: 800 },
];

/** Fixtures ya procesadas para mostrar actividad en la vista inicial. */
const seeded: Record<string, Pick<Invoice, 'status' | 'reason' | 'ruleCode' | 'checks'>> = {
  'inv-01': { status: 'authorized', ruleCode: 'ALL_POLICIES_PASSED', reason: 'Cumple las reglas de beneficiario, acuerdo y umbral autónomo.', checks: ['Beneficiario permitido', 'Acuerdo de USD 1,000 verificado', 'Dentro del límite autónomo', 'Presupuesto suficiente'] },
  'inv-02': { status: 'pending', ruleCode: 'APPROVAL_REQUIRED', reason: 'Supera el umbral autónomo de USD 1,000 y requiere aprobación humana.', checks: ['Beneficiario validado', 'Acuerdo verificado', 'Presupuesto suficiente', 'Aprobación humana pendiente'] },
  'inv-03': { status: 'pending', ruleCode: 'APPROVAL_REQUIRED', reason: 'Supera el umbral autónomo de USD 1,000 y requiere aprobación humana.', checks: ['Beneficiario validado', 'Acuerdo verificado', 'Presupuesto suficiente', 'Aprobación humana pendiente'] },
  'inv-04': { status: 'blocked', ruleCode: 'DUPLICATE_INVOICE', reason: 'Factura duplicada respecto de INV-2026-1042.', checks: ['Número de factura repetido', 'Beneficiario e importe coincidentes', 'Autorización denegada'] },
  'inv-05': { status: 'authorized', ruleCode: 'ALL_POLICIES_PASSED', reason: 'Cumple las reglas de pago autónomo.', checks: ['Beneficiario permitido', 'Acuerdo verificado', 'Presupuesto suficiente'] },
  'inv-06': { status: 'blocked', ruleCode: 'VENDOR_NOT_ALLOWED', reason: 'Proveedor no incluido en la lista autorizada.', checks: ['Beneficiario desconocido', 'Autorización denegada'] },
  'inv-07': { status: 'authorized', ruleCode: 'ALL_POLICIES_PASSED', reason: 'Cumple las reglas de pago autónomo.', checks: ['Beneficiario permitido', 'Acuerdo verificado', 'Presupuesto suficiente'] },
  'inv-08': { status: 'blocked', ruleCode: 'AGREEMENT_MISMATCH', reason: 'El importe excede el acuerdo de USD 950.', checks: ['Diferencia contra el acuerdo', 'Autorización denegada'] },
  'inv-09': { status: 'authorized', ruleCode: 'ALL_POLICIES_PASSED', reason: 'Cumple las reglas de pago autónomo.', checks: ['Beneficiario permitido', 'Acuerdo verificado', 'Presupuesto suficiente'] },
  'inv-10': { status: 'pending', ruleCode: 'APPROVAL_REQUIRED', reason: 'La factura requiere autorización de una persona.', checks: ['Beneficiario validado', 'Importe dentro del límite absoluto', 'Pendiente de aprobación'] },
  'inv-11': { status: 'authorized', ruleCode: 'ALL_POLICIES_PASSED', reason: 'Cumple las reglas de pago autónomo.', checks: ['Beneficiario permitido', 'Acuerdo verificado', 'Presupuesto suficiente'] },
  'inv-12': { status: 'authorized', ruleCode: 'ALL_POLICIES_PASSED', reason: 'Cumple las reglas de pago autónomo.', checks: ['Beneficiario permitido', 'Acuerdo verificado', 'Presupuesto suficiente'] },
};

export const INITIAL_INVOICES: Invoice[] = base.map((item) => ({ ...item, ...seeded[item.id] }));

/** Lote nuevo; mantiene casos adversariales y no se procesa hasta pedirlo. */
export const DEMO_BATCH: Invoice[] = [
  { id:'batch-01', number:'NEW-2026-2001', vendor:'Nexa Software',vendorInitials:'NX',country:'Colombia',countryCode:'CO',category:'Desarrollo de software',amount:620,currency:'USD',dueDate:'2026-10-30',receivedAt:'2026-10-17',source:'PDF',confidence:'high',approvedVendor:true,agreementLimit:850,status:'unprocessed',ruleCode:'',reason:'Sin evaluar',checks:[] },
  { id:'batch-02', number:'NEW-2026-2002', vendor:'Atlas Research',vendorInitials:'AR',country:'México',countryCode:'MX',category:'Consultoría',amount:1750,currency:'USD',dueDate:'2026-10-31',receivedAt:'2026-10-17',source:'Correo',confidence:'high',approvedVendor:true,agreementLimit:2000,status:'unprocessed',ruleCode:'',reason:'Sin evaluar',checks:[] },
  { id:'batch-03', number:'NEW-2026-2003', vendor:'Estudio Aurora',vendorInitials:'EA',country:'Argentina',countryCode:'AR',category:'Diseño',amount:420,currency:'USD',dueDate:'2026-10-29',receivedAt:'2026-10-17',source:'Imagen',confidence:'high',approvedVendor:false,status:'unprocessed',ruleCode:'',reason:'Sin evaluar',checks:[] },
];
