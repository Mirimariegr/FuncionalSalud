import { useEffect, useRef, useState } from 'react'
import { Mic, Pause, Play, ShieldCheck, Sparkles, Square, Wand2 } from 'lucide-react'
import { useStore } from '../store'
import { scripts, summarizeTranscript, type ScriptLine } from '../data/sessionScripts'
import { addDays, cx, pad, toDateKey } from '../lib/utils'
import type { Appointment } from '../types'
import { Avatar, Badge, Button, Field, Input, Modal, Textarea, Toggle } from './ui'

// Tipos mínimos de la Web Speech API (solo Chrome/Edge la implementan con prefijo)
type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start: () => void
  stop: () => void
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
  const script = scripts[svc.specialty] ?? scripts.Fisioterapia
  const treatment = treatments.find((t) => t.patientId === p.id && t.status === 'activo' && t.professionalId === prof.id)

  const [step, setStep] = useState<Step>('consent')
  const [consent, setConsent] = useState(false)
  const [mode, setMode] = useState<'demo' | 'mic'>('demo')
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

  const recRef = useRef<Recognition | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const pausedRef = useRef(false)
  const endRef = useRef<HTMLDivElement>(null)
  pausedRef.current = paused

  // Cronómetro
  useEffect(() => {
    if (step !== 'recording' || paused) return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [step, paused])

  // Modo demo: la conversación va apareciendo como si se transcribiera en directo
  useEffect(() => {
    if (step !== 'recording' || mode !== 'demo' || paused) return
    if (lines.length >= script.lines.length) return
    const t = setTimeout(() => setLines((l) => [...l, script.lines[l.length]]), lines.length === 0 ? 900 : 2200)
    return () => clearTimeout(t)
  }, [step, mode, paused, lines.length, script.lines])

  // Ondas de audio: reales con micrófono, simuladas en demo
  useEffect(() => {
    if (step !== 'recording') return
    let raf = 0
    let analyser: AnalyserNode | null = null
    let ctx: AudioContext | null = null
    if (mode === 'mic' && streamRef.current) {
      // Si el navegador no deja analizar el audio, se usan ondas simuladas
      try {
        ctx = new AudioContext()
        analyser = ctx.createAnalyser()
        analyser.fftSize = 64
        ctx.createMediaStreamSource(streamRef.current).connect(analyser)
      } catch {
        analyser = null
      }
    }
    const data = new Uint8Array(32)
    const tick = () => {
      if (pausedRef.current) setLevel(Array(32).fill(0.08))
      else if (analyser) {
        analyser.getByteFrequencyData(data)
        setLevel(Array.from(data, (v) => Math.max(0.08, v / 255)))
      } else setLevel(Array.from({ length: 32 }, (_, i) => 0.15 + Math.abs(Math.sin(Date.now() / 180 + i * 0.7)) * 0.7 * Math.random()))
      raf = window.setTimeout(tick, 90) as unknown as number
    }
    tick()
    return () => { clearTimeout(raf); ctx?.close().catch(() => undefined) }
  }, [step, mode])

  useEffect(() => endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }), [lines.length, interim])
  useEffect(() => () => stopMic(), []) // eslint-disable-line react-hooks/exhaustive-deps

  const stopMic = () => {
    try { recRef.current?.stop() } catch { /* ya parado */ }
    recRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const startMic = async () => {
    if (!SpeechRecognitionCtor) {
      setMicError('Este navegador no permite transcribir en directo. Usa Chrome o Edge, o el modo demostración.')
      return false
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('sin getUserMedia')
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setMicError('No se ha podido acceder al micrófono. Revisa los permisos del navegador.')
      return false
    }
    const rec = new SpeechRecognitionCtor()
    rec.lang = 'es-ES'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e) => {
      let partial = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        const text = r?.[0]?.transcript?.trim() ?? ''
        if (!text) continue
        if (r.isFinal) setLines((l) => [...l, { who: 'Profesional', text }])
        else partial += `${text} `
      }
      setInterim(partial.trim())
    }
    rec.onerror = (e) => {
      const msg: Record<string, string> = {
        'not-allowed': 'El navegador ha bloqueado el micrófono. Permítelo en el icono del candado de la barra de direcciones.',
        'service-not-allowed': 'Este navegador no permite la transcripción. Usa Google Chrome o el modo demostración.',
        network: 'No hay conexión con el servicio de transcripción del navegador. Comprueba la conexión o usa el modo demostración.',
        'audio-capture': 'No se detecta ningún micrófono.',
      }
      if (e.error !== 'no-speech' && e.error !== 'aborted') setMicError(msg[e.error] ?? `Transcripción interrumpida (${e.error}).`)
    }
    // El reconocimiento se corta solo tras silencios: se relanza mientras dure la sesión
    rec.onend = () => { if (recRef.current === rec && !pausedRef.current) try { rec.start() } catch { /* ignorado */ } }
    recRef.current = rec
    try {
      rec.start()
    } catch {
      setMicError('No se ha podido iniciar la transcripción. Prueba el modo demostración.')
      stopMic()
      return false
    }
    return true
  }

  const start = async () => {
    setMicError('')
    if (mode === 'mic' && !(await startMic())) return
    if (appt.status !== 'en_curso') setStatus(appt.id, 'en_curso')
    log('Inicio', 'Grabación de sesión', `Grabación iniciada con consentimiento verbal · ${p.firstName} ${p.lastName}`)
    setStep('recording')
  }

  const togglePause = () => {
    const next = !paused
    setPaused(next)
    if (mode === 'mic') {
      if (next) try { recRef.current?.stop() } catch { /* ignorado */ }
      else try { recRef.current?.start() } catch { /* ignorado */ }
    }
  }

  const finish = () => {
    stopMic()
    const transcript = lines.map((l) => `${l.who}: ${l.text}`).join('\n')
    const sum = mode === 'demo' && lines.length > 0 ? script.summary : summarizeTranscript(lines.map((l) => l.text), svc.name)
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
    const transcript = lines.map((l) => `${l.who}: ${l.text}`).join('\n')
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
      title={<span className="flex items-center gap-2">{step === 'review' ? <Sparkles className="h-4 w-4 text-brand-600" /> : <Mic className="h-4 w-4 text-brand-600" />}{step === 'review' ? 'Revisa el resumen de la sesión' : 'Sesión con grabación y resumen automático'}</span>}
      subtitle={`${p.firstName} ${p.lastName} · ${svc.name} · ${prof.name}`}
      footer={
        step === 'consent' ? (
          <><Button variant="secondary" onClick={close}>Cancelar</Button><Button icon={Mic} disabled={!consent} onClick={start}>Empezar grabación</Button></>
        ) : step === 'recording' ? (
          <><Button variant="secondary" icon={paused ? Play : Pause} onClick={togglePause}>{paused ? 'Reanudar' : 'Pausar'}</Button><Button icon={Square} onClick={finish}>Finalizar y resumir</Button></>
        ) : (
          <><Button variant="secondary" onClick={close}>Descartar</Button><Button icon={ShieldCheck} disabled={!f.reason.trim()} onClick={save}>Validar y guardar en el historial</Button></>
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
          <div className="grid gap-3 sm:grid-cols-2">
            {([['demo', 'Demostración', 'Simula una consulta real para enseñar el flujo.'], ['mic', 'Micrófono', 'Transcribe en directo lo que se habla (Chrome o Edge).']] as const).map(([k, t, d]) => (
              <button key={k} type="button" onClick={() => setMode(k)} className={cx('rounded-xl p-4 text-left ring-1 transition', mode === k ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:ring-brand-300')}>
                <p className="text-sm font-semibold">{t}</p>
                <p className="mt-0.5 text-xs text-slate-500">{d}</p>
              </button>
            ))}
          </div>
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
              <p className="font-mono text-xl tabular-nums">{mmss}</p>
              <p className="text-[11px] text-slate-400">{paused ? 'En pausa' : 'Grabando'}</p>
            </div>
            <div className="flex h-10 flex-1 items-center gap-[3px] overflow-hidden">
              {level.map((v, i) => <span key={i} className="w-1 shrink-0 rounded-full bg-brand-300 transition-[height] duration-100" style={{ height: `${Math.round(v * 100)}%` }} />)}
            </div>
            <Badge tone="teal" className="hidden sm:inline-flex">{mode === 'demo' ? 'Demo' : 'Micrófono'}</Badge>
          </div>
          <div className="scroll-thin h-72 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-4">
            {lines.length === 0 && !interim && <p className="pt-24 text-center text-sm text-slate-400">{mode === 'mic' ? 'Empieza a hablar; la transcripción aparecerá aquí.' : 'Escuchando…'}</p>}
            {lines.map((l, i) => (
              <div key={i} className="animate-fade-up text-sm">
                <span className={cx('mr-2 text-[11px] font-semibold uppercase tracking-wide', l.who === 'Profesional' ? 'text-brand-700' : 'text-violet-700')}>{mode === 'mic' ? 'Transcripción' : l.who}</span>
                <span className="text-slate-700">{l.text}</span>
              </div>
            ))}
            {interim && <p className="text-sm italic text-slate-400">{interim}</p>}
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
              {showTranscript ? 'Ocultar transcripción' : `Ver transcripción completa (${lines.length} intervenciones)`}
            </button>
            {showTranscript && (
              <div className="scroll-thin mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                {lines.length === 0 ? <p>No se ha transcrito nada. Puedes escribir la nota a mano.</p> : lines.map((l, i) => <p key={i}><b>{l.who}:</b> {l.text}</p>)}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
