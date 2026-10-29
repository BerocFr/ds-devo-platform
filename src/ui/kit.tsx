import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { usePlatform } from '../store/store';

/** Modal dialog: focus trap, Escape closes, focus returns to the opener. */
export function Dialog({
  title,
  description,
  onClose,
  children,
  footer,
  wide,
  labelledBy,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>('[data-autofocus], input, select, textarea, button:not([data-close])');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab' && el) {
        const items = [...el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((x) => x.offsetParent !== null);
        if (!items.length) return;
        const a = items[0];
        const b = items[items.length - 1];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      opener?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`dialog ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy ?? id}>
        <div className="dialog-head">
          <div className="grow">
            <h2 id={id}>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="btn ghost icon sm" data-close aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        {footer ? <div className="dialog-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = usePlatform((s) => s.toasts);
  const dismiss = usePlatform((s) => s.dismissToast);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          <span>{t.text}</span>
          {t.action ? (
            <button
              type="button"
              onClick={() => {
                t.action!.run();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          className="tab"
          aria-selected={t.id === value}
          tabIndex={t.id === value ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            const n = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
            onChange(tabs[n].id);
            (e.currentTarget.parentElement?.children[n] as HTMLElement | undefined)?.focus();
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  multiline,
  placeholder,
  error,
  mono,
  type = 'text',
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  multiline?: boolean;
  placeholder?: string;
  error?: string;
  mono?: boolean;
  type?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  const describedBy = [hint ? `${id}-h` : '', error ? `${id}-e` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea id={id} className={`textarea ${mono ? 'code' : ''}`} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-describedby={describedBy} aria-invalid={!!error || undefined} data-autofocus={autoFocus || undefined} />
      ) : (
        <input id={id} type={type} className={`input ${mono ? 'code' : ''}`} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-describedby={describedBy} aria-invalid={!!error || undefined} data-autofocus={autoFocus || undefined} />
      )}
      {hint ? (
        <span className="hint" id={`${id}-h`}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="error" id={`${id}-e`}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function SelectField<T extends string>({ label, value, onChange, options, hint }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; hint?: string }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function relativeTime(iso: string | null, now = Date.now()): string {
  if (!iso) return 'not yet';
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s} s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}
