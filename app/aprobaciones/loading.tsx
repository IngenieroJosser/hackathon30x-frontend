/**
 * Static route-segment fallback for instant client navigation.
 * It does not read cookies, clock, or external services.
 */
export default function ApprovalsLoading() {
  return (
    <main className="ws-auth" aria-busy="true">
      <div className="ws-auth-panel" role="status" aria-live="polite">
        <span className="ws-eyebrow">BLINKA / HUMAN OVERSIGHT</span>
        <h1>Supervisión<br /><em>humana.</em></h1>
        <p>Preparando la bandeja de aprobaciones y sus controles.</p>
      </div>
    </main>
  );
}
