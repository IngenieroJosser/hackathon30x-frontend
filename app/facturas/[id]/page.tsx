import Link from 'next/link';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WorkspaceScreen } from '@/components/workspace/workspace-screen';

export const metadata: Metadata = {
  title: 'Detalle de factura | FinVigía Decision Engine',
  description: 'Revisión, decisión y trazabilidad de factura ficticia.',
};

type InvoiceRouteProps = {
  params: Promise<{ id: string }>;
};

/**
 * Los parámetros de rutas dinámicas son datos de ejecución en Next.js 16
 * cuando Cache Components está habilitado y no hay generateStaticParams.
 * Deben resolverse DENTRO de un límite de Suspense.
 */
async function InvoiceCaseContent({ params }: InvoiceRouteProps) {
  const { id } = await params;
  return <WorkspaceScreen page="invoice-detail" invoiceId={id} />;
}

/**
 * Esta vista estática se incluye en el HTML inicial, mientras el expediente
 * se resuelve para la URL solicitada. No usa fecha, navegador ni datos privados.
 */
function InvoiceCaseFallback() {
  return (
    <main className="iv-page iv-route-loading" aria-busy="true">
      <div className="iv-route-loading-inner" role="status" aria-live="polite">
        <Link className="iv-route-loading-brand" href="/" aria-label="Volver al dashboard de FinVigía">
          FINVIGIA<span>.</span> <small>DECISION ENGINE</small>
        </Link>
        <span className="iv-kicker">DOCUMENT INTELLIGENCE / EXPEDIENTE</span>
        <h1>
          Cada decisión deja <em>evidencia.</em>
        </h1>
        <p>Preparando el expediente financiero y sus controles de evaluación.</p>
        <div className="iv-route-loading-track" aria-hidden="true">
          <span />
        </div>
        <Link className="iv-route-loading-back" href="/facturas">
          ← Volver al centro de facturas
        </Link>
      </div>
    </main>
  );
}

export default function Page({ params }: InvoiceRouteProps) {
  return (
    <Suspense fallback={<InvoiceCaseFallback />}>
      <InvoiceCaseContent params={params} />
    </Suspense>
  );
}
