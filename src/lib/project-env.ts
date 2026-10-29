/** Environment variable compatibility for existing deployments.
 * Keep both keys identical during transition. Never rotate existing cipher keys to rebrand.
 */
export function projectEnv(suffix: string): string | undefined {
  const current = process.env[`FINVIGIA_${suffix}`];
  const previous = process.env[`BLINKA_${suffix}`];
  if (current && previous && current !== previous) {
    throw new Error(`Configuraciones nueva y anterior diferentes para ${suffix}; corrige el entorno antes de continuar.`);
  }
  return current || previous;
}
