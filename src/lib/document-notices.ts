const normalize = (value: string) => value.normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  .replace(/[.!;]+$/g, '').replace(/\s+/g, ' ');

/** Únicamente descargos de validez del sandbox, nunca errores documentales. */
export function isSandboxDisclaimer(value: string): boolean {
  const cleaned = normalize(value);
  const known = new Set([
    'factura ficticia y no valida para cobro',
    'documento ficticio y no valido para cobro',
    'factura ficticia',
    'documento ficticio',
    'sin validez fiscal, legal ni bancaria',
    'no autoriza ni debe ejecutarse ningun pago',
    'no ejecutar pagos',
    'la extraccion requiere confirmacion humana. no se ha autorizado ningun pago',
    'synthetic document',
    'fictional invoice',
    'demo invoice',
    'not valid for payment',
    'no real payment',
  ]);
  // Compatibilidad con la leyenda antigua sin ocultar una advertencia distinta.
  return known.has(cleaned) || cleaned === 'la extraccion requiere confirmacion humana. no se ha autorizado ningun pago';
}
