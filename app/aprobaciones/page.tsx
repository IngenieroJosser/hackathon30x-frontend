import type { Metadata } from 'next';
import { ApprovalsPage } from '@/components/approvals/approvals-page';

export const metadata: Metadata={
  title:'Supervisión humana | Blinka Decision Engine',
  description:'Revisión de solicitudes escaladas, aprobaciones justificadas y trazabilidad en un entorno de simulación.',
};
export default function Page(){return <ApprovalsPage/>;}
