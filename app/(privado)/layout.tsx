import type { ReactNode } from 'react';
import { AccessGate } from '@/components/workspace/access-gate';

/**
 * El grupo (privado) NO altera las URLs de Next.js.
 * Protege únicamente las vistas operativas; /proyecto sigue siendo pública y prerenderizable.
 * Las APIs conservan autorización y sesiones verificadas en el servidor.
 */
export default function PrivateLayout({ children }: { children: ReactNode }) {
  return <AccessGate>{children}</AccessGate>;
}
