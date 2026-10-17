import type { DecisionStatus } from '@/types/payments';
import { Icon } from './icon';

const labels: Record<DecisionStatus, string> = {
  authorized: 'Autorizada', blocked: 'Bloqueada', pending: 'Por aprobar', unprocessed: 'Sin evaluar',
};
export function StatusPill({ status }: { status: DecisionStatus }) {
  return <span className={`status-pill status-${status}`}>
    <Icon name={status === 'authorized' ? 'check' : status === 'blocked' ? 'cross' : status === 'pending' ? 'clock' : 'info'} size={13} strokeWidth={2.2}/>
    {labels[status]}
  </span>;
}
