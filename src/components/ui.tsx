import { createPortal } from 'react-dom'
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { X, CheckCircle2, AlertCircle, Info, type LucideIcon } from 'lucide-react'
import { cx, initials } from '../lib/utils'
import type { Tone } from '../lib/labels'
import { useStore } from '../store'

// ---------- Button ----------
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md'; icon?: LucideIcon }) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-900/10',
    secondary: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-white text-red-600 ring-1 ring-red-200 hover:bg-red-50',
    soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  }
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap',
        size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
        v[variant],
        className,
      )}
    >
      {Icon && <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
      {children}
    </button>
  )
}

// ---------- Badge ----------
const toneCls: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  teal: 'bg-brand-50 text-brand-700 ring-brand-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
}
const dotCls: Record<Tone, string> = {
  slate: 'bg-slate-400', teal: 'bg-brand-500', blue: 'bg-blue-500', amber: 'bg-amber-500', red: 'bg-red-500', violet: 'bg-violet-500', green: 'bg-emerald-500', orange: 'bg-orange-500',
}
export function Badge({ tone = 'slate', children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap', toneCls[tone], className)}>
      {dot && <span className={cx('h-1.5 w-1.5 rounded-full', dotCls[tone])} />}
      {children}
    </span>
  )
}

// ---------- Card ----------
export function Card({ children, className, title, action, icon: Icon, padded = true }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; icon?: LucideIcon; padded?: boolean }) {
  return (
    <section className={cx('rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)]', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            {Icon && <Icon className="h-4 w-4 text-brand-600" />}
            {title}
          </h3>
          {action}
        </header>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  )
}

// ---------- Stat ----------
export function Stat({ label, value, hint, icon: Icon, tone = 'teal' }: { label: string; value: ReactNode; hint?: ReactNode; icon: LucideIcon; tone?: Tone }) {
  const bg: Record<Tone, string> = {
    teal: 'bg-brand-50 text-brand-600', blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600',
    violet: 'bg-violet-50 text-violet-600', green: 'bg-emerald-50 text-emerald-600', orange: 'bg-orange-50 text-orange-600', slate: 'bg-slate-100 text-slate-600',
  }
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <span className={cx('grid h-8 w-8 place-items-center rounded-lg', bg[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

// ---------- Avatar ----------
const avatarColors = ['bg-teal-100 text-teal-700', 'bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-emerald-100 text-emerald-700', 'bg-sky-100 text-sky-700']
export function Avatar({ name, size = 'md', color }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; color?: string }) {
  const idx = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % avatarColors.length
  const s = { sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-xs', lg: 'h-12 w-12 text-sm', xl: 'h-16 w-16 text-lg' }[size]
  return (
    <span className={cx('grid shrink-0 place-items-center rounded-full font-semibold', s, !color && avatarColors[idx])} style={color ? { background: `${color}1f`, color } : undefined}>
      {initials(name)}
    </span>
  )
}

// ---------- Form fields ----------
/** Campo con etiqueta. `group` para varios controles (botones, checkboxes): evita que la etiqueta reenvíe el clic al primero. */
export function Field({ label, children, hint, className, group }: { label: string; children: ReactNode; hint?: string; className?: string; group?: boolean }) {
  const Tag = group ? 'div' : 'label'
  return (
    <Tag className={cx('block', className)}>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </Tag>
  )
}
const inputCls = 'rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-800 ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 outline-none transition'
// Si el llamador fija un ancho (w-*), no se aplica el w-full por defecto
const widthCls = (c?: string) => (/(^|\s)w-/.test(c ?? '') ? '' : 'w-full')
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(inputCls, widthCls(p.className), 'h-9', p.className)} />
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(inputCls, widthCls(p.className), 'h-9 pr-8', p.className)} />
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cx(inputCls, 'w-full min-h-[80px]', p.className)} />

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!checked)} className="inline-flex items-center gap-2 text-left text-sm text-slate-700 disabled:opacity-50">
      <span className={cx('relative h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-brand-600' : 'bg-slate-300')}>
        <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </span>
      {label}
    </button>
  )
}

// ---------- Modal ----------
export function Modal({ open, onClose, title, children, footer, size = 'md', subtitle }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size]
  // Portal a <body>: las animaciones con transform de los contenedores romperían el position: fixed
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-[2px] sm:p-8" onMouseDown={onClose}>
      <div className={cx('animate-scale-in w-full rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200', w)} onMouseDown={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="px-6 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/60 px-6 py-3">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}

// ---------- Tabs ----------
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number; icon?: LucideIcon }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="scroll-thin flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cx(
            '-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
            value === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800',
          )}
        >
          {t.icon && <t.icon className="h-4 w-4" />}
          {t.label}
          {t.count !== undefined && (
            <span className={cx('rounded-full px-1.5 text-[10px] font-semibold', value === t.id ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500')}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ---------- Empty ----------
export function Empty({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
      {text && <p className="mt-1 max-w-sm text-xs text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ---------- Page header ----------
export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

// ---------- Progress ----------
export function Progress({ value, max, tone = 'teal' }: { value: number; max: number; tone?: 'teal' | 'amber' | 'blue' }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  const c = { teal: 'bg-brand-500', amber: 'bg-amber-500', blue: 'bg-blue-500' }[tone]
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cx('h-full rounded-full transition-all', c)} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ---------- Toasts ----------
export function Toaster() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const Icon = t.tone === 'ok' ? CheckCircle2 : t.tone === 'error' ? AlertCircle : Info
        return (
          <div key={t.id} className="animate-fade-up pointer-events-auto flex items-start gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl">
            <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', t.tone === 'ok' ? 'text-brand-300' : t.tone === 'error' ? 'text-red-300' : 'text-sky-300')} />
            <p className="flex-1">{t.text}</p>
            <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ---------- Table helpers ----------
export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <th className={cx('px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500', className)}>{children}</th>
)
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={cx('px-4 py-3 text-sm text-slate-700', className)}>{children}</td>

export function SearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  )
}
