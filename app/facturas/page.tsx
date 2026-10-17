import type { Metadata } from 'next';
import { InvoicesPage } from '@/components/invoices/invoices-page';
export const metadata:Metadata={title:'Facturas | Blinka Decision Engine',description:'Ingreso, interpretación y evaluación controlada de facturas ficticias.'};
export default function Page(){return <InvoicesPage/>;}
