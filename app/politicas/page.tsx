import type { Metadata } from 'next';
import { PolicyCenterPage } from '@/components/policies/policy-center-page';

export const metadata: Metadata = {
  title: 'Políticas de pago | Blinka Decision Engine',
  description: 'Configura umbrales, presupuesto y controles obligatorios del agente de pagos, en un entorno demostrativo.',
};
export default function PoliciesRoute() {
  return <PolicyCenterPage/>;
}

