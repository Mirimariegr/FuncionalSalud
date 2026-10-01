import { useState } from 'react'
import { Building2, DoorOpen, Pencil, Plus, Stethoscope, Tag } from 'lucide-react'
import { useRole, useStore } from '../../store'
import { canEdit } from '../../lib/permissions'
import { uid } from '../../lib/utils'
import { Avatar, Badge, Button, Field, Input, Modal, PageHeader, Select, Tabs, Td, Th, Toggle } from '../../components/ui'
import type { Center, Professional, Room, Service } from '../../types'

type Tab = 'centros' | 'profesionales' | 'salas' | 'servicios'
const roomTypes = ['Box fisioterapia', 'Gabinete dental', 'Consulta', 'Sala polivalente']
const colors = ['#0d9488', '#2563eb', '#9333ea', '#ea580c', '#db2777', '#16a34a', '#ca8a04', '#0891b2']

export default function Settings() {
  const role = useRole()
  const editable = canEdit(role, 'configuracion')
  const { centers, professionals, rooms, services, consentTemplates } = useStore()
  const upsert = useStore((s) => s.upsert)
  const toast = useStore((s) => s.toast)
  const [tab, setTab] = useState<Tab>('centros')
  const [center, setCenter] = useState<Center | null>(null)
  const [prof, setProf] = useState<Professional | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [svc, setSvc] = useState<Service | null>(null)

  const newItem = () => {
    if (tab === 'centros') setCenter({ id: '', name: '', address: '', phone: '', hours: 'L-V 9:00-20:00', active: true })
    if (tab === 'profesionales') setProf({ id: '', name: '', title: '', specialty: 'Fisioterapia', color: colors[professionals.length % colors.length], centerIds: [centers[0].id], serviceIds: [], active: true })
    if (tab === 'salas') setRoom({ id: '', name: '', type: roomTypes[0], centerId: centers[0].id, active: true })
    if (tab === 'servicios') setSvc({ id: '', name: '', specialty: 'Fisioterapia', duration: 30, price: 40, roomType: roomTypes[0], active: true })
  }
  const save = <T extends { id: string; name: string }>(key: 'centers' | 'professionals' | 'rooms' | 'services', item: T, entity: string, close: () => void) => {
    const isNew = !item.id
    const withId = { ...item, id: item.id || uid(key.slice(0, 2)) }
    upsert(key, withId as never, { action: isNew ? 'Alta' : 'Modificación', entity, detail: `${entity} «${item.name}»` })
    toast(`${entity} ${isNew ? 'creado' : 'actualizado'}`)
    close()
  }
  const specialties = [...new Set([...services.map((s) => s.specialty), ...professionals.map((p) => p.specialty)])]

  return (
    <div>
      <PageHeader title="Configuración de la clínica" subtitle="Maestros de la organización: centros, profesionales, salas, recursos y servicios." actions={editable && <Button icon={Plus} onClick={newItem}>Añadir</Button>} />
      <Tabs
        tabs={[
          { id: 'centros', label: 'Centros', count: centers.length, icon: Building2 },
          { id: 'profesionales', label: 'Profesionales', count: professionals.length, icon: Stethoscope },
          { id: 'salas', label: 'Salas y recursos', count: rooms.length, icon: DoorOpen },
          { id: 'servicios', label: 'Servicios', count: services.length, icon: Tag },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className="mt-5 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full">
            {tab === 'centros' && (
              <>
                <thead className="border-b border-slate-100 bg-slate-50/60"><tr><Th>Centro</Th><Th>Dirección</Th><Th>Teléfono</Th><Th>Horario</Th><Th>Estado</Th><Th /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {centers.map((c) => (
                    <tr key={c.id}><Td className="font-medium">{c.name}</Td><Td>{c.address}</Td><Td>{c.phone}</Td><Td>{c.hours}</Td><Td>{c.active ? <Badge tone="green">Activo</Badge> : <Badge>Inactivo</Badge>}</Td>
                      <Td>{editable && <EditBtn onClick={() => setCenter(c)} />}</Td></tr>
                  ))}
                </tbody>
              </>
            )}
            {tab === 'profesionales' && (
              <>
                <thead className="border-b border-slate-100 bg-slate-50/60"><tr><Th>Profesional</Th><Th>Especialidad</Th><Th>Centros</Th><Th>Servicios habilitados</Th><Th>Estado</Th><Th /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {professionals.map((p) => (
                    <tr key={p.id}>
                      <Td><div className="flex items-center gap-3"><Avatar name={p.name} size="sm" color={p.color} /><div><p className="font-medium">{p.name}</p><p className="text-xs text-slate-500">{p.title}</p></div></div></Td>
                      <Td>{p.specialty}</Td>
                      <Td className="text-xs">{p.centerIds.map((id) => centers.find((c) => c.id === id)?.name.split('·')[1]?.trim()).join(', ')}</Td>
                      <Td><div className="flex flex-wrap gap-1">{p.serviceIds.map((id) => <Badge key={id}>{services.find((s) => s.id === id)?.name}</Badge>)}</div></Td>
                      <Td>{p.active ? <Badge tone="green">Activo</Badge> : <Badge>Inactivo</Badge>}</Td>
                      <Td>{editable && <EditBtn onClick={() => setProf(p)} />}</Td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
            {tab === 'salas' && (
              <>
                <thead className="border-b border-slate-100 bg-slate-50/60"><tr><Th>Sala / recurso</Th><Th>Tipo</Th><Th>Centro</Th><Th>Servicios compatibles</Th><Th>Estado</Th><Th /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {rooms.map((r) => (
                    <tr key={r.id}>
                      <Td className="font-medium">{r.name}</Td><Td>{r.type}</Td><Td>{centers.find((c) => c.id === r.centerId)?.name}</Td>
                      <Td className="text-xs text-slate-500">{services.filter((s) => s.roomType === r.type).map((s) => s.name).join(', ')}</Td>
                      <Td>{r.active ? <Badge tone="green">Operativa</Badge> : <Badge tone="amber">Bloqueada</Badge>}</Td>
                      <Td>{editable && <EditBtn onClick={() => setRoom(r)} />}</Td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
            {tab === 'servicios' && (
              <>
                <thead className="border-b border-slate-100 bg-slate-50/60"><tr><Th>Servicio</Th><Th>Especialidad</Th><Th>Duración</Th><Th>Precio</Th><Th>Recurso</Th><Th>Consentimiento</Th><Th /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {services.map((s) => (
                    <tr key={s.id}>
                      <Td className="font-medium">{s.name}</Td><Td>{s.specialty}</Td><Td>{s.duration} min</Td><Td>{s.price} €</Td><Td>{s.roomType ?? '—'}</Td>
                      <Td className="text-xs">{s.consentTemplateId ? <Badge tone="violet">{consentTemplates.find((t) => t.id === s.consentTemplateId)?.name}</Badge> : '—'}</Td>
                      <Td>{editable && <EditBtn onClick={() => setSvc(s)} />}</Td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      </div>

      {center && (
        <Modal open onClose={() => setCenter(null)} title={center.id ? 'Editar centro' : 'Nuevo centro'} size="md" footer={<Actions onCancel={() => setCenter(null)} disabled={!center.name} onSave={() => save('centers', center, 'Centro', () => setCenter(null))} />}>
          <div className="grid gap-3">
            <Field label="Nombre"><Input value={center.name} onChange={(e) => setCenter({ ...center, name: e.target.value })} autoFocus /></Field>
            <Field label="Dirección"><Input value={center.address} onChange={(e) => setCenter({ ...center, address: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Teléfono"><Input value={center.phone} onChange={(e) => setCenter({ ...center, phone: e.target.value })} /></Field>
              <Field label="Horario"><Input value={center.hours} onChange={(e) => setCenter({ ...center, hours: e.target.value })} /></Field>
            </div>
            <Toggle checked={center.active} onChange={(v) => setCenter({ ...center, active: v })} label="Centro activo" />
          </div>
        </Modal>
      )}
      {prof && (
        <Modal open onClose={() => setProf(null)} title={prof.id ? 'Editar profesional' : 'Nuevo profesional'} size="md" footer={<Actions onCancel={() => setProf(null)} disabled={!prof.name} onSave={() => save('professionals', prof, 'Profesional', () => setProf(null))} />}>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre"><Input value={prof.name} onChange={(e) => setProf({ ...prof, name: e.target.value })} autoFocus /></Field>
              <Field label="Titulación"><Input value={prof.title} onChange={(e) => setProf({ ...prof, title: e.target.value })} /></Field>
            </div>
            <Field label="Especialidad">
              <Input list="specialties" value={prof.specialty} onChange={(e) => setProf({ ...prof, specialty: e.target.value })} />
              <datalist id="specialties">{specialties.map((s) => <option key={s} value={s} />)}</datalist>
            </Field>
            <Field label="Centros" group>
              <div className="flex flex-wrap gap-3">{centers.map((c) => <Check key={c.id} label={c.name} checked={prof.centerIds.includes(c.id)} onChange={(v) => setProf({ ...prof, centerIds: v ? [...prof.centerIds, c.id] : prof.centerIds.filter((x) => x !== c.id) })} />)}</div>
            </Field>
            <Field label="Servicios habilitados" group>
              <div className="grid grid-cols-2 gap-2">{services.map((s) => <Check key={s.id} label={s.name} checked={prof.serviceIds.includes(s.id)} onChange={(v) => setProf({ ...prof, serviceIds: v ? [...prof.serviceIds, s.id] : prof.serviceIds.filter((x) => x !== s.id) })} />)}</div>
            </Field>
            <Field label="Color en agenda" group>
              <div className="flex gap-2">{colors.map((c) => <button key={c} type="button" onClick={() => setProf({ ...prof, color: c })} className="h-7 w-7 rounded-full ring-offset-2" style={{ background: c, boxShadow: prof.color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined }} />)}</div>
            </Field>
            <Toggle checked={prof.active} onChange={(v) => setProf({ ...prof, active: v })} label="Activo" />
          </div>
        </Modal>
      )}
      {room && (
        <Modal open onClose={() => setRoom(null)} title={room.id ? 'Editar sala' : 'Nueva sala o recurso'} size="sm" footer={<Actions onCancel={() => setRoom(null)} disabled={!room.name} onSave={() => save('rooms', room, 'Sala', () => setRoom(null))} />}>
          <div className="grid gap-3">
            <Field label="Nombre"><Input value={room.name} onChange={(e) => setRoom({ ...room, name: e.target.value })} autoFocus /></Field>
            <Field label="Tipo"><Select value={room.type} onChange={(e) => setRoom({ ...room, type: e.target.value })}>{roomTypes.map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Centro"><Select value={room.centerId} onChange={(e) => setRoom({ ...room, centerId: e.target.value })}>{centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Toggle checked={room.active} onChange={(v) => setRoom({ ...room, active: v })} label="Operativa (desactivar = bloqueo / mantenimiento)" />
          </div>
        </Modal>
      )}
      {svc && (
        <Modal open onClose={() => setSvc(null)} title={svc.id ? 'Editar servicio' : 'Nuevo servicio'} size="md" footer={<Actions onCancel={() => setSvc(null)} disabled={!svc.name} onSave={() => save('services', svc, 'Servicio', () => setSvc(null))} />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre" className="sm:col-span-2"><Input value={svc.name} onChange={(e) => setSvc({ ...svc, name: e.target.value })} autoFocus /></Field>
            <Field label="Especialidad"><Input list="specialties2" value={svc.specialty} onChange={(e) => setSvc({ ...svc, specialty: e.target.value })} /><datalist id="specialties2">{specialties.map((s) => <option key={s} value={s} />)}</datalist></Field>
            <Field label="Recurso necesario"><Select value={svc.roomType ?? ''} onChange={(e) => setSvc({ ...svc, roomType: e.target.value || undefined })}><option value="">Ninguno</option>{roomTypes.map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Duración (min)"><Input type="number" value={svc.duration} onChange={(e) => setSvc({ ...svc, duration: Number(e.target.value) })} /></Field>
            <Field label="Precio orientativo (€)"><Input type="number" value={svc.price} onChange={(e) => setSvc({ ...svc, price: Number(e.target.value) })} /></Field>
            <Field label="Consentimiento asociado" className="sm:col-span-2">
              <Select value={svc.consentTemplateId ?? ''} onChange={(e) => setSvc({ ...svc, consentTemplateId: e.target.value || undefined })}>
                <option value="">Ninguno</option>
                {consentTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
          </div>
        </Modal>
      )}
    </div>
  )
}

const EditBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
)
const Actions = ({ onCancel, onSave, disabled }: { onCancel: () => void; onSave: () => void; disabled?: boolean }) => (
  <><Button variant="secondary" onClick={onCancel}>Cancelar</Button><Button disabled={disabled} onClick={onSave}>Guardar</Button></>
)
const Check = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-brand-600" />{label}</label>
)
