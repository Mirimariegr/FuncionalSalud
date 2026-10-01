import { useState } from 'react'
import { Inbox, MessageSquarePlus } from 'lucide-react'
import { useCurrentPatient, useStore } from '../../store'
import { cx, fTime, relativeDays, sameDay } from '../../lib/utils'
import { Badge, Button } from '../../components/ui'
import { CategoryBadge, ChatThread, NewRequestModal } from '../../components/Chat'

export default function PortalMessages() {
  const p = useCurrentPatient()!
  const conversations = useStore((s) => s.conversations).filter((c) => c.patientId === p.id).sort((a, b) => b.messages[b.messages.length - 1].at.localeCompare(a.messages[a.messages.length - 1].at))
  const [selected, setSelected] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const current = conversations.find((c) => c.id === selected)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mensajes</h1>
          <p className="text-sm text-slate-500">Habla con administración: citas, facturas, documentos o tus datos.</p>
        </div>
        <Button icon={MessageSquarePlus} onClick={() => setOpen(true)}>Nueva solicitud</Button>
      </div>

      {current ? (
        <div className="h-[calc(100vh-260px)] min-h-[440px] overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          <ChatThread conversation={current} side="patient" onClose={() => setSelected(null)} />
        </div>
      ) : conversations.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-slate-200">
          <Inbox className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 font-medium">Aún no tienes mensajes</p>
          <Button className="mt-4" icon={MessageSquarePlus} onClick={() => setOpen(true)}>Escribir a la clínica</Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {conversations.map((c) => {
            const last = c.messages[c.messages.length - 1]
            return (
              <li key={c.id}>
                <button onClick={() => setSelected(c.id)} className={cx('flex w-full items-start gap-4 rounded-2xl bg-white p-4 text-left ring-1 transition hover:shadow-md', c.unreadPatient ? 'ring-brand-300' : 'ring-slate-200')}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cx('truncate', c.unreadPatient ? 'font-semibold' : 'font-medium')}>{c.subject}</p>
                      <CategoryBadge c={c.category} />
                      {c.status === 'cerrada' && <Badge>Resuelta</Badge>}
                      {c.unreadPatient && <Badge tone="teal" dot>Respuesta nueva</Badge>}
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500">{last.from === 'paciente' ? 'Tú: ' : `${last.author.split(' · ')[0]}: `}{last.text}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{sameDay(last.at, new Date()) ? fTime(last.at) : relativeDays(last.at)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <NewRequestModal open={open} onClose={() => setOpen(false)} patientId={p.id} onCreated={(id) => setSelected(id)} />
    </div>
  )
}
