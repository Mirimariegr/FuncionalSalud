import { Fragment, useEffect, useRef, useState } from 'react'
import { Mic, Pause, Play, ShieldCheck, Sparkles, Square, Wand2 } from 'lucide-react'
import { useStore } from '../store'
import { summarizeTranscript, type ScriptLine } from '../data/sessionScripts'
import { addDays, cx, pad, toDateKey } from '../lib/utils'
import type { Appointment } from '../types'
import { Avatar, Button, Field, Input, Modal, Textarea, Toggle } from './ui'

// Tipos mínimos de la Web Speech API (solo Chrome/Edge la implementan con prefijo)
type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onstart: (() => void) | null
  onend: (() => void) | null
  onsoundstart: (() => void) | null
  onsoundend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
const SpeechRecognitionCtor = (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition
  ?? (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition

type Step = 'consent' | 'recording' | 'review'

/**
 * Sesión clínica con grabación: al iniciar la atención se transcribe la conversación y,
 * al finalizar, se propone un resumen que el profesional revisa y guarda en el historial.
 */
export function SessionRecorder({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const { patients, services, professionals, treatments } = useStore()
  const setStatus = useStore((s) => s.setAppointmentStatus)
  const saveEpisode = useStore((s) => s.saveEpisode)
  const registerSession = useStore((s) => s.registerSession)
  const addDocument = useStore((s) => s.addDocument)
  const log = useStore((s) => s.log)
  const toast = useStore((s) => s.toast)

  const p = patients.find((x) => x.id === appt.patientId)!
  const svc = services.find((x) => x.id === appt.serviceId)!
  const prof = professionals.find((x) => x.id === appt.professionalId)!
  const treatment = treatments.find((t) => t.patientId === p.id && t.status === 'activo' && t.professionalId === prof.id)

  const [step, setStep] = useState<Step>('consent')
  const [consent, setConsent] = useState(false)
  const [paused, setPaused] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [lines, setLines] = useState<ScriptLine[]>([])
  const [interim, setInterim] = useState('')
  const [micError, setMicError] = useState('')
  const [level, setLevel] = useState<number[]>(Array(32).fill(0.1))
  const [f, setF] = useState({ reason: '', observations: '', diagnosis: '', plan: '', publicSummary: '', nextAction: '', nextActionDate: '' })
  const [publish, setPublish] = useState(true)
  const [countSession, setCountSession] = useState(!!treatment)
  const [showTranscript, setShowTranscript] = useState(false)

  const [listening, setListening] = useState(false)
  const recRef = useRef<Recognition | null>(null)
  // true mientras la sesión deba seguir escuchando (Chrome corta el reconocimiento tras cada pausa)
  const activeRef = useRef(false)
  const soundRef = useRef(false)
  const interimRef = useRef('')
  const restartRef = useRef<number | undefined>(undefined)
  const pausedRef = useRef(false)
  const endRef = useRef<HTMLDivElement>(null)
  pausedRef.current = paused

  // Cronómetro
  useEffect(() => {
    if (step !== 'recording' || paused) return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [step, paused])

  // Ondas de audio animadas: en modo micrófono se mueven cuando el navegador detecta voz
  useEffect(() => {
    if (step !== 'recording') return
    const t = window.setInterval(() => {
      const quiet = pausedRef.current || !soundRef.current
      setLevel(Array.from({ length: 32 }, (_, i) => (quiet ? 0.08 : 0.15 + Math.abs(Math.sin(Date.now() / 180 + i * 0.7)) * 0.7 * Math.random())))
    }, 90)
    return () => window.clearInterval(t)
  }, [step])

  useEffect(() => endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }), [lines.length, interim])
  useEffect(() => () => stopMic(), []) // eslint-disable-line react-hooks/exhaustive-deps

  const stopMic = () => {
    activeRef.current = false
    window.clearTimeout(restartRef.current)
    const rec = recRef.current
    recRef.current = null
    try { rec?.stop() } catch { /* ya parado */ }
    setListening(false)
  }

  const fatal: Record<string, string> = {
    'not-allowed': 'El navegador ha bloqueado el micrófono. Permítelo en el icono del candado de la barra de direcciones.',
    'service-not-allowed': 'Este navegador no permite la transcripción. Usa Google Chrome o Microsoft Edge.',
    'audio-capture': 'No se detecta ningún micrófono.',
  }

  /** Abre una sesión de reconocimiento nueva. Chrome la cierra tras cada pausa: se relanza sola. */
  const listen = () => {
    if (!SpeechRecognitionCtor || !activeRef.current || pausedRef.current) return
    const rec = new SpeechRecognitionCtor()
    rec.lang = 'es-ES'
    rec.continuous = true
    rec.interimResults = true
    rec.onstart = () => setListening(true)
    rec.onsoundstart = () => { soundRef.current = true }
    rec.onsoundend = () => { soundRef.current = false }
    rec.onresult = (e) => {
      soundRef.current = true
      let partial = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        const text = r?.[0]?.transcript?.trim() ?? ''
        if (!text) continue
        if (r.isFinal) setLines((l) => [...l, { who: 'Profesional', text }])
        else partial += `${text} `
      }
      interimRef.current = partial.trim()
      setInterim(interimRef.current)
    }
    rec.onerror = (e) => {
      if (fatal[e.error]) {
        activeRef.current = false
        setMicError(fatal[e.error])
      } else if (e.error === 'network') {
        setMicError('Conexión inestable con el servicio de transcripción; reintentando…')
      }
      // 'no-speech' y 'aborted' son normales: se reanuda en onend
    }
    rec.onend = () => {
      setListening(false)
      soundRef.current = false
      // Si Chrome corta con texto a medias, se conserva
      if (interimRef.current) {
        const text = interimRef.current
        setLines((l) => [...l, { who: 'Profesional', text }])
        interimRef.current = ''
        setInterim('')
      }
      if (recRef.current === rec) recRef.current = null
      if (activeRef.current && !pausedRef.current) restartRef.current = window.setTimeout(listen, 250)
    }
    recRef.current = rec
    try {
      rec.start()
    } catch {
      recRef.current = null
      if (activeRef.current) restartRef.current = window.setTimeout(listen, 600)
    }
  }

  const startMic = async () => {
    if (!SpeechRecognitionCtor) {
      setMicError('Este navegador no permite transcribir en directo. Usa Google Chrome o Microsoft Edge.')
      return false
    }
    // Se pide permiso y se libera el micrófono enseguida: el reconocimiento de voz lo necesita en exclusiva
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('sin getUserMedia')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
    } catch {
      setMicError('No se ha podido acceder al micrófono. Revisa los permisos del navegador.')
      return false
    }
    activeRef.current = true
    listen()
    return true
  }

  const start = async () => {
    setMicError('')
    if (!(await startMic())) return
    if (appt.status !== 'en_curso') setStatus(appt.id, 'en_curso')
    log('Inicio', 'Grabación de sesión', `Grabación iniciada con consentimiento verbal · ${p.firstName} ${p.lastName}`)
    setStep('recording')
  }

  const togglePause = () => {
    const next = !paused
    setPaused(next)
    pausedRef.current = next
    if (next) {
      window.clearTimeout(restartRef.current)
      try { recRef.current?.stop() } catch { /* ignorado */ }
    } else listen()
  }

  const finish = () => {
    stopMic()
    const transcript = lines.map((l) => l.text).join('\n')
    const sum = summarizeTranscript(lines.map((l) => l.text), svc.name)
    setF({
      reason: sum.reason,
      observations: sum.observations,
      diagnosis: sum.diagnosis,
      plan: sum.plan,
      publicSummary: sum.publicSummary,
      nextAction: sum.nextAction,
      nextActionDate: toDateKey(addDays(new Date(), sum.nextActionDays)),
    })
    setShowTranscript(!transcript)
    setStep('review')
  }

  const save = () => {
    const transcript = lines.map((l) => l.text).join('\n')
    const ep = saveEpisode({
      patientId: p.id, professionalId: prof.id, appointmentId: appt.id, treatmentId: treatment?.id, date: new Date().toISOString(),
      reason: f.reason, observations: f.observations, diagnosis: f.diagnosis, plan: f.plan, publicSummary: f.publicSummary,
      nextAction: f.nextAction, nextActionDate: f.nextAction ? f.nextActionDate : undefined, closed: true,
      transcript, aiSummary: true, durationSec: seconds,
    })
    if (treatment && countSession) registerSession(treatment.id)
    if (publish && f.publicSummary) {
      addDocument({
        patientId: p.id, name: `Resumen de visita ${new Date().toLocaleDateString('es-ES')}.pdf`, type: 'Informe', date: new Date().toISOString(),
        author: prof.name, episodeId: ep.id, treatmentId: treatment?.id, version: 1, size: '42 KB', reviewStatus: 'revisado', published: true,
        publishedAt: new Date().toISOString(), content: f.publicSummary,
      })
    }
    setStatus(appt.id, 'atendida')
    toast('Sesión guardada en el historial del paciente')
    onClose()
  }

  const close = () => { stopMic(); onClose() }
  const mmss = `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  return (
    <Modal
      open
      onClose={step === 'recording' ? () => undefined : close}
      size="lg"
      title={<span key={step === 'review' ? 'r' : 'g'} className="flex items-center gap-2">{step === 'review' ? <Sparkles className="h-4 w-4 text-brand-600" /> : <Mic className="h-4 w-4 text-brand-600" />}{step === 'review' ? 'Revisa el resumen de la sesión' : 'Sesión con grabación y resumen automático'}</span>}
      subtitle={`${p.firstName} ${p.lastName} · ${svc.name} · ${prof.name}`}
      footer={
        step === 'consent' ? (
          <Fragment key="consent"><Button variant="secondary" onClick={close}>Cancelar</Button><Button icon={Mic} disabled={!consent} onClick={start}>Empezar grabación</Button></Fragment>
        ) : step === 'recording' ? (
          <Fragment key="recording"><Button key={paused ? 'resume' : 'pause'} variant="secondary" icon={paused ? Play : Pause} onClick={togglePause}>{paused ? 'Reanudar' : 'Pausar'}</Button><Button icon={Square} onClick={finish}>Finalizar y resumir</Button></Fragment>
        ) : (
          <Fragment key="review"><Button variant="secondary" onClick={close}>Descartar</Button><Button icon={ShieldCheck} disabled={!f.reason.trim()} onClick={save}>Validar y guardar en el historial</Button></Fragment>
        )
      }
    >
      {step === 'consent' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
            <Avatar name={`${p.firstName} ${p.lastName}`} />
            <div className="text-sm">
              <p className="font-medium">{p.firstName} {p.lastName}</p>
              <p className="text-xs text-slate-500">{p.nhc}{treatment && ` · ${treatment.name} (${treatment.doneSessions}/${treatment.totalSessions})`}</p>
            </div>
          </div>
          <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <Mic className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            Se usará el micrófono de este equipo para transcribir la consulta en directo. Funciona en Google Chrome y Microsoft Edge; el navegador pedirá permiso la primera vez.
          </p>
          <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-brand-600" />
            <span>He informado al paciente y consiente que se grabe la sesión para generar la nota clínica. El audio no se conserva: solo la transcripción y el resumen, que reviso antes de guardar.</span>
          </label>
          {micError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{micError}</p>}
        </div>
      )}

      {step === 'recording' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-2xl bg-slate-900 px-5 py-4 text-white">
            <span className={cx('relative grid h-10 w-10 shrink-0 place-items-center rounded-full', paused ? 'bg-slate-700' : 'bg-red-500')}>
              {!paused && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/60" />}
              <Mic className="relative h-5 w-5" />
            </span>
            <div className="w-16 shrink-0">
              <p key={mmss} className="font-mono text-xl tabular-nums">{mmss}</p>
              <p key={`${paused}-${listening}`} className="text-[11px] text-slate-400">{paused ? 'En pausa' : !listening ? 'Conectando…' : 'Grabando'}</p>
            </div>
            <div className="flex h-10 flex-1 items-center gap-[3px] overflow-hidden">
              {level.map((v, i) => <span key={i} className="w-1 shrink-0 rounded-full bg-brand-300 transition-[height] duration-100" style={{ height: `${Math.round(v * 100)}%` }} />)}
            </div>
          </div>
          <div className="scroll-thin h-72 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-4">
            {lines.length === 0 && !interim && <p className="pt-24 text-center text-sm text-slate-400">Empieza a hablar; la transcripción aparecerá aquí.</p>}
            {lines.map((l, i) => (
              <div key={i} className="animate-fade-up text-sm">
                <span className="text-slate-700">{l.text}</span>
              </div>
            ))}
            {interim && <p key={interim} className="text-sm italic text-slate-400">{interim}</p>}
            <div ref={endRef} />
          </div>
          {micError && <p className="text-xs text-red-600">{micError}</p>}
          <p className="text-xs text-slate-500">Cuando termine la consulta pulsa «Finalizar y resumir»: se generará la nota con observaciones, plan y próxima acción para que solo tengas que revisarla.</p>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
            <Wand2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Borrador generado a partir de {mmss} de conversación. Revísalo y corrige lo que haga falta: nada se guarda sin tu validación.</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Motivo" className="sm:col-span-2"><Input value={f.reason} onChange={set('reason')} /></Field>
            <Field label="Observaciones / exploración (interno)" className="sm:col-span-2"><Textarea value={f.observations} onChange={set('observations')} /></Field>
            <Field label="Juicio clínico"><Input value={f.diagnosis} onChange={set('diagnosis')} /></Field>
            <Field label="Próxima acción"><Input value={f.nextAction} onChange={set('nextAction')} /></Field>
            <Field label="Plan" className="sm:col-span-2"><Textarea value={f.plan} onChange={set('plan')} className="min-h-[60px]" /></Field>
            <Field label="Resumen para el paciente" className="sm:col-span-2"><Textarea value={f.publicSummary} onChange={set('publicSummary')} className="min-h-[60px]" /></Field>
            <Field label="Fecha próxima acción"><Input type="date" value={f.nextActionDate} onChange={set('nextActionDate')} /></Field>
          </div>
          <div className="flex flex-wrap gap-5 rounded-xl bg-slate-50 p-3">
            <Toggle checked={publish} onChange={setPublish} label="Publicar resumen en el portal del paciente" />
            {treatment && <Toggle checked={countSession} onChange={setCountSession} label={`Contar sesión de «${treatment.name}»`} />}
          </div>
          <div>
            <button type="button" onClick={() => setShowTranscript(!showTranscript)} className="text-xs font-medium text-brand-700 hover:underline">
              {showTranscript ? 'Ocultar transcripción' : `Ver transcripción completa (${lines.length} fragmentos)`}
            </button>
            {showTranscript && (
              <div className="scroll-thin mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                {lines.length === 0 ? <p>No se ha transcrito nada. Puedes escribir la nota a mano.</p> : lines.map((l, i) => <p key={i}>{l.text}</p>)}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
