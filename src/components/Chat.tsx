import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, MessageSquarePlus, RotateCcw, Send } from 'lucide-react'
import { useStore } from '../store'
import { cx, fDateShort, fTime, sameDay } from '../lib/utils'
import type { Conversation, MessageCategory } from '../types'
import { Badge, Button, Field, Input, Modal, Select, Textarea } from './ui'

export const categories: MessageCategory[] = ['Citas', 'Facturas y pagos', 'Documentación', 'Datos personales', 'Otra consulta']

const categoryTone = (c: MessageCategory) =>
  ({ Citas: 'teal', 'Facturas y pagos': 'green', Documentación: 'blue', 'Datos personales': 'violet', 'Otra consulta': 'slate' } as const)[c]

export const CategoryBadge = ({ c }: { c: MessageCategory }) => <Badge tone={categoryTone(c)}>{c}</Badge>

/** Hilo de conversación con caja de respuesta. `side` indica quién está mirando. */
export function ChatThread({ conversation, side, readOnly, onClose }: { conversation: Conversation; side: 'clinic' | 'patient'; readOnly?: boolean; onClose?: () => void }) {
  const send = useStore((s) => s.sendMessage)
  const markRead = useStore((s) => s.markConversationRead)
  const setStatus = useStore((s) => s.setConversationStatus)
  const toast = useStore((s) => s.toast)
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const mine = side === 'clinic' ? 'clinica' : 'paciente'

  useEffect(() => {
    if ((side === 'clinic' && conversation.unreadClinic) || (side === 'patient' && conversation.unreadPatient)) markRead(conversation.id, side)
  }, [conversation, side, markRead])
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [conversation.messages.length, conversation.id])

  const submit = () => {
    const t = text.trim()
    if (!t) return
    send(conversation.id, t)
    setText('')
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{conversation.subject}</p>
          <div className="mt-0.5 flex items-center gap-2"><CategoryBadge c={conversation.category} />{conversation.status === 'cerrada' && <Badge>Cerrada</Badge>}</div>
        </div>
        <div className="flex gap-2">
          {!readOnly && side === 'clinic' && (conversation.status === 'abierta'
            ? <Button size="sm" variant="secondary" icon={CheckCircle2} onClick={() => { setStatus(conversation.id, 'cerrada'); toast('Conversación marcada como resuelta') }}>Marcar resuelta</Button>
            : <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => setStatus(conversation.id, 'abierta')}>Reabrir</Button>)}
          {onClose && <Button size="sm" variant="ghost" onClick={onClose}>Volver</Button>}
        </div>
      </div>
      <div className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/60 px-5 py-4">
        {conversation.messages.map((m, i) => {
          const own = m.from === mine
          const showDay = i === 0 || !sameDay(conversation.messages[i - 1].at, m.at)
          return (
            <div key={m.id}>
              {showDay && <p className="my-2 text-center text-[11px] font-medium text-slate-400">{sameDay(m.at, new Date()) ? 'Hoy' : fDateShort(m.at)}</p>}
              <div className={cx('flex', own ? 'justify-end' : 'justify-start')}>
                <div className={cx('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm', own ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200')}>
                  {!own && <p className="mb-0.5 text-[11px] font-semibold text-brand-700">{m.author}</p>}
                  <p className="whitespace-pre-line">{m.text}</p>
                  <p className={cx('mt-1 text-right text-[10px]', own ? 'text-brand-100' : 'text-slate-400')}>{fTime(m.at)}</p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={end} />
      </div>
      {!readOnly && (
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
              placeholder={conversation.status === 'cerrada' ? 'Escribe para reabrir la conversación…' : 'Escribe un mensaje… (Enter para enviar)'}
              className="min-h-[44px] resize-none"
              rows={1}
            />
            <Button icon={Send} onClick={submit} disabled={!text.trim()} aria-label="Enviar">Enviar</Button>
          </div>
          {side === 'patient' && <p className="mt-2 text-[11px] text-slate-400">Canal administrativo. Para síntomas o urgencias llama al 112; las consultas clínicas se derivan a tu profesional.</p>}
        </div>
      )}
    </div>
  )
}

/** Formulario de nueva solicitud. Desde el portal el paciente es fijo; desde la clínica se elige. */
export function NewRequestModal({ open, onClose, patientId, onCreated }: { open: boolean; onClose: () => void; patientId?: string; onCreated?: (id: string) => void }) {
  const patients = useStore((s) => s.patients)
  const create = useStore((s) => s.createConversation)
  const addTask = useStore((s) => s.addTask)
  const toast = useStore((s) => s.toast)
  const [pid, setPid] = useState(patientId ?? '')
  const [category, setCategory] = useState<MessageCategory>('Citas')
  const [subject, setSubject] = useState('')
  const [text, setText] = useState('')
  const [file, setFile] = useState('')
  useEffect(() => {
    if (open) { setPid(patientId ?? ''); setCategory('Citas'); setSubject(''); setText(''); setFile('') }
  }, [open, patientId])

  const submit = () => {
    const body = file ? `${text}\n\n📎 Adjunto: ${file}` : text
    const c = create({ patientId: pid, subject, category }, body)
    // Solo las solicitudes que crea el paciente generan tarea para administración
    if (useStore.getState().session?.kind === 'patient') {
      addTask({ title: `Responder solicitud: ${subject}`, kind: category === 'Facturas y pagos' ? 'economico' : category === 'Citas' ? 'cita' : category === 'Datos personales' ? 'datos' : 'general', patientId: pid, role: category === 'Facturas y pagos' ? 'facturacion' : 'recepcion', due: new Date().toISOString().slice(0, 10), priority: 'media' })
    }
    toast('Solicitud enviada')
    onCreated?.(c.id)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva solicitud" subtitle="Te responderemos por este mismo chat." size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button icon={MessageSquarePlus} disabled={!pid || !subject.trim() || !text.trim()} onClick={submit}>Enviar solicitud</Button></>}>
      <div className="grid gap-4">
        {!patientId && (
          <Field label="Paciente">
            <Select value={pid} onChange={(e) => setPid(e.target.value)}>
              <option value="">Selecciona…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} · {p.nhc}</option>)}
            </Select>
          </Field>
        )}
        <div>
          <p className="mb-1 text-xs font-medium text-slate-600">¿Sobre qué es?</p>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {categories.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={category === c} onClick={() => setCategory(c)} className={cx('rounded-full px-3 py-1.5 text-sm ring-1 transition', category === c ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:ring-brand-300')}>{c}</button>
            ))}
          </div>
        </div>
        <Field label="Asunto"><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="p. ej. Necesito la factura de septiembre" /></Field>
        <Field label="Mensaje"><Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Cuéntanos qué necesitas" /></Field>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <span className="rounded-lg bg-slate-100 px-3 py-1.5 ring-1 ring-slate-200 hover:bg-slate-50">Adjuntar archivo</span>
          <span className="truncate text-xs text-slate-500">{file || 'Opcional (PDF, foto…)'}</span>
          <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0]?.name ?? '')} />
        </label>
      </div>
    </Modal>
  )
}
