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
  { re: /jaqueca|migrana/, clinical: 'cefalea', plain: 'dolor de cabeza' },
  { re: /(espalda baja|zona lumbar|riñones)|lumbago/, clinical: 'lumbalgia', plain: 'dolor de espalda' },
  { re: /sangr(an|ado|a) (las |de las )?encias|encias sangr/, clinical: 'sangrado gingival', plain: 'sangrado de encías' },
  { re: /sensibilidad|me da calambre con el frio/, clinical: 'hipersensibilidad dental', plain: 'sensibilidad dental' },
  { re: /pinchazo|punzante|me pincha/, clinical: 'dolor punzante', plain: 'pinchazos' },
  { re: /hormigueo|adormecid|se me duerme/, clinical: 'parestesias', plain: 'hormigueo' },
  { re: /inflamad|hinchad|hinchazon/, clinical: 'inflamación', plain: 'hinchazón' },
  { re: /fiebre|calentura/, clinical: 'fiebre', plain: 'fiebre' },
  { re: /\btos\b|toso/, clinical: 'tos', plain: 'tos' },
  { re: /mareo|mareada|mareado|vertigo/, clinical: 'mareo', plain: 'mareos' },
  { re: /nausea|ganas de vomitar|vomit/, clinical: 'náuseas', plain: 'náuseas' },
  { re: /diarrea/, clinical: 'diarrea', plain: 'diarrea' },
  { re: /estren/, clinical: 'estreñimiento', plain: 'estreñimiento' },
  { re: /me ahogo|falta de aire|no puedo respirar|me cuesta respirar/, clinical: 'disnea', plain: 'sensación de falta de aire' },
  { re: /picor|me pica/, clinical: 'prurito', plain: 'picor' },
  { re: /cansad|agotad|sin energia|sin fuerzas/, clinical: 'astenia', plain: 'cansancio' },
  { re: /no (puedo )?duermo|duermo mal|insomnio|no consigo dormir|me despierto|cuesta dormir|dormir mal|no descanso/, clinical: 'insomnio', plain: 'problemas para dormir' },
  { re: /ansiedad|ansios|nervios|agobi|estres|estresad/, clinical: 'ansiedad / estrés', plain: 'nervios o estrés' },
  {
    re: /triste|deprimid|hundid|la vida es una mierda|no tengo ganas de nada|todo me da igual|estoy fatal|estoy mal de animo|bajon/,
    clinical: 'bajo estado de ánimo',
    plain: 'tu estado de ánimo',
  },
]

/** Parte del cuerpo (sin tildes) → término clínico del dolor y nombre para el paciente. */
const BODY: Record<string, [string, string]> = {
  cabeza: ['cefalea', 'cabeza'], cadera: ['coxalgia', 'cadera'], caderas: ['coxalgia', 'caderas'], rodilla: ['gonalgia', 'rodilla'], rodillas: ['gonalgia', 'rodillas'],
  espalda: ['dorsalgia', 'espalda'], lumbar: ['lumbalgia', 'zona lumbar'], cuello: ['cervicalgia', 'cuello'], cervicales: ['cervicalgia', 'cervicales'],
  hombro: ['omalgia', 'hombro'], hombros: ['omalgia', 'hombros'], oido: ['otalgia', 'oído'], oidos: ['otalgia', 'oídos'], garganta: ['odinofagia', 'garganta'],
  muela: ['odontalgia', 'muela'], muelas: ['odontalgia', 'muelas'], diente: ['odontalgia', 'diente'], dientes: ['odontalgia', 'dientes'],
  estomago: ['dolor abdominal', 'estómago'], barriga: ['dolor abdominal', 'barriga'], tripa: ['dolor abdominal', 'tripa'], vientre: ['dolor abdominal', 'vientre'],
  pecho: ['dolor torácico', 'pecho'], codo: ['dolor de codo', 'codo'], muneca: ['dolor de muñeca', 'muñeca'], mano: ['dolor de mano', 'mano'], manos: ['dolor de manos', 'manos'],
  pie: ['dolor de pie', 'pie'], pies: ['dolor de pies', 'pies'], tobillo: ['dolor de tobillo', 'tobillo'], pierna: ['dolor de pierna', 'pierna'], piernas: ['dolor de piernas', 'piernas'],
  brazo: ['dolor de brazo', 'brazo'], ojo: ['dolor ocular', 'ojo'], ojos: ['dolor ocular', 'ojos'], mandibula: ['dolor mandibular', 'mandíbula'], hueso: ['dolor óseo', 'huesos'], huesos: ['dolor óseo', 'huesos'],
  costado: ['dolor costal', 'costado'], gemelo: ['dolor en gemelo', 'gemelo'], talon: ['talalgia', 'talón'], dedo: ['dolor en dedo', 'dedo'],
}
const NOT_PARTS = new Set(['mucho', 'poco', 'bastante', 'cuando', 'todo', 'un', 'una', 'que', 'nada', 'algo', 'siempre', 'ahora', 'hoy', 'ya', 'al', 'a'])

