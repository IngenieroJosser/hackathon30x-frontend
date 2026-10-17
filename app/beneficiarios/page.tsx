import type { Metadata } from 'next';
import { BeneficiariesPage } from '@/components/beneficiaries/beneficiaries-page';

export const metadata: Metadata = {
  title: 'Beneficiarios | Blinka Decision Engine',
  description: 'Directorio de beneficiarios, acuerdos y autorización de proveedores con trazabilidad simulada.',
};

export default function BeneficiariesRoute() {
  return <BeneficiariesPage />;
}
