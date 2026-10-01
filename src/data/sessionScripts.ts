/**
 * Utilidades de «Grabar y resumir sesión». En producción el resumen lo haría un modelo de IA,
 * siempre revisado por el profesional antes de guardarse.
 */
export interface ScriptLine {
  who: 'Profesional' | 'Paciente'
  text: string
}

export interface SessionScript {
  lines: ScriptLine[]
  summary: {
    reason: string
    observations: string
    diagnosis: string
    plan: string
    publicSummary: string
    nextAction: string
    nextActionDays: number
  }
}

/**
 * Resumen simple por palabras clave para transcripciones reales (sin IA en el prototipo).
 * El reconocimiento de voz del navegador apenas pone puntuación, así que cada fragmento
 * reconocido se trata como una frase y además se trocea por comas y conectores.
 */
export function summarizeTranscript(fragments: string[], serviceName: string): SessionScript['summary'] {
  const sentences = fragments
    .flatMap((f) => f.split(/[.!?;,]\s+|\s+(?=(?:pero|entonces|además|vale|bueno)\s)/i))
    .map((s) => s.trim().replace(/^(?:(?:vale|bueno|pues|entonces|y|pero)\s+)+/i, ''))
    .filter((s) => s.split(/\s+/).length >= 3)
  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
  const pick = (re: RegExp, max = 4) => [...new Set(sentences.filter((s) => re.test(s.toLowerCase())).map(cap))].slice(0, max).join('. ')
  const observations = pick(/dolor|molest|mejor|peor|tensi|peso|siento|noto|duele|grados|kilo|fiebre|cansad|duerm|mareo/)
  const plan = pick(/vamos a|te recomiend|recomiendo|debes|tienes que|hay que|ejercicio|toma|pauta|mantener|mantén|reduc|evita|seguir|sigue/)
  const nextRaw = sentences.find((s) => /próxim|semana que viene|nos vemos|revis|volver/.test(s.toLowerCase()))
  return {
    reason: serviceName,
    observations: observations || sentences.slice(0, 3).map(cap).join('. '),
    diagnosis: '',
    plan,
    publicSummary: plan ? `Resumen de tu visita: ${plan}.` : '',
    nextAction: nextRaw ? cap(nextRaw) : '',
    nextActionDays: /semana que viene|próxima semana|una semana/.test(fragments.join(' ').toLowerCase()) ? 7 : 14,
  }
}
