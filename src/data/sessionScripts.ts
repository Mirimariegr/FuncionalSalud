/**
 * Utilidades de «Grabar y resumir sesión». En producción el resumen lo haría un modelo de IA,
 * siempre revisado por el profesional antes de guardarse.
 */
export interface ScriptLine {
  who: 'Profesional' | 'Paciente'
  text: string
}

export interface SessionSummary {
  reason: string
  observations: string
  diagnosis: string
  plan: string
  publicSummary: string
  nextAction: string
  nextActionDays: number
}

/** Quita tildes para comparar sin depender de cómo transcriba el navegador. */
const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Síntoma: patrón sobre el texto sin tildes → término clínico y forma comprensible para el paciente. */
const SYMPTOMS: { re: RegExp; clinical: string; plain: string }[] = [
  { re: /(duele|dolor de|dolor en|molesta) (la )?cabeza|jaqueca|migrana/, clinical: 'cefalea', plain: 'dolor de cabeza' },
  { re: /(duele|dolor de|dolor en|molesta) (la )?(espalda baja|zona lumbar|lumbar|riñones)|lumbago/, clinical: 'lumbalgia', plain: 'dolor de espalda' },
  { re: /(duele|dolor de|dolor en|molesta) (la )?espalda/, clinical: 'dolor de espalda', plain: 'dolor de espalda' },
  { re: /(duele|dolor de|dolor en|molesta) (el )?cuello|cervical/, clinical: 'cervicalgia', plain: 'dolor de cuello' },
  { re: /(duele|duelen|dolor de|dolor en|molesta) (la |las )?rodillas?/, clinical: 'dolor de rodilla (gonalgia)', plain: 'dolor de rodilla' },
  { re: /(duele|dolor de|dolor en|molesta) (el )?hombro/, clinical: 'dolor de hombro', plain: 'dolor de hombro' },
  { re: /(duele|dolor de|dolor en|molesta) (el )?tobillo/, clinical: 'dolor de tobillo', plain: 'dolor de tobillo' },
  { re: /(duele|duelen|dolor de|dolor en|molesta) (la |las |el |los )?(muela|muelas|diente|dientes)/, clinical: 'odontalgia', plain: 'dolor de muelas' },
  { re: /(duele|dolor de|dolor en|molesta) (el |la )?(estomago|barriga|tripa|vientre)|dolor abdominal/, clinical: 'dolor abdominal', plain: 'dolor de barriga' },
  { re: /(duele|dolor de|dolor en|molesta) (la )?garganta/, clinical: 'odinofagia', plain: 'dolor de garganta' },
  { re: /(duele|dolor de|dolor en|opresion en) (el )?pecho/, clinical: 'dolor torácico', plain: 'dolor en el pecho' },
  { re: /sangr(an|ado|a) (las |de las )?encias|encias sangr/, clinical: 'sangrado gingival', plain: 'sangrado de encías' },
  { re: /sensibilidad|me da calambre con el frio/, clinical: 'hipersensibilidad dental', plain: 'sensibilidad dental' },
  { re: /fiebre|calentura/, clinical: 'fiebre', plain: 'fiebre' },
  { re: /\btos\b|toso/, clinical: 'tos', plain: 'tos' },
  { re: /mareo|mareada|mareado|vertigo/, clinical: 'mareo', plain: 'mareos' },
  { re: /nausea|ganas de vomitar|vomit/, clinical: 'náuseas', plain: 'náuseas' },
  { re: /diarrea/, clinical: 'diarrea', plain: 'diarrea' },
  { re: /estren/, clinical: 'estreñimiento', plain: 'estreñimiento' },
  { re: /me ahogo|falta de aire|no puedo respirar|me cuesta respirar/, clinical: 'disnea', plain: 'sensación de falta de aire' },
  { re: /picor|me pica/, clinical: 'prurito', plain: 'picor' },
  { re: /cansad|agotad|sin energia|sin fuerzas/, clinical: 'astenia', plain: 'cansancio' },
  { re: /no (puedo )?duermo|duermo mal|insomnio|no consigo dormir|me despierto/, clinical: 'insomnio', plain: 'problemas para dormir' },
  { re: /ansiedad|ansios|nervios|agobi|estres|estresad/, clinical: 'ansiedad / estrés', plain: 'nervios o estrés' },
  {
    re: /triste|deprimid|hundid|la vida es una mierda|no tengo ganas de nada|todo me da igual|estoy fatal|estoy mal de animo|bajon/,
    clinical: 'bajo estado de ánimo',
    plain: 'tu estado de ánimo',
  },
]

const NUM: Record<string, number> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, diez: 10, quince: 15 }

