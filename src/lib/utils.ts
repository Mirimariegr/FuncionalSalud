export const uid = (prefix = 'id') => `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export const pad = (n: number) => String(n).padStart(2, '0')

export const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayKey = () => toDateKey(new Date())

export const addDays = (d: Date, n: number) => {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export const addMonths = (d: Date, n: number) => {
  const r = new Date(d)
  r.setMonth(r.getMonth() + n)
  return r
}

export const startOfWeek = (d: Date) => {
  const r = new Date(d)
  const day = (r.getDay() + 6) % 7
  r.setDate(r.getDate() - day)
  r.setHours(0, 0, 0, 0)
  return r
}

export const atTime = (d: Date, h: number, m = 0) => {
  const r = new Date(d)
  r.setHours(h, m, 0, 0)
  return r
}

export const sameDay = (a: Date | string, b: Date | string) => toDateKey(new Date(a)) === toDateKey(new Date(b))

const dateFmt = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
const dateShortFmt = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' })
const timeFmt = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' })
const longFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
const moneyFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

export const fDate = (s?: string) => (s ? dateFmt.format(new Date(s)) : '—')
export const fDateShort = (s?: string) => (s ? dateShortFmt.format(new Date(s)) : '—')
export const fTime = (s: string) => timeFmt.format(new Date(s))
export const fDateTime = (s?: string) => (s ? `${fDate(s)} · ${fTime(s)}` : '—')
export const fLong = (d: Date | string) => {
  const t = longFmt.format(new Date(d))
  return t.charAt(0).toUpperCase() + t.slice(1)
}
export const fMoney = (n: number) => moneyFmt.format(n)

export const age = (birth: string) => {
  const b = new Date(birth)
  const n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--
  return a
}

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

export const relativeDays = (s: string) => {
  const diff = Math.round((new Date(toDateKey(new Date(s))).getTime() - new Date(todayKey()).getTime()) / 86400000)
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'mañana'
  if (diff === -1) return 'ayer'
  if (diff > 0) return `en ${diff} días`
  return `hace ${-diff} días`
}
