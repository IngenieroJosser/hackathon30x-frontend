import { DEMO_FIXTURES } from '@/lib/demo-fixtures';

/** Sólo enlaces a fixtures estáticos. No se transmiten secretos ni datos reales. */
export function InvoiceSamples() {
  return (
    <section className="iv-samples" aria-labelledby="iv-samples-heading">
      <div className="iv-samples-heading">
        <div>
          <span className="iv-kicker">SANDBOX / DATASET DE EVALUACIÓN</span>
          <h2 id="iv-samples-heading">Facturas ficticias<span>.</span></h2>
          <p>14 casos reproducibles para validar la extracción con OpenAI y las reglas del agente. Descarga el documento y súbelo en el módulo anterior.</p>
        </div>
        <a className="iv-samples-manifest" href="/demo/facturas/manifest.json" download>
          Descargar manifiesto JSON ↗
        </a>
      </div>
      <div className="iv-samples-grid">
        {DEMO_FIXTURES.map(d => (
          <article className="iv-sample-card" key={d.id}>
            <div className="iv-sample-meta"><span>{d.id} / {d.format}</span><span>SOLO DEMO</span></div>
            <h3>{d.number}</h3>
            <p className="iv-sample-vendor">{d.vendor}</p>
            <p className="iv-sample-description">{d.description}</p>
            <div className="iv-sample-footer">
              <span title="Resultado esperado de referencia, sujeto a políticas vigentes">{d.expected}</span>
              <a href={d.path} download>Descargar ↗</a>
            </div>
          </article>
        ))}
      </div>
      <p className="iv-samples-notice">Los resultados esperados dependen de la política vigente, el saldo y el orden de evaluación. Ninguna factura corresponde a una persona o empresa real.</p>
    </section>
  );
}