/** Detecta dolores en cualquier parte del cuerpo: «me duele la cadera derecha» → coxalgia derecha. */
function bodyPains(t: string) {
  const re = /(?:me duele|me duelen|le duele|me molesta|me molestan|dolor de|dolor en|molestias? en|tengo dolor (?:de|en)|siento dolor en)\s+(?:el |la |los |las |mi |mis |un |una |toda la |todo el )?([a-z]+)(?:\s+(derech[ao]s?|izquierd[ao]s?))?/g
  const out: { clinical: string; plain: string }[] = []
  for (const m of t.matchAll(re)) {
    const part = m[1]
    if (NOT_PARTS.has(part)) continue
    const side = m[2] ? ` ${m[2].replace(/s$/, '')}` : ''
    const known = BODY[part]
    const name = (known?.[1] ?? part) + side
    out.push({ clinical: known ? `${known[0]} (dolor de ${name})` : `dolor de ${name}`, plain: `dolor de ${name}` })
  }
  return out
}

/** Frases típicas del paciente (síntomas en primera persona) y del profesional (preguntas, indicaciones). */
export function guessSpeaker(text: string): ScriptLine['who'] {
  const t = plain(text)
  let patient = 0
  let prof = 0
  if (/\b(me duele|me duelen|me molesta|tengo|estoy|me siento|me noto|me pasa|no puedo|no duermo|me encuentro|me mareo|me cuesta|desde hace|mi (marido|mujer|madre|padre|hijo))\b/.test(t)) patient += 2
  if (/\b(yo|me|mi|mis)\b/.test(t)) patient += 1
  if (/\b(te |le )?(recomiendo|receto|voy a (pedir|recetar|mirar|explorar)|vamos a|deberias|tienes que|tiene que|debes|hay que|toma|tome|evita|evite|nos vemos|vuelve|vuelva)\b/.test(t)) prof += 2
  if (/\b(que tal|como (estas|esta|va|te encuentras|se encuentra|ha ido)|desde cuando|te duele|le duele|has notado|ha notado|cuentame|digame)\b/.test(t) || /^(donde|cuando|cuanto|has|tienes|tiene)\b/.test(t) || /\?/.test(text)) prof += 2
  if (/\b(te|le|usted|tu)\b/.test(t)) prof += 1
  return patient > prof ? 'Paciente' : prof > patient ? 'Profesional' : 'Paciente'
}

const SMALL_TALK = /^(hola|buenos dias|buenas( tardes)?|que tal|adios|hasta luego|gracias|muchas gracias|vale|si|no|bien|muy bien|de acuerdo|perfecto|ok|okey|claro|venga|bueno|pues nada)\b[\s\w]{0,12}$/

const NUM: Record<string, number> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, diez: 10, quince: 15 }

const joinList = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`)
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** Pasa una indicación dicha al paciente («deberías tomar…») a forma impersonal para la nota clínica. */
function extractIndications(text: string) {
  const triggers: [RegExp, string][] = [
    [/\b(?:no (?:debes|deberias de|deberias|tienes que|puedes|conviene)|evita|evite|nada de)\s+(.+)/, 'Evitar'],
    [/\b(?:te voy a recetar|te receto|le receto|voy a recetarte|te pauto|le pauto)\s+(.+)/, 'Se prescribe'],
    [/\b(?:te voy a pedir|te pido|le pido|vamos a pedir)\s+(.+)/, 'Se solicita'],
    [/\b(?:deberias de|deberias|deberia|tienes que|tiene que|debes|debe|hay que|te recomiendo|le recomiendo|recomiendo|es importante que|conviene)\s+(.+)/, 'Se recomienda'],
    [/\b(?:vamos a)\s+(.+)/, 'Se acuerda'],
  ]
  const out: { clinical: string; patient: string }[] = []
  const starts = /\s(?=y luego|y ademas|ademas|tambien|y te recomiendo|te recomiendo|le recomiendo|tienes que|(?<!no )deberias|vamos a|te voy a|y no )/
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
export function summarizeTranscript(lines: ScriptLine[], serviceName: string): SessionSummary {
  const full = lines.map((l) => l.text).join('. ')
  const t = plain(full)
  // Síntomas: de lo que dice el paciente (si no hay nada atribuido al paciente, de todo)
  const patientLines = lines.filter((l) => l.who === 'Paciente')
  const pt = plain((patientLines.length ? patientLines : lines).map((l) => l.text).join('. '))
  const profText = lines.filter((l) => l.who === 'Profesional').map((l) => l.text).join('. ') || full

  const found = [...bodyPains(pt), ...SYMPTOMS.filter((s) => s.re.test(pt))]
  // Sin repetidos (p. ej. cefalea dicha dos veces)
  const symptoms = found.filter((s, i) => !found.some((o, j) => j < i && (o.plain === s.plain || o.clinical === s.clinical)))

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

  const indications = extractIndications(profText)

  // Todo lo que dice el paciente y ninguna regla ha recogido se conserva literalmente
  const usedRe = [...SYMPTOMS.map((x) => x.re), /me duele|me duelen|me molesta|dolor|desde hace|sobre diez|de diez|mejor|peor|tomando|tomo/, ...Object.keys(BODY).map((k) => new RegExp(`\\b${k}\\b`))]
  const comments = patientLines
    .map((l) => l.text.trim())
    // Las frases largas se conservan aunque contengan un síntoma: suelen aportar contexto (cuándo, cómo)
    .filter((x) => {
      const words = x.split(/\s+/).length
      return words >= 3 && !SMALL_TALK.test(plain(x)) && (words > 12 || !usedRe.some((re) => re.test(plain(x))))
    })
  if (comments.length) facts.push(`Comenta: ${comments.map((c) => `«${c}»`).join('; ')}.`)

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
