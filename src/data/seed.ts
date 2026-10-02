import type {
  Appointment,
  AppointmentStatus,
  AuditEntry,
  Budget,
  Center,
  Consent,
  ConsentTemplate,
  Conversation,
  Prescription,
  DocumentItem,
  Episode,
  Patient,
  Payment,
  Professional,
  Room,
  Service,
  StaffUser,
  Task,
  Treatment,
} from '../types'
import { addDays, addMonths, atTime, toDateKey } from '../lib/utils'

export interface DB {
  centers: Center[]
  professionals: Professional[]
  rooms: Room[]
  services: Service[]
  patients: Patient[]
  appointments: Appointment[]
  episodes: Episode[]
  treatments: Treatment[]
  documents: DocumentItem[]
  consentTemplates: ConsentTemplate[]
  consents: Consent[]
  budgets: Budget[]
  payments: Payment[]
  tasks: Task[]
  audit: AuditEntry[]
  users: StaffUser[]
  prescriptions: Prescription[]
  conversations: Conversation[]
}

// Generador pseudoaleatorio determinista para que la demo sea siempre igual.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

export function buildSeed(): DB {
  const rand = rng(42)
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const iso = (d: Date) => d.toISOString()
  const dk = (d: Date) => toDateKey(d)

  const centers: Center[] = [
    { id: 'c1', name: 'Funcional Salud · Chamberí', address: 'C/ Fuencarral 142, 28010 Madrid', phone: '910 000 101', hours: 'L-V 8:00-20:00', active: true },
    { id: 'c2', name: 'Funcional Salud · Pozuelo', address: 'Av. de Europa 21, 28224 Pozuelo de Alarcón', phone: '910 000 202', hours: 'L-V 9:00-19:00 · S 9:00-14:00', active: true },
  ]

  const services: Service[] = [
    { id: 's1', name: 'Valoración fisioterapia', specialty: 'Fisioterapia', duration: 60, price: 55, roomType: 'Box fisioterapia', active: true },
    { id: 's2', name: 'Sesión fisioterapia', specialty: 'Fisioterapia', duration: 45, price: 45, roomType: 'Box fisioterapia', consentTemplateId: 'ct3', active: true },
    { id: 's3', name: 'Punción seca', specialty: 'Fisioterapia', duration: 30, price: 40, roomType: 'Box fisioterapia', consentTemplateId: 'ct3', active: true },
    { id: 's4', name: 'Revisión dental', specialty: 'Odontología', duration: 30, price: 35, roomType: 'Gabinete dental', active: true },
    { id: 's5', name: 'Higiene dental', specialty: 'Odontología', duration: 45, price: 60, roomType: 'Gabinete dental', active: true },
    { id: 's6', name: 'Endodoncia', specialty: 'Odontología', duration: 90, price: 280, roomType: 'Gabinete dental', consentTemplateId: 'ct4', active: true },
    { id: 's7', name: 'Consulta medicina general', specialty: 'Medicina general', duration: 30, price: 60, roomType: 'Consulta', active: true },
    { id: 's8', name: 'Consulta nutrición', specialty: 'Nutrición', duration: 45, price: 50, roomType: 'Consulta', active: true },
    { id: 's9', name: 'Revisión seguimiento', specialty: 'Medicina general', duration: 20, price: 40, roomType: 'Consulta', active: true },
  ]

  const professionals: Professional[] = [
    { id: 'p1', name: 'Laura Méndez', title: 'Fisioterapeuta', specialty: 'Fisioterapia', color: '#0d9488', centerIds: ['c1', 'c2'], serviceIds: ['s1', 's2', 's3'], active: true },
    { id: 'p2', name: 'Javier Ortega', title: 'Fisioterapeuta', specialty: 'Fisioterapia', color: '#2563eb', centerIds: ['c1'], serviceIds: ['s1', 's2', 's3'], active: true },
    { id: 'p3', name: 'Dra. Carmen Ruiz', title: 'Odontóloga', specialty: 'Odontología', color: '#9333ea', centerIds: ['c1'], serviceIds: ['s4', 's5', 's6'], active: true },
    { id: 'p4', name: 'Dr. Andrés Soler', title: 'Médico de familia', specialty: 'Medicina general', color: '#ea580c', centerIds: ['c1', 'c2'], serviceIds: ['s7', 's9'], active: true },
    { id: 'p5', name: 'Marta Vidal', title: 'Dietista-nutricionista', specialty: 'Nutrición', color: '#db2777', centerIds: ['c2'], serviceIds: ['s8'], active: true },
  ]

  const rooms: Room[] = [
    { id: 'r1', name: 'Box 1', type: 'Box fisioterapia', centerId: 'c1', active: true },
    { id: 'r2', name: 'Box 2', type: 'Box fisioterapia', centerId: 'c1', active: true },
    { id: 'r3', name: 'Gabinete A', type: 'Gabinete dental', centerId: 'c1', active: true },
    { id: 'r4', name: 'Consulta 1', type: 'Consulta', centerId: 'c1', active: true },
    { id: 'r5', name: 'Box P1', type: 'Box fisioterapia', centerId: 'c2', active: true },
    { id: 'r6', name: 'Consulta P1', type: 'Consulta', centerId: 'c2', active: true },
  ]

  const consentTemplates: ConsentTemplate[] = [
    { id: 'ct1', name: 'Información y protección de datos', kind: 'Protección de datos', version: 'v3.1', validityMonths: 36,
      body: 'De acuerdo con el RGPD y la LOPDGDD, le informamos de que sus datos personales y de salud serán tratados por la clínica con la finalidad de prestarle asistencia sanitaria, gestionar su historia clínica y la relación administrativa. Puede ejercer sus derechos de acceso, rectificación, supresión, limitación, oposición y portabilidad dirigiéndose al Responsable de privacidad.' },
    { id: 'ct2', name: 'Comunicaciones por WhatsApp y email', kind: 'Comunicaciones', version: 'v1.2', validityMonths: 24,
      body: 'Autorizo a la clínica a enviarme recordatorios de citas, avisos de documentos disponibles y comunicaciones administrativas a través de WhatsApp y correo electrónico. Puedo revocar esta autorización en cualquier momento desde el portal del paciente.' },
    { id: 'ct3', name: 'Consentimiento fisioterapia invasiva', kind: 'Tratamiento', version: 'v2.0', validityMonths: 12,
      body: 'He sido informado/a de la naturaleza de la técnica de punción seca y fisioterapia invasiva, sus beneficios, riesgos (dolor post-punción, hematoma, mareo) y alternativas. He podido realizar preguntas y autorizo su realización.' },
    { id: 'ct4', name: 'Consentimiento endodoncia', kind: 'Tratamiento', version: 'v1.4', validityMonths: 6,
      body: 'He sido informado/a del procedimiento de endodoncia, sus riesgos (fractura de instrumental, dolor, necesidad de retratamiento) y alternativas (extracción). Autorizo su realización.' },
    { id: 'ct5', name: 'Uso de imagen clínica', kind: 'Imagen', version: 'v1.0', validityMonths: 24,
      body: 'Autorizo la toma de fotografías clínicas para el seguimiento de mi tratamiento. No serán utilizadas con otra finalidad sin mi consentimiento expreso.' },
    { id: 'ct6', name: 'Acceso al portal del paciente', kind: 'Portal', version: 'v1.0', validityMonths: 0,
      body: 'Acepto las condiciones de uso del portal del paciente para consultar mi documentación publicada y realizar gestiones.' },
  ]

  const firstNames = ['María', 'Lucía', 'Pablo', 'Sergio', 'Elena', 'Carlos', 'Ana', 'David', 'Paula', 'Jorge', 'Sofía', 'Alberto', 'Irene', 'Raúl', 'Nuria', 'Hugo', 'Claudia', 'Tomás']
  const lastNames = ['García López', 'Martín Sanz', 'Fernández Gil', 'Romero Díaz', 'Navarro Pérez', 'Serrano Vega', 'Molina Cruz', 'Castro Ibáñez', 'Ortiz Blanco', 'Rubio Marín', 'Delgado Ramos', 'Morales León', 'Suárez Prieto', 'Herrera Cano', 'Vázquez Rey', 'Iglesias Mora', 'Medina Pardo', 'Cortés Nieto']
  const insurers = [undefined, 'Sanitas', 'Adeslas', 'DKV', 'Mapfre', undefined, 'Asisa']

  const patients: Patient[] = firstNames.map((fn, i) => {
    const ln = lastNames[i]
    const year = 1950 + Math.floor(rand() * 60)
    const birth = `${year}-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 27)).padStart(2, '0')}`
    const insurer = pick(insurers)
    const status: Patient['status'] = i === 16 ? 'prealta' : i === 17 ? 'inactivo' : i % 4 === 0 ? 'seguimiento' : 'activo'
    return {
      id: `pa${i + 1}`,
      nhc: `HC-${String(10231 + i * 7)}`,
      firstName: fn,
      lastName: ln,
      docId: `${String(10000000 + Math.floor(rand() * 89999999))}${'TRWAGMYFPDXBNJZSQVHLCKE'[i % 23]}`,
      birthDate: i === 7 ? `${today.getFullYear() - 12}-04-18` : birth,
      sex: i % 2 === 0 ? 'F' : 'M',
      phone: `6${String(10000000 + Math.floor(rand() * 89999999))}`,
      email: `${fn.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}.${ln.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}@correo.es`,
      address: `${pick(['C/ Alcalá', 'C/ Serrano', 'Av. América', 'C/ Bravo Murillo', 'C/ Princesa'])} ${Math.floor(rand() * 200) + 1}, Madrid`,
      language: i === 5 ? 'Inglés' : 'Español',
      preferredChannel: i % 5 === 0 ? 'email' : 'whatsapp',
      channelConsent: { whatsapp: i % 5 !== 0, email: true, sms: false },
      centerId: i % 3 === 0 ? 'c2' : 'c1',
      professionalId: professionals[i % professionals.length].id,
      status,
      insurer,
      policy: insurer ? `POL-${Math.floor(rand() * 900000 + 100000)}` : undefined,
      origin: pick(['Web', 'Recomendación', 'Aseguradora', 'Google', 'Derivación médica']),
      portalEnabled: i !== 16,
      allergies: [],
      medications: [],
      antecedents: [],
      relations: [],
      createdAt: iso(addDays(today, -110 + i * 6)),
    }
  })

  // Enriquecer algunos expedientes para que la ficha 360º luzca en la demo
  const p1 = patients[0]
  p1.allergies = [
    { id: 'al1', substance: 'Penicilina', reaction: 'Urticaria generalizada', severity: 'grave', status: 'activa', source: 'profesional', date: '2019-03-12' },
    { id: 'al2', substance: 'Látex', reaction: 'Dermatitis de contacto', severity: 'moderada', status: 'activa', source: 'profesional', date: '2021-06-02' },
  ]
  p1.medications = [
    { id: 'm1', name: 'Enalapril 10 mg', dose: '1 comprimido', frequency: 'Cada 24 h', status: 'actual', source: 'profesional', start: '2022-01-10' },
    { id: 'm2', name: 'Ibuprofeno 600 mg', dose: '1 comprimido', frequency: 'Si dolor, máx. 3/día', status: 'actual', source: 'profesional', start: dk(addDays(today, -20)) },
    { id: 'm3', name: 'Omeprazol 20 mg', dose: '1 cápsula', frequency: 'En ayunas', status: 'pendiente', source: 'paciente', start: dk(addDays(today, -3)) },
  ]
  p1.antecedents = [
    { id: 'an1', kind: 'personal', description: 'Hipertensión arterial controlada', date: '2021-11-01' },
    { id: 'an2', kind: 'quirurgico', description: 'Artroscopia rodilla derecha (menisco interno)', date: '2018-05-20' },
    { id: 'an3', kind: 'familiar', description: 'Madre con diabetes tipo 2', date: '2019-03-12' },
    { id: 'an4', kind: 'habito', description: 'Corredora aficionada, 3 días/semana', date: '2024-02-01' },
  ]
  p1.relations = [{ id: 'rel1', name: 'Luis García Pérez', kind: 'emergencia', phone: '600 112 233' }]
  p1.notes = 'Prefiere citas a primera hora de la mañana.'

  patients[2].allergies = [{ id: 'al3', substance: 'AINEs', reaction: 'Broncoespasmo', severity: 'grave', status: 'activa', source: 'profesional', date: '2020-01-01' }]
  patients[4].allergies = [{ id: 'al4', substance: 'Frutos secos', reaction: 'Picor orofaríngeo', severity: 'leve', status: 'pendiente', source: 'paciente', date: dk(addDays(today, -2)) }]
  patients[7].relations = [{ id: 'rel2', name: 'Beatriz Castro Ruiz', kind: 'tutor', phone: '611 223 344', validUntil: `${today.getFullYear() + 6}-04-18` }]
  patients[3].medications = [{ id: 'm4', name: 'Metformina 850 mg', dose: '1 comprimido', frequency: 'Cada 12 h', status: 'actual', source: 'profesional', start: '2020-09-01' }]

  const users: StaffUser[] = [
    { id: 'u1', name: 'Irene Campos', role: 'admin', email: 'irene.campos@funcionalsalud.es', centerIds: ['c1', 'c2'] },
    { id: 'u2', name: 'Roberto Lara', role: 'direccion', email: 'roberto.lara@funcionalsalud.es', centerIds: ['c1', 'c2'] },
    { id: 'u3', name: 'Silvia Ramos', role: 'recepcion', email: 'recepcion@funcionalsalud.es', centerIds: ['c1'] },
    { id: 'u4', name: 'Laura Méndez', role: 'sanitario', email: 'laura.mendez@funcionalsalud.es', centerIds: ['c1', 'c2'], professionalId: 'p1' },
    { id: 'u7', name: 'Dra. Carmen Ruiz', role: 'sanitario', email: 'carmen.ruiz@funcionalsalud.es', centerIds: ['c1'], professionalId: 'p3' },
    { id: 'u8', name: 'Dr. Andrés Soler', role: 'sanitario', email: 'andres.soler@funcionalsalud.es', centerIds: ['c1', 'c2'], professionalId: 'p4' },
    { id: 'u5', name: 'Pedro Gómez', role: 'facturacion', email: 'facturacion@funcionalsalud.es', centerIds: ['c1', 'c2'] },
    { id: 'u6', name: 'Elvira Sanz', role: 'privacidad', email: 'dpo@funcionalsalud.es', centerIds: ['c1', 'c2'] },
  ]

  // ---- Citas ----
  const appointments: Appointment[] = []
  const roomFor = (svc: Service, centerId: string, idx: number) => {
    const rs = rooms.filter((r) => r.centerId === centerId && r.type === svc.roomType)
    return rs.length ? rs[idx % rs.length].id : undefined
  }
  const slots = [9, 10, 11, 12, 13, 16, 17, 18]
  let apptN = 0
  for (let d = -32; d <= 14; d++) {
    const day = addDays(today, d)
    const wd = day.getDay()
    if (wd === 0 || wd === 6) continue
    for (const prof of professionals) {
      const nSlots = d === 0 ? 5 : 2 + Math.floor(rand() * 3)
      const used = new Set<number>()
      for (let k = 0; k < nSlots; k++) {
        let h = pick(slots)
        let guard = 0
        while (used.has(h) && guard++ < 10) h = pick(slots)
        if (used.has(h)) continue
        used.add(h)
        const sid = pick(prof.serviceIds)
        const svc = services.find((s) => s.id === sid)!
        const centerId = prof.centerIds[(d + k + 30) % prof.centerIds.length]
        const candidates = patients.filter((p) => p.status !== 'prealta' && p.status !== 'inactivo' && p.id !== 'pa1')
        const patient = prof.id === 'p1' && k === 0 && d % 7 === 0 && d < 0 ? patients[0] : pick(candidates)
        const start = atTime(day, h, pick([0, 0, 15, 30]))
        const end = new Date(start.getTime() + svc.duration * 60000)
        let status: AppointmentStatus
        if (d < 0) {
          const r = rand()
          status = r < 0.82 ? 'atendida' : r < 0.9 ? 'no_presentada' : 'cancelada'
        } else if (d === 0) {
          const nowMs = Date.now()
          status = end.getTime() <= nowMs ? 'atendida' : start.getTime() <= nowMs ? 'en_curso' : rand() < 0.7 ? 'confirmada' : 'pendiente'
        } else {
          const r = rand()
          status = r < 0.55 ? 'confirmada' : r < 0.85 ? 'pendiente' : r < 0.93 ? 'replanificacion' : 'propuesta'
        }
        apptN++
        appointments.push({
          id: `ap${apptN}`,
          patientId: patient.id,
          serviceId: svc.id,
          professionalId: prof.id,
          centerId,
          roomId: roomFor(svc, centerId, apptN),
          start: iso(start),
          end: iso(end),
          status,
          reason: pick(['Dolor lumbar', 'Revisión', 'Control evolutivo', 'Primera visita', 'Cervicalgia', 'Seguimiento plan', 'Molestias']),
          history: [{ at: iso(addDays(start, -7)), status: 'pendiente', by: 'Sistema' }],
        })
      }
    }
  }
  // Evitar solapes en el seed: mismo profesional → se descarta; misma sala → se quita la sala
  appointments.sort((a, b) => a.start.localeCompare(b.start))
  const kept: Appointment[] = []
  for (const a of appointments) {
    const overlaps = (b: Appointment) => a.start < b.end && b.start < a.end
    if (kept.some((b) => (b.professionalId === a.professionalId || b.patientId === a.patientId) && overlaps(b))) continue
    if (a.roomId && kept.some((b) => b.roomId === a.roomId && overlaps(b))) a.roomId = undefined
    kept.push(a)
  }
  appointments.length = 0
  appointments.push(...kept)

  // Asegurar una cita futura concreta para María (paciente estrella del portal)
  const mariaNext = atTime(addDays(today, (8 - today.getDay()) % 7 || 2), 10, 0)
  const mariaEnd = new Date(mariaNext.getTime() + 45 * 60000)
  for (let i = appointments.length - 1; i >= 0; i--) {
    const a = appointments[i]
    if ((a.professionalId === 'p1' || a.roomId === 'r1' || a.patientId === 'pa1') && a.start < iso(mariaEnd) && iso(mariaNext) < a.end) appointments.splice(i, 1)
  }
  appointments.push({
    id: 'ap_maria', patientId: 'pa1', serviceId: 's2', professionalId: 'p1', centerId: 'c1', roomId: 'r1',
    start: iso(mariaNext), end: iso(new Date(mariaNext.getTime() + 45 * 60000)), status: 'pendiente',
    reason: 'Sesión 5 de 10 · rodilla', history: [{ at: iso(addDays(today, -2)), status: 'pendiente', by: 'Silvia Ramos' }],
  })

  // ---- Tratamientos ----
  const treatments: Treatment[] = [
    { id: 't1', patientId: 'pa1', professionalId: 'p1', name: 'Rehabilitación rodilla derecha', goals: 'Recuperar flexión completa y volver a correr 5 km sin dolor.', serviceId: 's2', totalSessions: 10, doneSessions: 4, status: 'activo', startDate: dk(addDays(today, -28)), reviewDate: dk(addDays(today, 14)), budgetId: 'b1', visibleToPatient: true },
    { id: 't2', patientId: 'pa3', professionalId: 'p3', name: 'Endodoncia pieza 36', goals: 'Tratamiento de conductos y reconstrucción.', serviceId: 's6', totalSessions: 2, doneSessions: 1, status: 'activo', startDate: dk(addDays(today, -10)), reviewDate: dk(addDays(today, 5)), budgetId: 'b2', visibleToPatient: true },
    { id: 't3', patientId: 'pa5', professionalId: 'p5', name: 'Plan nutricional', goals: 'Reducción de 6 kg en 4 meses y mejora de hábitos.', serviceId: 's8', totalSessions: 8, doneSessions: 3, status: 'activo', startDate: dk(addDays(today, -60)), reviewDate: dk(addDays(today, -3)), visibleToPatient: true },
    { id: 't4', patientId: 'pa9', professionalId: 'p2', name: 'Cervicalgia crónica', goals: 'Disminuir dolor (EVA < 3) y mejorar movilidad.', serviceId: 's2', totalSessions: 6, doneSessions: 6, status: 'finalizado', startDate: dk(addDays(today, -90)), visibleToPatient: true },
    { id: 't5', patientId: 'pa13', professionalId: 'p2', name: 'Esguince tobillo izquierdo', goals: 'Recuperar estabilidad y retorno deportivo.', serviceId: 's2', totalSessions: 8, doneSessions: 2, status: 'pausado', startDate: dk(addDays(today, -35)), reviewDate: dk(addDays(today, -7)), visibleToPatient: false },
  ]

  // ---- Episodios ----
  const episodes: Episode[] = [
    { id: 'e1', patientId: 'pa1', professionalId: 'p1', treatmentId: 't1', date: iso(atTime(addDays(today, -28), 9)), reason: 'Valoración inicial: dolor rodilla derecha tras carrera', observations: 'Derrame leve, flexión limitada a 110º. Test de McMurray negativo. Dolor 6/10 (EVA).', diagnosis: 'Síndrome femoropatelar derecho', plan: 'Plan de 10 sesiones: terapia manual, ejercicio terapéutico y readaptación a la carrera.', publicSummary: 'Valoración de rodilla derecha. Se inicia plan de 10 sesiones de fisioterapia.', nextAction: 'Programar sesiones semanales', nextActionDate: dk(addDays(today, -21)), closed: true },
    { id: 'e2', patientId: 'pa1', professionalId: 'p1', treatmentId: 't1', date: iso(atTime(addDays(today, -7), 10)), reason: 'Sesión 4 de 10', observations: 'Flexión 125º, dolor 3/10. Buena adherencia a ejercicios domiciliarios.', diagnosis: 'Síndrome femoropatelar derecho (evolución favorable)', plan: 'Progresar carga en sentadilla. Iniciar trote suave.', publicSummary: 'Evolución favorable. Se progresa a ejercicios de carga.', nextAction: 'Revisar tolerancia al trote', nextActionDate: dk(addDays(today, 7)), closed: true },
    { id: 'e3', patientId: 'pa1', professionalId: 'p4', date: iso(atTime(addDays(today, -120), 12)), reason: 'Control tensión arterial', observations: 'TA 128/82. Asintomática.', diagnosis: 'HTA controlada', plan: 'Mantener enalapril. Control en 6 meses.', publicSummary: 'Control de tensión correcto.', nextAction: 'Analítica de control', nextActionDate: dk(addDays(today, 60)), closed: true },
    { id: 'e4', patientId: 'pa3', professionalId: 'p3', treatmentId: 't2', date: iso(atTime(addDays(today, -10), 11)), reason: 'Dolor pieza 36', observations: 'Caries profunda con afectación pulpar. Rx periapical.', diagnosis: 'Pulpitis irreversible 36', plan: 'Endodoncia en 2 sesiones.', publicSummary: 'Se indica endodoncia de la pieza 36.', nextAction: 'Segunda sesión de endodoncia', nextActionDate: dk(addDays(today, 5)), closed: true },
  ]

  // ---- Documentos ----
  const documents: DocumentItem[] = [
    { id: 'd1', patientId: 'pa1', name: 'Informe valoración inicial rodilla.pdf', type: 'Informe', date: iso(addDays(today, -28)), author: 'Laura Méndez', episodeId: 'e1', treatmentId: 't1', version: 1, size: '184 KB', reviewStatus: 'revisado', published: true, publishedAt: iso(addDays(today, -27)), content: 'Paciente de mediana edad que acude por dolor en rodilla derecha tras aumento del volumen de carrera. Exploración: derrame leve, flexión 110º. Juicio clínico: síndrome femoropatelar. Plan: 10 sesiones de fisioterapia.' },
    { id: 'd2', patientId: 'pa1', name: 'Resonancia magnética rodilla D.pdf', type: 'Resultado', date: iso(addDays(today, -25)), author: 'Centro de imagen externo', treatmentId: 't1', version: 1, size: '2,1 MB', reviewStatus: 'revisado', published: false, content: 'RM rodilla derecha: condropatía rotuliana grado II. Meniscos sin roturas. Ligamentos íntegros.' },
    { id: 'd3', patientId: 'pa1', name: 'Pauta de ejercicios domiciliarios.pdf', type: 'Instrucciones', date: iso(addDays(today, -7)), author: 'Laura Méndez', episodeId: 'e2', treatmentId: 't1', version: 2, size: '96 KB', reviewStatus: 'revisado', published: true, publishedAt: iso(addDays(today, -7)), content: '1. Sentadilla isométrica en pared 5x30s. 2. Puente glúteo 3x12. 3. Step-down lateral 3x10. 4. Estiramiento cuádriceps 3x30s.' },
    { id: 'd4', patientId: 'pa1', name: 'Analítica general.pdf', type: 'Resultado', date: iso(addDays(today, -2)), author: 'Laboratorio Madrid Lab', version: 1, size: '320 KB', reviewStatus: 'pendiente', published: false, content: 'Hemograma y bioquímica dentro de la normalidad. Colesterol LDL 142 mg/dL.' },
    { id: 'd5', patientId: 'pa3', name: 'Radiografía periapical 36.jpg', type: 'Imagen', date: iso(addDays(today, -10)), author: 'Dra. Carmen Ruiz', episodeId: 'e4', treatmentId: 't2', version: 1, size: '740 KB', reviewStatus: 'revisado', published: false },
    { id: 'd6', patientId: 'pa3', name: 'Instrucciones post-endodoncia.pdf', type: 'Instrucciones', date: iso(addDays(today, -10)), author: 'Dra. Carmen Ruiz', treatmentId: 't2', version: 1, size: '64 KB', reviewStatus: 'revisado', published: true, publishedAt: iso(addDays(today, -10)) },
    { id: 'd7', patientId: 'pa5', name: 'Plan de alimentación semana 1-4.pdf', type: 'Instrucciones', date: iso(addDays(today, -60)), author: 'Marta Vidal', treatmentId: 't3', version: 3, size: '210 KB', reviewStatus: 'revisado', published: true, publishedAt: iso(addDays(today, -58)) },
    { id: 'd8', patientId: 'pa7', name: 'Informe derivación traumatología.pdf', type: 'Derivación', date: iso(addDays(today, -4)), author: 'Dr. Andrés Soler', version: 1, size: '120 KB', reviewStatus: 'pendiente', published: false },
    { id: 'd9', patientId: 'pa11', name: 'Resultado ecografía abdominal.pdf', type: 'Resultado', date: iso(addDays(today, -1)), author: 'Centro de imagen externo', version: 1, size: '1,4 MB', reviewStatus: 'pendiente', published: false },
    { id: 'd10', patientId: 'pa2', name: 'DNI escaneado.pdf', type: 'Aportado por paciente', date: iso(addDays(today, -40)), author: 'Paciente (portal)', version: 1, size: '410 KB', reviewStatus: 'revisado', published: false },
  ]

  // ---- Consentimientos ----
  const consents: Consent[] = []
  let cN = 0
  patients.forEach((p, i) => {
    if (p.status === 'prealta') return
    const sent = addDays(today, -300 + i * 9)
    consents.push({ id: `co${++cN}`, patientId: p.id, templateId: 'ct1', status: 'aceptado', sentAt: iso(sent), channel: 'presencial', viewedAt: iso(sent), respondedAt: iso(sent), expiresAt: iso(addMonths(sent, 36)), evidence: 'Aceptación presencial en recepción · firma en tableta' })
    if (p.channelConsent.whatsapp) {
      consents.push({ id: `co${++cN}`, patientId: p.id, templateId: 'ct2', status: 'aceptado', sentAt: iso(sent), channel: 'enlace', viewedAt: iso(sent), respondedAt: iso(sent), expiresAt: iso(addMonths(sent, 24)), evidence: 'Enlace seguro · OTP verificado' })
    }
  })
  consents.push(
    { id: `co${++cN}`, patientId: 'pa1', templateId: 'ct3', status: 'aceptado', sentAt: iso(addDays(today, -28)), channel: 'portal', viewedAt: iso(addDays(today, -28)), respondedAt: iso(addDays(today, -28)), expiresAt: iso(addMonths(addDays(today, -28), 12)), evidence: 'Portal · IP 83.45.x.x · OTP SMS' },
    { id: `co${++cN}`, patientId: 'pa1', templateId: 'ct5', status: 'pendiente', sentAt: iso(addDays(today, -1)), channel: 'portal' },
    { id: `co${++cN}`, patientId: 'pa3', templateId: 'ct4', status: 'aceptado', sentAt: iso(addDays(today, -10)), channel: 'presencial', viewedAt: iso(addDays(today, -10)), respondedAt: iso(addDays(today, -10)), expiresAt: iso(addMonths(addDays(today, -10), 6)), evidence: 'Firma presencial' },
    { id: `co${++cN}`, patientId: 'pa9', templateId: 'ct3', status: 'caducado', sentAt: iso(addDays(today, -400)), channel: 'portal', respondedAt: iso(addDays(today, -400)), expiresAt: iso(addDays(today, -35)) },
    { id: `co${++cN}`, patientId: 'pa13', templateId: 'ct3', status: 'pendiente', sentAt: iso(addDays(today, -6)), channel: 'enlace' },
    { id: `co${++cN}`, patientId: 'pa6', templateId: 'ct3', status: 'aceptado', sentAt: iso(addDays(today, -350)), channel: 'portal', respondedAt: iso(addDays(today, -350)), expiresAt: iso(addDays(today, 15)), evidence: 'Portal · OTP' },
    { id: `co${++cN}`, patientId: 'pa10', templateId: 'ct5', status: 'rechazado', sentAt: iso(addDays(today, -15)), channel: 'portal', respondedAt: iso(addDays(today, -14)) },
  )

  // ---- Presupuestos y pagos ----
  const budgets: Budget[] = [
    { id: 'b1', number: 'PRE-2026-0141', patientId: 'pa1', treatmentId: 't1', date: iso(addDays(today, -28)), validUntil: iso(addDays(today, 2)), taxRate: 0, status: 'aceptado', respondedAt: iso(addDays(today, -27)),
      lines: [{ concept: 'Valoración fisioterapia', serviceId: 's1', qty: 1, price: 55, discount: 0 }, { concept: 'Bono 10 sesiones fisioterapia', serviceId: 's2', qty: 10, price: 45, discount: 10 }] },
    { id: 'b2', number: 'PRE-2026-0152', patientId: 'pa3', treatmentId: 't2', date: iso(addDays(today, -10)), validUntil: iso(addDays(today, 20)), taxRate: 0, status: 'aceptado', respondedAt: iso(addDays(today, -10)),
      lines: [{ concept: 'Endodoncia molar', serviceId: 's6', qty: 1, price: 280, discount: 0 }, { concept: 'Reconstrucción composite', qty: 1, price: 90, discount: 0 }] },
    { id: 'b3', number: 'PRE-2026-0160', patientId: 'pa1', date: iso(addDays(today, -1)), validUntil: iso(addDays(today, 29)), taxRate: 0, status: 'enviado',
      lines: [{ concept: 'Higiene dental', serviceId: 's5', qty: 1, price: 60, discount: 0 }, { concept: 'Blanqueamiento (estética)', qty: 1, price: 250, discount: 15 }] },
    { id: 'b4', number: 'PRE-2026-0158', patientId: 'pa11', date: iso(addDays(today, -5)), validUntil: iso(addDays(today, 25)), taxRate: 21, status: 'enviado',
      lines: [{ concept: 'Programa readaptación deportiva (8 sesiones)', serviceId: 's2', qty: 8, price: 45, discount: 5 }] },
    { id: 'b5', number: 'PRE-2026-0133', patientId: 'pa14', date: iso(addDays(today, -45)), validUntil: iso(addDays(today, -15)), taxRate: 0, status: 'rechazado', respondedAt: iso(addDays(today, -40)),
      lines: [{ concept: 'Ortodoncia invisible', qty: 1, price: 3200, discount: 0 }] },
    { id: 'b6', number: 'PRE-2026-0162', patientId: 'pa5', date: iso(today), validUntil: iso(addDays(today, 30)), taxRate: 0, status: 'borrador',
      lines: [{ concept: 'Bono 4 consultas nutrición', serviceId: 's8', qty: 4, price: 50, discount: 10 }] },
  ]
  const payments: Payment[] = [
    { id: 'pay1', patientId: 'pa1', budgetId: 'b1', date: iso(addDays(today, -27)), amount: 250, method: 'Tarjeta', concept: 'Pago inicial bono fisioterapia' },
    { id: 'pay2', patientId: 'pa3', budgetId: 'b2', date: iso(addDays(today, -10)), amount: 185, method: 'Bizum', concept: '50% endodoncia' },
  ]
  // Pagos sueltos de citas atendidas (para indicadores)
  let payN = 3
  appointments
    .filter((a) => a.status === 'atendida' && !['pa1', 'pa3'].includes(a.patientId))
    .forEach((a, i) => {
      if (i % 3 === 2) return
      const svc = services.find((s) => s.id === a.serviceId)!
      payments.push({ id: `pay${payN++}`, patientId: a.patientId, date: a.end, amount: svc.price, method: pick(['Tarjeta', 'Efectivo', 'Bizum', 'Tarjeta']), concept: svc.name })
    })

  // ---- Tareas ----
  const tasks: Task[] = [
    { id: 'tk1', title: 'Revisar analítica general', detail: 'Resultado recibido del laboratorio pendiente de revisión.', kind: 'documento', patientId: 'pa1', role: 'sanitario', due: dk(today), priority: 'alta', done: false, createdAt: iso(addDays(today, -2)) },
    { id: 'tk2', title: 'Validar medicación declarada por paciente', detail: 'Omeprazol 20 mg declarado desde el portal.', kind: 'datos', patientId: 'pa1', role: 'sanitario', due: dk(addDays(today, 1)), priority: 'media', done: false, createdAt: iso(addDays(today, -3)) },
    { id: 'tk3', title: 'Validar alergia declarada: frutos secos', kind: 'datos', patientId: 'pa5', role: 'sanitario', due: dk(today), priority: 'alta', done: false, createdAt: iso(addDays(today, -2)) },
    { id: 'tk4', title: 'Renovar consentimiento de fisioterapia invasiva', detail: 'Caducado. El paciente tiene sesiones previstas.', kind: 'consentimiento', patientId: 'pa9', role: 'recepcion', due: dk(today), priority: 'alta', done: false, createdAt: iso(addDays(today, -1)) },
    { id: 'tk5', title: 'Llamar para completar prealta', detail: 'Faltan datos de documento y consentimiento RGPD.', kind: 'datos', patientId: 'pa17', role: 'recepcion', due: dk(addDays(today, 1)), priority: 'media', done: false, createdAt: iso(addDays(today, -1)) },
    { id: 'tk6', title: 'Revisar plan nutricional (revisión vencida)', kind: 'seguimiento', patientId: 'pa5', role: 'sanitario', due: dk(addDays(today, -3)), priority: 'media', done: false, createdAt: iso(addDays(today, -10)) },
    { id: 'tk7', title: 'Reclamar pago pendiente endodoncia', detail: 'Pendiente 185 € del presupuesto PRE-2026-0152.', kind: 'economico', patientId: 'pa3', role: 'facturacion', due: dk(addDays(today, 2)), priority: 'baja', done: false, createdAt: iso(addDays(today, -1)) },
    { id: 'tk8', title: 'Revisar informe de derivación a traumatología', kind: 'documento', patientId: 'pa7', role: 'sanitario', due: dk(addDays(today, 1)), priority: 'media', done: false, createdAt: iso(addDays(today, -4)) },
    { id: 'tk9', title: 'Contactar paciente: tratamiento pausado sin cita', kind: 'seguimiento', patientId: 'pa13', role: 'recepcion', due: dk(today), priority: 'media', done: false, createdAt: iso(addDays(today, -2)) },
    { id: 'tk10', title: 'Enviar presupuesto de bono nutrición', kind: 'economico', patientId: 'pa5', role: 'facturacion', due: dk(addDays(today, 1)), priority: 'baja', done: false, createdAt: iso(today) },
  ]
  appointments
    .filter((a) => a.status === 'replanificacion')
    .slice(0, 4)
    .forEach((a, i) =>
      tasks.push({ id: `tkr${i}`, title: 'Buscar nueva fecha (replanificación solicitada)', kind: 'cita', patientId: a.patientId, role: 'recepcion', due: dk(today), priority: 'alta', done: false, createdAt: iso(addDays(today, -1)), detail: `Cita ${services.find((s) => s.id === a.serviceId)?.name} del ${new Date(a.start).toLocaleDateString('es-ES')}` }),
    )

  // ---- Auditoría inicial ----
  const audit: AuditEntry[] = [
    { id: 'au1', at: iso(atTime(addDays(today, -1), 18, 12)), user: 'Laura Méndez', role: 'sanitario', action: 'Publicación', entity: 'Documento', detail: 'Publicado «Pauta de ejercicios domiciliarios» a María García López' },
    { id: 'au2', at: iso(atTime(addDays(today, -1), 12, 40)), user: 'Silvia Ramos', role: 'recepcion', action: 'Modificación', entity: 'Cita', detail: 'Cita de Pablo Fernández Gil replanificada' },
    { id: 'au3', at: iso(atTime(addDays(today, -1), 10, 5)), user: 'Roberto Lara', role: 'direccion', action: 'Exportación', entity: 'Informe', detail: 'Exportado informe de actividad mensual (CSV)' },
    { id: 'au4', at: iso(atTime(addDays(today, -2), 17, 30)), user: 'María García López', role: 'paciente', action: 'Declaración', entity: 'Medicación', detail: 'Declara Omeprazol 20 mg desde el portal' },
    { id: 'au5', at: iso(atTime(addDays(today, -2), 9, 15)), user: 'Elvira Sanz', role: 'privacidad', action: 'Acceso', entity: 'Auditoría', detail: 'Consulta del registro de accesos del centro Chamberí' },
  ]

  // ---- Recetas ----
  const rx = (n: number) => `RX-${String(482100 + n * 137)}`
  const prescriptions: Prescription[] = [
    { id: 'rx1', patientId: 'pa1', professionalId: 'p4', medication: 'Ibuprofeno 600 mg comprimidos', dose: '1 comprimido', frequency: 'Cada 8 horas, con comida', duration: '7 días', instructions: 'Tomar solo si hay dolor. No superar 3 comprimidos al día.', date: iso(addDays(today, -2)), validUntil: iso(addDays(today, 28)), code: rx(1), status: 'activa' },
    { id: 'rx2', patientId: 'pa1', professionalId: 'p4', medication: 'Enalapril 10 mg comprimidos', dose: '1 comprimido', frequency: 'Cada 24 horas, por la mañana', duration: 'Tratamiento crónico (3 meses)', instructions: 'Control de tensión en la próxima revisión.', date: iso(addDays(today, -20)), validUntil: iso(addDays(today, 70)), code: rx(2), status: 'activa' },
    { id: 'rx3', patientId: 'pa1', professionalId: 'p4', medication: 'Paracetamol 1 g comprimidos', dose: '1 comprimido', frequency: 'Cada 8 horas si dolor', duration: '5 días', instructions: '', date: iso(addDays(today, -90)), validUntil: iso(addDays(today, -60)), code: rx(3), status: 'dispensada' },
    { id: 'rx4', patientId: 'pa3', professionalId: 'p3', medication: 'Amoxicilina 500 mg cápsulas', dose: '1 cápsula', frequency: 'Cada 8 horas', duration: '7 días', instructions: 'Completar el tratamiento aunque desaparezcan las molestias.', date: iso(addDays(today, -10)), validUntil: iso(addDays(today, 20)), code: rx(4), status: 'activa' },
  ]

  // ---- Mensajes paciente ↔ administración ----
  const msg = (from: 'paciente' | 'clinica', author: string, text: string, at: Date) => ({ id: `m${Math.floor(rand() * 1e9)}`, from, author, text, at: iso(at) })
  const conversations: Conversation[] = [
    { id: 'cv1', patientId: 'pa1', subject: 'Factura de las sesiones de fisioterapia', category: 'Facturas y pagos', status: 'abierta', unreadClinic: false, unreadPatient: true, createdAt: iso(atTime(addDays(today, -1), 9, 12)),
      messages: [
        msg('paciente', 'María García López', 'Hola, ¿me podéis enviar la factura de las sesiones de fisioterapia para presentarla en Sanitas? Gracias.', atTime(addDays(today, -1), 9, 12)),
        msg('clinica', 'Pedro Gómez · Administración', 'Hola María. Te la preparamos hoy y la tendrás en «Documentos» del portal. ¿La necesitas a nombre de otra persona?', atTime(addDays(today, -1), 10, 3)),
      ] },
    { id: 'cv2', patientId: 'pa2', subject: '¿Puedo ir acompañada a la consulta?', category: 'Citas', status: 'abierta', unreadClinic: true, unreadPatient: false, createdAt: iso(atTime(today, 8, 40)),
      messages: [msg('paciente', 'Lucía Martín Sanz', 'Buenos días, el jueves tengo cita y me gustaría ir con mi madre. ¿Hay algún problema?', atTime(today, 8, 40))] },
    { id: 'cv3', patientId: 'pa6', subject: 'Cambio de dirección postal', category: 'Datos personales', status: 'abierta', unreadClinic: true, unreadPatient: false, createdAt: iso(atTime(addDays(today, -1), 19, 5)),
      messages: [msg('paciente', 'Carlos Serrano Vega', 'Me he mudado. La nueva dirección es C/ Ríos Rosas 22, 3ºB, 28003 Madrid.', atTime(addDays(today, -1), 19, 5))] },
    { id: 'cv4', patientId: 'pa5', subject: 'Justificante de asistencia', category: 'Documentación', status: 'cerrada', unreadClinic: false, unreadPatient: false, createdAt: iso(atTime(addDays(today, -6), 12, 0)),
      messages: [
        msg('paciente', 'Elena Navarro Pérez', '¿Me podéis dar un justificante para el trabajo de la consulta del martes?', atTime(addDays(today, -6), 12, 0)),
        msg('clinica', 'Silvia Ramos · Recepción', 'Claro, ya lo tienes publicado en tus documentos. ¡Un saludo!', atTime(addDays(today, -6), 12, 25)),
      ] },
  ]

  return { centers, professionals, rooms, services, patients, appointments, episodes, treatments, documents, consentTemplates, consents, budgets, payments, tasks, audit, users, prescriptions, conversations }
}
