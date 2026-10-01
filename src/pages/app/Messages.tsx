import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, MessageSquarePlus } from 'lucide-react'
import { useRole, useStore } from '../../store'
import { canEdit } from '../../lib/permissions'
import { cx, fTime, normalize, relativeDays, sameDay } from '../../lib/utils'
import { Avatar, Button, Empty, PageHeader, SearchInput, Select } from '../../components/ui'
import { categories, CategoryBadge, ChatThread, NewRequestModal } from '../../components/Chat'

export default function Messages() {
  const role = useRole()
  const editable = canEdit(role, 'mensajes')
  const { conversations, patients } = useStore()
  const [filter, setFilter] = useState<'abierta' | 'cerrada' | 'all'>('abierta')
  const [category, setCategory] = useState('all')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const pname = (id: string) => { const p = patients.find((x) => x.id === id); return p ? `${p.firstName} ${p.lastName}` : '' }

  const list = useMemo(() => {
    const n = normalize(q)
    return conversations
      .filter((c) => (filter === 'all' || c.status === filter) && (category === 'all' || c.category === category))
      .filter((c) => !n || normalize(`${c.subject} ${pname(c.patientId)}`).includes(n))
      .sort((a, b) => b.messages[b.messages.length - 1].at.localeCompare(a.messages[a.messages.length - 1].at))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, filter, category, q, patients])

  const current = conversations.find((c) => c.id === selected) ?? (selected === null ? list[0] : undefined)
  const unread = conversations.filter((c) => c.unreadClinic).length

  return (
    <div>
      <PageHeader
        title="Mensajes"
        subtitle={`Chat y solicitudes de pacientes con administración · ${unread} sin leer`}
        actions={editable && <Button icon={MessageSquarePlus} onClick={() => setOpen(true)}>Escribir a un paciente</Button>}
      />
      <div className="grid h-[calc(100vh-220px)] min-h-[480px] overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80 lg:grid-cols-[360px_1fr]">
        <aside className={cx('flex min-h-0 flex-col border-r border-slate-100', current && 'hidden lg:flex')}>
          <div className="space-y-2 border-b border-slate-100 p-3">
            <SearchInput value={q} onChange={setQ} placeholder="Buscar por paciente o asunto" />
            <div className="flex gap-2">
              <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="flex-1">
                <option value="abierta">Abiertas</option><option value="cerrada">Resueltas</option><option value="all">Todas</option>
              </Select>
              <Select value={category} onChange={(e) => setCategory(e.target.value)} className="flex-1">
                <option value="all">Todos los temas</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </div>
          </div>
          <ul className="scroll-thin min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
            {list.length === 0 && <li><Empty icon={Inbox} title="No hay conversaciones" /></li>}
            {list.map((c) => {
              const last = c.messages[c.messages.length - 1]
              return (
                <li key={c.id}>
                  <button onClick={() => setSelected(c.id)} className={cx('flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50', current?.id === c.id && 'bg-brand-50/60')}>
                    <Avatar name={pname(c.patientId)} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={cx('truncate text-sm', c.unreadClinic ? 'font-semibold text-slate-900' : 'font-medium text-slate-700')}>{pname(c.patientId)}</p>
                        <span className="shrink-0 text-[11px] text-slate-400">{sameDay(last.at, new Date()) ? fTime(last.at) : relativeDays(last.at)}</span>
                      </div>
                      <p className="truncate text-xs font-medium text-slate-600">{c.subject}</p>
                      <p className="truncate text-xs text-slate-500">{last.from === 'clinica' ? 'Tú: ' : ''}{last.text}</p>
                      <div className="mt-1 flex items-center gap-1.5"><CategoryBadge c={c.category} />{c.unreadClinic && <span className="h-2 w-2 rounded-full bg-brand-500" />}</div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>
        <section className={cx('min-h-0 flex-col', current ? 'flex' : 'hidden lg:flex')}>
          {current ? (
            <>
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-2 text-xs text-slate-500">
                Paciente: <Link to={`/app/pacientes/${current.patientId}`} className="font-medium text-brand-700 hover:underline">{pname(current.patientId)}</Link>
              </div>
              <div className="min-h-0 flex-1">
                <ChatThread conversation={current} side="clinic" readOnly={!editable} onClose={() => setSelected('')} />
              </div>
            </>
          ) : (
            <Empty icon={Inbox} title="Selecciona una conversación" />
          )}
        </section>
      </div>
      <NewRequestModal open={open} onClose={() => setOpen(false)} onCreated={(id) => setSelected(id)} />
    </div>
  )
}
