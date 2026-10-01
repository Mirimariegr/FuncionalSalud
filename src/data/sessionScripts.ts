/**
 * Conversaciones de ejemplo para el modo demo de «Grabar y resumir sesión».
 * En producción la transcripción vendría del audio real y el resumen de un modelo de IA,
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

export const scripts: Record<string, SessionScript> = {
  Fisioterapia: {
    lines: [
      { who: 'Profesional', text: 'Buenos días. ¿Qué tal ha ido la semana con la rodilla?' },
      { who: 'Paciente', text: 'Mucho mejor. El dolor ha bajado, diría que un tres sobre diez. Solo me molesta al bajar escaleras.' },
      { who: 'Profesional', text: '¿Has podido hacer los ejercicios de casa todos los días?' },
      { who: 'Paciente', text: 'Casi todos, me salté el fin de semana. La sentadilla en pared la aguanto ya cuarenta segundos.' },
      { who: 'Profesional', text: 'Muy bien. Vamos a medir la flexión… ciento treinta grados, has ganado cinco desde la última sesión.' },
      { who: 'Profesional', text: 'Hoy trabajamos terapia manual en rótula y progresamos a step-down con carga.' },
      { who: 'Paciente', text: '¿Puedo empezar a correr?' },
      { who: 'Profesional', text: 'Puedes probar trote suave diez minutos en llano, dos días esta semana. Si el dolor sube de cuatro, paras.' },
      { who: 'Profesional', text: 'Nos vemos la semana que viene para revisar cómo toleras el trote.' },
    ],
    summary: {
      reason: 'Sesión de seguimiento · rodilla derecha',
      observations: 'Dolor 3/10 (EVA), molestia al bajar escaleras. Flexión 130º (+5º respecto a la sesión anterior). Buena adherencia a ejercicios domiciliarios; sentadilla isométrica 40 s.',
      diagnosis: 'Síndrome femoropatelar derecho, evolución favorable',
      plan: 'Terapia manual rotuliana y progresión a step-down con carga. Inicio de trote suave 10 min en llano, 2 días/semana; detener si dolor > 4/10.',
      publicSummary: 'Buena evolución: menos dolor y más movilidad. Puedes empezar a trotar suave 10 minutos, dos días esta semana, y parar si el dolor sube de 4 sobre 10. Sigue con los ejercicios de casa.',
      nextAction: 'Revisar tolerancia al trote',
      nextActionDays: 7,
    },
  },
  Odontología: {
    lines: [
      { who: 'Profesional', text: 'Hola. ¿Cómo has notado la muela desde la primera sesión de endodoncia?' },
      { who: 'Paciente', text: 'Los dos primeros días me dolió un poco al masticar, pero ya no.' },
      { who: 'Profesional', text: 'Perfecto. Vamos a hacer una radiografía de control y terminar la obturación de los conductos.' },
      { who: 'Profesional', text: 'La radiografía muestra buen sellado. Colocamos la reconstrucción provisional.' },
      { who: 'Paciente', text: '¿Cuándo me ponéis la definitiva?' },
      { who: 'Profesional', text: 'En dos semanas, cuando esté todo asentado. Mientras tanto evita morder cosas duras de ese lado.' },
    ],
    summary: {
      reason: 'Segunda sesión de endodoncia · pieza 36',
      observations: 'Molestias leves a la masticación los dos primeros días, actualmente asintomático. Rx de control con buen sellado de conductos.',
      diagnosis: 'Endodoncia pieza 36 finalizada',
      plan: 'Obturación de conductos completada. Reconstrucción provisional; definitiva en 2 semanas. Evitar alimentos duros en el lado izquierdo.',
      publicSummary: 'Hemos terminado la endodoncia. Llevas un empaste provisional: evita morder cosas duras de ese lado hasta la próxima cita, en unas dos semanas.',
      nextAction: 'Cita para reconstrucción definitiva',
      nextActionDays: 14,
    },
  },
  'Medicina general': {
    lines: [
      { who: 'Profesional', text: 'Buenas. Venías a revisar la tensión, ¿verdad? ¿Cómo te encuentras?' },
      { who: 'Paciente', text: 'Bien, aunque algún día he tenido dolor de cabeza por la mañana.' },
      { who: 'Profesional', text: 'Vamos a tomarla… ciento treinta y ocho de máxima y ochenta y ocho de mínima. Algo alta.' },
      { who: 'Paciente', text: 'He estado con mucho estrés en el trabajo y como bastante fuera.' },
      { who: 'Profesional', text: 'Mantenemos el enalapril, reduce la sal y camina treinta minutos al día. Te pido una analítica.' },
      { who: 'Profesional', text: 'Apúntate la tensión en casa por la mañana durante dos semanas y lo revisamos con los resultados.' },
    ],
    summary: {
      reason: 'Control de tensión arterial',
      observations: 'Cefalea matutina ocasional. TA 138/88 mmHg. Refiere estrés laboral y dieta con exceso de sal.',
      diagnosis: 'HTA con control subóptimo',
      plan: 'Mantener enalapril 10 mg. Dieta baja en sal y caminar 30 min/día. Solicitar analítica. Automedición de TA matinal durante 2 semanas.',
      publicSummary: 'La tensión está algo alta. Sigue con tu medicación, reduce la sal y camina 30 minutos al día. Apunta tu tensión cada mañana durante dos semanas; te hemos pedido una analítica.',
      nextAction: 'Revisar automedición de TA y analítica',
      nextActionDays: 14,
    },
  },
  Nutrición: {
    lines: [
      { who: 'Profesional', text: '¿Qué tal estas tres semanas con el plan?' },
      { who: 'Paciente', text: 'Bien entre semana, pero los fines de semana me cuesta mucho.' },
      { who: 'Profesional', text: 'Vamos a la báscula… setenta y uno con cuatro, has bajado un kilo doscientos.' },
      { who: 'Profesional', text: 'Para el fin de semana te propongo planificar una comida libre y mantener el resto.' },
      { who: 'Paciente', text: 'Me parece más realista.' },
      { who: 'Profesional', text: 'Te actualizo el plan y nos vemos en tres semanas.' },
    ],
    summary: {
      reason: 'Seguimiento plan nutricional',
      observations: 'Peso 71,4 kg (−1,2 kg en 3 semanas). Buena adherencia entre semana; dificultad los fines de semana.',
      diagnosis: 'Evolución favorable del plan de pérdida de peso',
      plan: 'Actualizar plan incluyendo una comida libre planificada el fin de semana. Mantener resto de pautas.',
      publicSummary: 'Has bajado 1,2 kg. Te actualizamos el plan con una comida libre el fin de semana para que sea más fácil de seguir.',
      nextAction: 'Revisión de peso y adherencia',
      nextActionDays: 21,
    },
  },
}

/** Resumen simple por palabras clave para transcripciones reales (sin IA en el prototipo). */
export function summarizeTranscript(text: string, serviceName: string): SessionScript['summary'] {
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean)
  const pick = (re: RegExp) => sentences.filter((s) => re.test(s.toLowerCase())).join(' ')
  const observations = pick(/dolor|molest|mejor|peor|tensi|peso|siento|noto|me duele|grados|kilo/)
  const plan = pick(/vamos a|te recomiend|debes|tienes que|ejercicio|tomar|pauta|mantener|reduce|evita/)
  const next = sentences.find((s) => /próxim|semana que viene|nos vemos|revis/.test(s.toLowerCase()))
  return {
    reason: serviceName,
    observations: observations || sentences.slice(0, 3).join(' '),
    diagnosis: '',
    plan: plan || '',
    publicSummary: plan ? `Resumen de tu visita: ${plan}` : '',
    nextAction: next ? 'Revisión según lo acordado en consulta' : '',
    nextActionDays: /semana que viene|próxima semana/.test(text.toLowerCase()) ? 7 : 14,
  }
}
