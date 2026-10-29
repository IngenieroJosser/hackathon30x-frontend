/**
 * Adaptador del SEMILLERO. Datos 100% sintéticos: no consulta entidades bancarias.
 * El resultado jamás debe usarse como prueba de existencia/titularidad real.
 */
export type BankAccountKind = 'SAVINGS' | 'CHECKING' | 'PAYROLL';
export type BankVerificationRequest = {
  institutionCode: string;
  accountReference: string;
  accountKind: BankAccountKind;
  holderReference: string;
};
export type BankVerificationResult = {
  status: 'SYNTHETIC_MATCH' | 'SYNTHETIC_MISMATCH' | 'UNKNOWN';
  verificationSource: 'SYNTHETIC_FIXTURE';
  realBankConfirmed: false;
  accountKindConfirmed: boolean;
  holderConfirmed: boolean;
};
export interface BankVerificationProvider {
  verify(request: BankVerificationRequest): Promise<BankVerificationResult>;
}

// Institución, cuentas y titulares INVENTADOS; nunca usar datos bancarios reales.
const SYNTHETIC_REGISTRY: ReadonlyArray<BankVerificationRequest> = [
  { institutionCode: 'BANK-DEMO-A', accountReference: 'TEST-ACCOUNT-0001', accountKind: 'PAYROLL', holderReference: 'PERSON-DEMO-0001' },
  { institutionCode: 'BANK-DEMO-A', accountReference: 'TEST-ACCOUNT-0002', accountKind: 'SAVINGS', holderReference: 'PERSON-DEMO-0002' },
  { institutionCode: 'BANK-DEMO-B', accountReference: 'TEST-ACCOUNT-0003', accountKind: 'CHECKING', holderReference: 'PERSON-DEMO-0003' },
];

export const syntheticBankProvider: BankVerificationProvider = {
  async verify(request) {
    const matches = SYNTHETIC_REGISTRY.find(item =>
      item.institutionCode === request.institutionCode && item.accountReference === request.accountReference);
    if (!matches) return {
      status: 'UNKNOWN', verificationSource: 'SYNTHETIC_FIXTURE', realBankConfirmed: false,
      accountKindConfirmed: false, holderConfirmed: false,
    };
    const accountKindConfirmed = matches.accountKind === request.accountKind;
    const holderConfirmed = matches.holderReference === request.holderReference;
    return {
      status: accountKindConfirmed && holderConfirmed ? 'SYNTHETIC_MATCH' : 'SYNTHETIC_MISMATCH',
      verificationSource: 'SYNTHETIC_FIXTURE', realBankConfirmed: false,
      accountKindConfirmed, holderConfirmed,
    };
  },
};

/** Control independiente del LLM; las coincidencias sintéticas JAMÁS acreditan un banco real.
 * Al instalar un proveedor real, introducir explícitamente otra política y pruebas de integración.
 */
export function bankStatusAcceptable(
 account:{status:string;verifiedVendorRevision:number|null;realBankConfirmed:boolean;verifiedAt?:Date|null}|null|undefined,
 vendorRevision:number,
 allowSynthetic:boolean,
):boolean{
 return Boolean(allowSynthetic && account && !account.realBankConfirmed &&
   account.status==='SYNTHETIC_MATCH' && account.verifiedVendorRevision===vendorRevision && account.verifiedAt);
}
