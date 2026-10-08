import { Languages } from 'lucide-react'
import { useLang, type Lang } from '../i18n/lang'
import { cx } from '../lib/utils'

/** Selector de idioma ES / EN. */
export function LangSwitch({ dark }: { dark?: boolean }) {
  const { lang, setLang } = useLang()
  return (
    <div data-no-translate className={cx('inline-flex items-center gap-1 rounded-lg p-0.5 text-xs font-semibold', dark ? 'bg-white/10 ring-1 ring-white/20' : 'bg-slate-100')} role="radiogroup" aria-label="Idioma / Language">
      <Languages className={cx('mx-1 h-3.5 w-3.5', dark ? 'text-white/70' : 'text-slate-400')} />
      {(['es', 'en'] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={lang === l}
          onClick={() => setLang(l)}
          className={cx('rounded-md px-2 py-1 uppercase transition', lang === l ? (dark ? 'bg-white text-brand-800' : 'bg-white text-slate-900 shadow-sm') : dark ? 'text-white/70 hover:text-white' : 'text-slate-500 hover:text-slate-800')}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
