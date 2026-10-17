import type {Metadata} from 'next';
import {InvoiceCasePage} from '@/components/invoices/invoice-case-page';
export const metadata:Metadata={title:'Detalle de factura | Blinka Decision Engine',description:'Revisión, decisión y trazabilidad de factura ficticia.'};
export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  return <InvoiceCasePage invoiceId={id}/>;
}
