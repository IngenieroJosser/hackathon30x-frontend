/** URL pública verificada. Si no se configura, no se indexan páginas. */
export const SITE_URL = (() => {
  const candidate = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') return null;
    return parsed.origin;
  } catch { return null; }
})();
export const SITE_NAME = 'FinVigía';
export const SITE_DESCRIPTION = 'FinVigía es un prototipo académico que investiga la seguridad de decisiones financieras mediante MFA, verificación bancaria sintética, reglas auditables y detección preventiva de amenazas.';
