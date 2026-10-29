export type WsPolicy={id:string;version:number;autonomousLimit:string;hardLimit:string;monthlyBudget:string;currency:string};
export type WsAgreement={id:string;reference:string;amountLimit:string;currency:string;version:number};
export type WsBankAccount={status:string;maskedAccount:string;revision:number;realBankConfirmed:boolean;verifiedAt:string|null;verifiedVendorRevision:number|null};
export type WsVendor={bankAccount:WsBankAccount|null;id:string;name:string;country:string;category:string;contactEmail:string|null;status:'AUTHORIZED'|'REVIEW'|'BLOCKED';revision:number;agreements:WsAgreement[]};
export type WsExtraction={id:string;method:string;modelName:string|null;payload:{number?:string;vendor?:string;amount?:number|null;currency?:string;dueDate?:string;issueDate?:string;description?:string;warnings?:string[];evidence?:Record<string,string>};warnings:string[];evidence:Record<string,string>};
export type WsDecision={id:string;outcome:'AUTHORIZED'|'BLOCKED'|'ESCALATED';ruleCode:string;reason:string;checks:string[];evaluatedAt:string;policySnapshot:Record<string,unknown>;inputSnapshot:Record<string,unknown>;beneficiarySnapshot:Record<string,unknown>|null};
export type WsInvoice={id:string;externalNumber:string|null;vendorName:string|null;amount:string|null;currency:string|null;issueDate:string|null;dueDate:string|null;description:string|null;status:string;source:string;createdAt:string;verifiedAt:string|null;document?:{fileName:string;mimeType:string;bytes:number;sha256:string}|null;extractions:WsExtraction[];decisions:WsDecision[]};
export type WsApproval={id:string;status:'PENDING'|'APPROVED'|'REJECTED'|'EXPIRED';justification:string|null;requestedAt:string;resolvedAt:string|null;invoice:WsInvoice;decision:WsDecision|null};
export type WsAudit={actor?:{id:string;displayName:string;email:string;role:string}|null;id:string;entityType:string;entityId:string;invoiceId:string|null;action:string;data:Record<string,unknown>;occurredAt:string};
export type WsBudget={id:string;allocation:string;reserved:string;consumed:string;periodStart:string};
export type Workspace={source:string;organization:{name:string;slug:string};policy:WsPolicy|null;vendors:WsVendor[];invoices:WsInvoice[];approvals:WsApproval[];audit:WsAudit[];budget:WsBudget[];paymentExecuted:boolean};
export async function requestJSON<T=unknown>(path:string,init?:RequestInit):Promise<T>{
 const response=await fetch(path,{...init,cache:'no-store',credentials:'same-origin',headers:init?.body instanceof FormData?init.headers:{...(init?.method&&init.method!=='GET'?{'Content-Type':'application/json'}:{}),...init?.headers}});
 let result:Record<string,unknown>;
 try{result=await response.json() as Record<string,unknown>;}catch{throw new Error(`Respuesta HTTP ${response.status} no JSON`);}
 if(!response.ok)throw new Error(typeof result.error==='string'?result.error:`Error HTTP ${response.status}`);
 return result as T;
}
export const postJSON=(path:string,body:unknown)=>requestJSON(path,{method:'POST',body:JSON.stringify(body)});
export const money=(value:number|string|null|undefined)=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(value??0));
export const shortDate=(date:string|null|undefined)=>date?new Date(date).toLocaleDateString('es-CO',{timeZone:'UTC',day:'2-digit',month:'short',year:'numeric'}):'Sin fecha';
