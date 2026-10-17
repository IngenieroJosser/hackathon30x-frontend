/**
 * Directorio ficticio de beneficiarios para la hackathon 30X.
 * Las decisiones de pago de verdad deben validarse en backend contra registros
 * verificados y versionados; localStorage NO es una barrera de seguridad.
 */
import type { Invoice } from '@/types/payments';

export type BeneficiaryStatus = 'authorized' | 'review' | 'blocked';
export type BeneficiaryCountry = 'Colombia' | 'México' | 'Argentina' | 'Brasil' | 'Chile' | 'Perú';
export type Beneficiary = {
  id: string;
  name: string;
  country: BeneficiaryCountry;
  category: string;
  status: BeneficiaryStatus;
  agreementReference: string;
  agreementLimit: number;
  contactEmail: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
};
export type BeneficiaryInput = Pick<Beneficiary,'name'|'country'|'category'|'agreementReference'|'agreementLimit'|'contactEmail'|'notes'>;
export type RegistryEvent = {
  id: string;
  beneficiaryId: string;
  name: string;
  action: 'created' | 'updated' | 'authorized' | 'review' | 'blocked';
  occurredAt: string;
  actor: string;
  previousStatus?: BeneficiaryStatus;
  nextStatus?: BeneficiaryStatus;
  revision: number;
};
export const COUNTRIES: BeneficiaryCountry[] = ['Colombia','México','Argentina','Brasil','Chile','Perú'];
export const REGISTRY_KEY = 'blinka-sandbox:beneficiaries:v1';
export const REGISTRY_AUDIT_KEY = 'blinka-sandbox:beneficiary-events:v1';
export const REGISTRY_EVENT = 'blinka-sandbox:beneficiaries-updated';

export const normalName = (name: string): string => name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLowerCase();
const baseline = '2026-10-01T12:00:00.000Z';
const seed = (id:string,name:string,country:BeneficiaryCountry,category:string,limit:number,reference:string,status:BeneficiaryStatus='authorized'):Beneficiary => ({
  id,name,country,category,status,agreementLimit:limit,agreementReference:reference,
  contactEmail:'',notes:'',createdAt:baseline,updatedAt:baseline,revision:1,
});

export const DEMO_BENEFICIARIES: Beneficiary[] = [
  seed('ben-01','Northstar Studio','Colombia','Diseño y producto',1000,'AGR-NS-2026'),
  seed('ben-02','Andes Cloud','México','Infraestructura',3000,'AGR-AC-2026'),
  seed('ben-03','Orbita Labs','Argentina','Consultoría',2000,'AGR-OL-2026'),
  seed('ben-04','Lima Digital','Perú','Desarrollo web',900,'AGR-LD-2026'),
  seed('ben-05','Delta Networks','Brasil','Infraestructura',1200,'AGR-DN-2026','blocked'),
  seed('ben-06','Pixel Nomad','Colombia','Creatividad',600,'AGR-PN-2026'),
  seed('ben-07','Sierra Analytics','Chile','Datos y analítica',950,'AGR-SA-2026'),
  seed('ben-08','Soluciones Río','México','Soporte técnico',1050,'AGR-SR-2026'),
  seed('ben-09','Vector Partners','Colombia','Operaciones',3500,'AGR-VP-2026'),
  seed('ben-10','Terra Systems','Argentina','Software',900,'AGR-TS-2026'),
  seed('ben-11','Cumbre Dev','Colombia','Desarrollo web',800,'AGR-CD-2026'),
  seed('ben-12','Nexa Software','Colombia','Software',850,'AGR-NX-2026'),
  seed('ben-13','Atlas Research','México','Consultoría',2000,'AGR-AR-2026'),
  seed('ben-14','Estudio Aurora','Argentina','Diseño',700,'AGR-EA-2026','review'),
];

export function validateBeneficiary(input:BeneficiaryInput, current:Beneficiary[], editingId?:string):Record<string,string>{
  const errors: Record<string,string>={};
  const name=input.name.trim();
  if(name.length<3||name.length>90) errors.name='El nombre debe tener entre 3 y 90 caracteres.';
  else if(current.some(b=>b.id!==editingId&&normalName(b.name)===normalName(name))) errors.name='Ya existe un beneficiario con este nombre.';
  if(!COUNTRIES.includes(input.country)) errors.country='Selecciona un país admitido.';
  if(input.category.trim().length<3||input.category.trim().length>70) errors.category='Indica una categoría entre 3 y 70 caracteres.';
  if(!Number.isSafeInteger(input.agreementLimit)||input.agreementLimit<=0||input.agreementLimit>100000000) errors.agreementLimit='Ingresa un límite entero entre 1 y 100.000.000 USD.';
  if(!/^[\w\-./ ]{4,36}$/.test(input.agreementReference.trim())) errors.agreementReference='Usa de 4 a 36 letras, números o - _ . /.';
  if(input.contactEmail.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail.trim())) errors.contactEmail='Correo no válido.';
  if(input.contactEmail.length>120) errors.contactEmail='Correo demasiado largo.';
  if(input.notes.length>300) errors.notes='Máximo 300 caracteres.';
  return errors;
}