const joinList = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`)
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** Pasa una indicación dicha al paciente («deberías tomar…») a forma impersonal para la nota clínica. */
function extractIndications(text: string) {
  const triggers: [RegExp, string][] = [
    [/\b(?:te voy a recetar|te receto|le receto|voy a recetarte|te pauto|le pauto)\s+(.+)/, 'Se prescribe'],
    [/\b(?:te voy a pedir|te pido|le pido|vamos a pedir)\s+(.+)/, 'Se solicita'],
    [/\b(?:deberias de|deberias|deberia|tienes que|tiene que|debes|debe|hay que|te recomiendo|le recomiendo|recomiendo|es importante que|conviene)\s+(.+)/, 'Se recomienda'],
    [/\b(?:vamos a)\s+(.+)/, 'Se acuerda'],
    [/\b(?:no (?:debes|deberias|tienes que)|evita|evite)\s+(.+)/, 'Evitar'],
  ]
  const out: { clinical: string; patient: string }[] = []
  const starts = /\s(?=y luego|y ademas|ademas|tambien|y te recomiendo|te recomiendo|le recomiendo|tienes que|deberias|vamos a|te voy a|y no )/
  for (const sentence of plain(text).split(/[.;!?]/).flatMap((x) => x.split(starts))) {
    const s = sentence.trim()
    for (const [re, verb] of triggers) {
      const m = s.match(re)
      if (!m) continue
      // Se corta en conectores que suelen empezar otro tema y se limita la longitud
      let rest = m[1].split(/\b(?:pero|porque|vale|bueno|entonces|nos vemos)\b/)[0].trim()
      rest = rest.split(/\s+/).slice(0, 12).join(' ').replace(/\b(te|tu|tus)\b/g, (w) => (w === 'te' ? '' : w === 'tu' ? 'su' : 'sus')).replace(/\s+/g, ' ').trim()
      if (rest.split(' ').length < 2) continue
      // Los textos de salida conservan la forma sin tildes del reconocimiento: se restauran las más comunes
      const fixed = rest.replace(/\bdias\b/g, 'días').replace(/\bdia\b/g, 'día').replace(/\bmas\b/g, 'más').replace(/\banalitica\b/g, 'analítica').replace(/\bradiografia\b/g, 'radiografía').replace(/\bmedicacion\b/g, 'medicación')
      // Reflexivos dichos al paciente («cepillarte») pasan a impersonal en la nota («cepillarse»)
      const impersonal = fixed.replace(/\b(\w+)(ar|er|ir)te\b/g, '$1$2se')
      const patient = verb === 'Evitar' ? `evitar ${fixed}` : verb === 'Se solicita' ? `te pediremos ${fixed}` : verb === 'Se prescribe' ? `tomar ${fixed}` : fixed
      out.push({ clinical: `${verb} ${impersonal}`, patient })
      break
    }
  }
  const seen = new Set<string>()
  return out.filter((i) => (seen.has(i.clinical) ? false : (seen.add(i.clinical), true))).slice(0, 5)
}

/**
 * Resumen por reglas para el prototipo (sin IA). No copia frases sueltas: reconoce síntomas,
 * evolución, intensidad, indicaciones y próxima revisión, y redacta la nota en lenguaje clínico.
 */
export function summarizeTranscript(fragments: string[], serviceName: string): SessionSummary {
  const full = fragments.join('. ')
  const t = plain(full)

  const found = SYMPTOMS.filter((s) => s.re.test(t))
  // Si hay un término específico (p. ej. lumbalgia) no se repite el genérico (dolor de espalda)
  const symptoms = found.filter((s, i) => !found.some((o, j) => j < i && o.plain === s.plain))

  const facts: string[] = []
  if (symptoms.length) facts.push(`Refiere ${joinList(symptoms.map((s) => s.clinical))}.`)
  const since = t.match(/desde hace (\w+ (?:dias?|semanas?|meses?|anos?))/)
  if (since) facts.push(`Evolución de ${since[1].replace('anos', 'años').replace('ano', 'año').replace('dias', 'días').replace('dia', 'día')}.`)
  if (/(ha |he |estoy |esta )?(mejorado|mejor que|ha bajado|va mejor|ya no me duele)/.test(t)) facts.push('Refiere mejoría respecto a la visita anterior.')
  else if (/(ha |he )?(empeorado|peor que|va a peor|cada vez mas)/.test(t)) facts.push('Refiere empeoramiento.')
  const eva = t.match(/\b(\d|diez|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve) (sobre|de) (10|diez)\b/)
  if (eva) facts.push(`Intensidad del dolor ${NUM[eva[1]] ?? eva[1]}/10 (EVA).`)
  const meds = t.match(/\b(?:estoy tomando|tomo|me tomo|me estoy tomando)\s+((?:\w+\s?){1,3})/)
  if (meds) facts.push(`Medicación referida: ${meds[1].trim()}.`)

  const indications = extractIndications(full)

  const next = t.match(/(?:nos vemos|vuelve|vuelva|volvemos a vernos|revisamos|revision|proxima cita)[^.]*?(?:en (\w+) (dias?|semanas?|mes(?:es)?)|(la semana que viene|el mes que viene|la proxima semana|el proximo mes))/)
  let nextDays = 14
  let nextLabel = ''
  if (next) {
    if (next[1]) {
      const n = NUM[next[1]] ?? Number(next[1]) ?? 1
      const unit = next[2].startsWith('dia') ? 1 : next[2].startsWith('semana') ? 7 : 30
      nextDays = (Number.isFinite(n) ? n : 1) * unit
      nextLabel = `en ${next[1]} ${next[2].replace('dias', 'días').replace('dia', 'día')}`
    } else {
      nextDays = /mes/.test(next[3]) ? 30 : 7
      nextLabel = next[3].replace('proxima', 'próxima').replace('proximo', 'próximo')
    }
  } else if (/nos vemos|revision|revisamos|vuelve|vuelva/.test(t)) {
    nextLabel = 'según lo acordado'
  }

  const main = symptoms.slice(0, 2).map((s) => s.clinical)
  const patientParts: string[] = []
  if (symptoms.length) patientParts.push(`En la consulta de hoy hemos hablado de ${joinList(symptoms.map((s) => s.plain))}.`)
  if (indications.length) patientParts.push(`Indicaciones: ${indications.map((i) => i.patient).join('; ')}.`)
  if (nextLabel) patientParts.push(`Próxima revisión: ${nextLabel}.`)

  return {
    reason: main.length ? `${serviceName} · consulta por ${joinList(main)}` : serviceName,
    observations: facts.length ? facts.join(' ') : '',
    diagnosis: '',
    plan: indications.map((i) => `${cap(i.clinical)}.`).join(' '),
    publicSummary: patientParts.join(' '),
    nextAction: nextLabel ? `Revisión ${nextLabel}` : '',
    nextActionDays: nextDays,
  }
}
