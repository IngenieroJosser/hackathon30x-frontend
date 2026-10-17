import type { Metadata } from 'next';
import { AuditPage } from '@/components/audit/audit-page';

export const metadata:Metadata={
  title:'Auditoría y explicabilidad | Blinka Decision Engine',
  description:'Reconstrucción de decisiones y controles de un agente financiero en entorno ficticio de demostración.',
};

export default function Page(){return <AuditPage/>;}