function isBeneficiary(value:unknown):value is Beneficiary {
  if(!value||typeof value!=='object') return false;
  const b=value as Partial<Beneficiary>;
  return typeof b.id==='string'&&/^ben-[\w-]+$/.test(b.id)&&typeof b.name==='string'&&b.name.length>=3&&
    COUNTRIES.includes(b.country as BeneficiaryCountry)&&typeof b.category==='string'&&
    (b.status==='authorized'||b.status==='review'||b.status==='blocked')&&
    Number.isSafeInteger(b.agreementLimit)&&Number(b.agreementLimit)>0&&Number(b.agreementLimit)<=100000000&&
    typeof b.agreementReference==='string'&&typeof b.contactEmail==='string'&&typeof b.notes==='string'&&
    typeof b.createdAt==='string'&&typeof b.updatedAt==='string'&&Number.isSafeInteger(b.revision)&&Number(b.revision)>0;
}

export function getDemoBeneficiaries():Beneficiary[]{
  if(typeof window==='undefined')return DEMO_BENEFICIARIES.map(b=>({...b}));
  try{
    const raw=window.localStorage.getItem(REGISTRY_KEY);
    if(!raw)return DEMO_BENEFICIARIES.map(b=>({...b}));
    const value:unknown=JSON.parse(raw);
    if(!Array.isArray(value)||value.length>2000||!value.every(isBeneficiary))return DEMO_BENEFICIARIES.map(b=>({...b}));
    if(new Set(value.map(b=>normalName(b.name))).size!==value.length)return DEMO_BENEFICIARIES.map(b=>({...b}));
    return value;
  }catch{return DEMO_BENEFICIARIES.map(b=>({...b}));}
}

export function getRegistryEvents():RegistryEvent[]{
  if(typeof window==='undefined')return [];
  try{
    const value:unknown=JSON.parse(window.localStorage.getItem(REGISTRY_AUDIT_KEY)??'[]');
    if(!Array.isArray(value))return [];
    return value.filter((e):e is RegistryEvent=>Boolean(e&&typeof e==='object'&&typeof e.id==='string'&&typeof e.action==='string'&&typeof e.name==='string'&&typeof e.occurredAt==='string')).slice(0,80);
  }catch{return [];}
}
const write=(items:Beneficiary[],event:RegistryEvent)=>{
  if(typeof window==='undefined')throw new Error('Esta operación necesita un navegador.');
  // Historial primero. Ambos registros son únicamente para la demostración.
  window.localStorage.setItem(REGISTRY_AUDIT_KEY,JSON.stringify([event,...getRegistryEvents()].slice(0,80)));
  window.localStorage.setItem(REGISTRY_KEY,JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(REGISTRY_EVENT));
};
const eventFor=(b:Beneficiary,action:RegistryEvent['action'],previousStatus?:BeneficiaryStatus):RegistryEvent=>({
  id:`evt-${b.id}-${b.revision}-${Date.now()}`,
  beneficiaryId:b.id,name:b.name,action,occurredAt:new Date().toISOString(),actor:'Admin Finance · Sandbox',
  previousStatus,nextStatus:b.status,revision:b.revision,
});
export function saveDemoBeneficiary(input:BeneficiaryInput,editingId?:string):Beneficiary{
  const current=getDemoBeneficiaries();
  const errors=validateBeneficiary(input,current,editingId);
  if(Object.keys(errors).length)throw new Error(Object.values(errors)[0]);
  const now=new Date().toISOString();
  const sanitized={...input,name:input.name.trim().replace(/\s+/g,' '),category:input.category.trim(),agreementReference:input.agreementReference.trim(),contactEmail:input.contactEmail.trim(),notes:input.notes.trim()};
  if(editingId){
    const prior=current.find(x=>x.id===editingId);
    if(!prior)throw new Error('No se encontró el beneficiario.');
    const criticalChange=prior.name!==sanitized.name||prior.country!==sanitized.country||prior.agreementReference!==sanitized.agreementReference||prior.agreementLimit!==sanitized.agreementLimit;
    // Changing identifiers or financial terms revokes authorization until a human explicitly re-approves.
    const updated={...prior,...sanitized,status:criticalChange?'review' as const:prior.status,updatedAt:now,revision:prior.revision+1};
    write(current.map(b=>b.id===prior.id?updated:b),eventFor(updated,'updated',prior.status));
    return updated;
  }
  const beneficiary:Beneficiary={...sanitized,id:`ben-${crypto.randomUUID()}`,status:'review',createdAt:now,updatedAt:now,revision:1};
  write([beneficiary,...current],eventFor(beneficiary,'created'));
  return beneficiary;
}
export function setDemoBeneficiaryStatus(id:string,status:BeneficiaryStatus):Beneficiary{
  const current=getDemoBeneficiaries();
  const prior=current.find(b=>b.id===id);
  if(!prior)throw new Error('No se encontró el beneficiario.');
  if(prior.status===status)return prior;
  const updated={...prior,status,updatedAt:new Date().toISOString(),revision:prior.revision+1};
  write(current.map(b=>b.id===id?updated:b),eventFor(updated,status,prior.status));
  return updated;
}

/** A missing, review or blocked vendor always fails the allow-list. */
export function invoiceWithBeneficiary(invoice:Invoice,beneficiaries:Beneficiary[]):Invoice{
  const beneficiary=beneficiaries.find(b=>normalName(b.name)===normalName(invoice.vendor));
  return {
    ...invoice,
    approvedVendor:beneficiary?.status==='authorized',
    agreementLimit:beneficiary?.agreementLimit,
    beneficiaryRevision:beneficiary?`${beneficiary.id}/r${beneficiary.revision}`:undefined,
  };
}
