/**
 * Filtro preventivo de patrones adversariales en TEXTO (no sustituye un detector ML).
 * El objetivo es bloquear instrucciones dirigidas al sistema, no detectar que un texto "lo hizo IA".
 * Los archivos binarios necesitan extracción local/OCR y un analizador independiente.
 */
export type ThreatSignal = 'INSTRUCTION_OVERRIDE' | 'ROLE_SPOOFING' | 'SECRET_EXFILTRATION';
export type ThreatAssessment = { blocked: boolean; signals: ThreatSignal[] };

const indicators: ReadonlyArray<{ signal: ThreatSignal; re: RegExp }> = [
  { signal: 'INSTRUCTION_OVERRIDE', re: /\b(?:ignore|disregard|override|forget)\s+(?:all\s+)?(?:the\s+)?(?:previous|prior|above|system|developer)\s+(?:instructions|rules|prompts?)\b/i },
  { signal: 'INSTRUCTION_OVERRIDE', re: /\b(?:ignora|olvida|desobedece|sobrescribe)\s+(?:todas?\s+)?(?:las?\s+)?(?:instrucciones|reglas|pol[ií]ticas)\s+(?:anteriores|previas|del\s+sistema|de\s+seguridad)\b/i },
  { signal: 'ROLE_SPOOFING', re: /(?:\[\s*im_start\s*\]\s*(?:system|developer)|<\|im_start\|>\s*(?:system|developer)|\[\s*system\s*\]|(?:^|\n)\s*(?:system|developer)\s*:\s*(?:ignore|override|bypass|ignora|autoriza))/i },
  { signal: 'ROLE_SPOOFING', re: /\b(?:you\s+are\s+now|act[uú]a\s+ahora\s+como)\s+(?:the\s+)?(?:system|developer|administrador|sistema)\b/i },
  { signal: 'SECRET_EXFILTRATION', re: /\b(?:send|transmit|reveal|exfiltrate|env[ií]a|revela|extrae)\b.{0,90}\b(?:api[_ -]?keys?|secrets?|tokens?|contraseñas?|claves?\s+(?:secretas?|de\s+api))\b/i },
];

export function assessUntrustedText(text: string): ThreatAssessment {
  const signals = [...new Set(indicators.filter(x => x.re.test(text.slice(0, 12000))).map(x => x.signal))];
  return { blocked: signals.length > 0, signals };
}
