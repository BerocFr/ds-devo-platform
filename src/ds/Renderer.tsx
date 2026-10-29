import { Check, ChevronDown, ArrowRight, Info, AlertCircle } from 'lucide-react';
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { ComponentDef, ComponentInstance, DesignToken } from '../domain/types';
import { tokensToCssVars } from '../domain/tokens';
import './ds.css';

export type RenderMode = 'thumb' | 'preview' | 'interactive';

interface RenderCtx {
  mode: RenderMode;
  onAction?: (instanceId: string) => void;
}

const list = (v: unknown) =>
  String(v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** Theme container: exposes the workspace tokens as --ds-* custom properties. */
export function DsScope({ tokens, children, className = '', style }: { tokens: DesignToken[]; children: ReactNode; className?: string; style?: CSSProperties }) {
  const vars = useMemo(() => tokensToCssVars(tokens), [tokens]);
  return (
    <div className={`ds-scope ${className}`} style={{ ...(vars as CSSProperties), ...style }}>
      {children}
    </div>
  );
}

const WIDE_KINDS = new Set(['siteHeader', 'siteFooter', 'hero', 'ctaBand']);

export function isWideScreen(instances: ComponentInstance[], components: ComponentDef[]) {
  return instances.some((i) => WIDE_KINDS.has(components.find((c) => c.id === i.componentId)?.kind ?? ''));
}

export function ScreenRender({
  instances,
  components,
  mode,
  onAction,
  highlightId,
}: {
  instances: ComponentInstance[];
  components: ComponentDef[];
  mode: RenderMode;
  onAction?: (instanceId: string) => void;
  highlightId?: string | null;
}) {
  const wide = isWideScreen(instances, components);
  return (
    <div className={`ds-screen ${wide ? 'wide' : ''}`}>
      {instances.map((inst) => {
        const def = components.find((c) => c.id === inst.componentId);
        if (!def) return null;
        return (
          <div
            key={inst.id}
            className={WIDE_KINDS.has(def.kind) ? 'ds-full' : undefined}
            style={highlightId === inst.id ? { outline: '2px dashed #2556e0', outlineOffset: 3, borderRadius: 4 } : undefined}
          >
            <InstanceRender def={def} inst={inst} ctx={{ mode, onAction }} />
          </div>
        );
      })}
    </div>
  );
}

export function InstanceRender({ def, inst, ctx }: { def: ComponentDef; inst: ComponentInstance; ctx: RenderCtx }) {
  const p = inst.props;
  const interactive = ctx.mode === 'interactive';
  const act = () => ctx.onAction?.(inst.id);
  const tabIndex = ctx.mode === 'thumb' ? -1 : undefined;
  const stateCls = inst.state && inst.state !== 'default' ? `is-${inst.state}` : '';
  const inputId = `f-${inst.id}`;

  switch (def.kind) {
    case 'button': {
      const icon = p.icon === 'arrow' ? <ArrowRight size={16} aria-hidden /> : p.icon === 'check' ? <Check size={16} aria-hidden /> : null;
      const loading = inst.state === 'loading';
      return (
        <button
          type="button"
          tabIndex={tabIndex}
          className={`ds-btn ${inst.variantId} ${p.fullWidth ? 'full' : ''} ${inst.size ?? ''} ${stateCls}`}
          disabled={inst.state === 'disabled'}
          aria-busy={loading || undefined}
          onClick={interactive ? act : undefined}
        >
          {loading ? <span className="ds-spinner" aria-hidden /> : null}
          {String(p.label ?? '')}
          {icon}
        </button>
      );
    }
    case 'textInput':
      return <input tabIndex={tabIndex} aria-label={String(p.placeholder || 'Text input')} className={`ds-input ${inst.variantId === 'filled' ? 'filled' : ''}`} type={String(p.type ?? 'text')} placeholder={String(p.placeholder ?? '')} aria-invalid={inst.state === 'error' || undefined} readOnly={!interactive} />;
    case 'formField': {
      const error = String(p.error ?? '');
      const showError = inst.variantId === 'inline-error' || inst.state === 'error';
      return (
        <div className="ds-field">
          <label className="ds-label" htmlFor={inputId}>
            {String(p.label ?? '')}
            {p.required ? '' : ' (optional)'}
          </label>
          {p.hint ? <span className="ds-hint" id={`${inputId}-h`}>{String(p.hint)}</span> : null}
          {showError && error ? (
            <span className="ds-error" id={`${inputId}-e`}>
              <AlertCircle size={16} aria-hidden /> {error}
            </span>
          ) : null}
          <input
            id={inputId}
            tabIndex={tabIndex}
            className="ds-input"
            type={String(p.type ?? 'text')}
            aria-invalid={showError || undefined}
            aria-describedby={[p.hint ? `${inputId}-h` : '', showError && error ? `${inputId}-e` : ''].filter(Boolean).join(' ') || undefined}
            readOnly={!interactive}
            autoComplete="off"
          />
        </div>
      );
    }
    case 'errorMessage':
      return (
        <p className={`ds-error ${inst.variantId === 'summary' ? 'summary' : ''}`} role={interactive ? 'alert' : undefined}>
          <AlertCircle size={16} aria-hidden /> {String(p.text ?? '')}
        </p>
      );
    case 'progress': {
      const cur = Number(p.current) || 1;
      const tot = Math.max(1, Number(p.total) || 1);
      return (
        <div className="ds-progress">
          <span>
            Step {cur} of {tot}
          </span>
          {inst.variantId === 'bar' ? (
            <div className="ds-progress-bar" role="progressbar" aria-valuemin={1} aria-valuemax={tot} aria-valuenow={cur} aria-label={`Step ${cur} of ${tot}`}>
              <span style={{ width: `${Math.min(100, (cur / tot) * 100)}%` }} />
            </div>
          ) : (
            <div className="ds-progress-steps" aria-hidden>
              {Array.from({ length: Math.min(tot, 8) }, (_, i) => (
                <span key={i} className={i < cur ? 'on' : ''} />
              ))}
            </div>
          )}
        </div>
      );
    }
    case 'codeInput': {
      const len = Math.min(8, Math.max(4, Number(p.length) || 6));
      return (
        <fieldset className="ds-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="ds-label" style={{ marginBottom: 6 }}>{String(p.label ?? '')}</legend>
          <CodeBoxes len={len} single={inst.variantId === 'single'} interactive={interactive} tabIndex={tabIndex} error={inst.state === 'error'} />
        </fieldset>
      );
    }
    case 'confirmation':
      return (
        <div className={`ds-confirm ${inst.variantId}`} role={interactive ? 'status' : undefined}>
          <span className="ds-confirm-icon" aria-hidden>
            {inst.variantId === 'info' ? <Info size={20} /> : <Check size={22} strokeWidth={3} />}
          </span>
          <span className="ds-confirm-title">{String(p.title ?? '')}</span>
          <span>{String(p.body ?? '')}</span>
        </div>
      );
    case 'heading':
      return inst.variantId === 'h2' ? <h3 className="ds-h2">{String(p.text ?? '')}</h3> : <h2 className="ds-h1">{String(p.text ?? '')}</h2>;
    case 'text':
      return <p className={`ds-text ${inst.variantId}`}>{String(p.text ?? '')}</p>;
    case 'checkbox':
      return (
        <label className="ds-check">
          <input type="checkbox" tabIndex={tabIndex} disabled={!interactive && ctx.mode === 'thumb'} defaultChecked={inst.state === 'checked'} />
          <span>{String(p.label ?? '')}</span>
        </label>
      );
    case 'link':
      return (
        <button type="button" className="ds-link" tabIndex={tabIndex} onClick={interactive ? act : undefined}>
          {String(p.label ?? '')}
        </button>
      );
    case 'alert':
      return (
        <div className={`ds-alert ${inst.variantId}`} role={interactive && inst.variantId === 'error' ? 'alert' : undefined}>
          {String(p.text ?? '')}
        </div>
      );
    case 'card': {
      const body = (
        <>
          <span className="ds-card-title">{String(p.title ?? '')}</span>
          <span>{String(p.body ?? '')}</span>
        </>
      );
      return inst.interaction && inst.interaction.kind !== 'none' ? (
        <button type="button" tabIndex={tabIndex} className={`ds-card ${inst.variantId}`} onClick={interactive ? act : undefined}>
          {body}
        </button>
      ) : (
        <div className={`ds-card ${inst.variantId}`}>{body}</div>
      );
    }
    case 'divider':
      return <hr className="ds-divider" />;
    case 'navBar':
      return <div className="ds-navbar">{String(p.title ?? '')}</div>;
    case 'siteHeader':
      return (
        <header className={`ds-header ${inst.variantId}`}>
          <span className="ds-header-brand">{String(p.brand ?? '')}</span>
          <nav aria-label="Main">
            {list(p.items).slice(0, 6).map((it) => (
              <span key={it}>{it}</span>
            ))}
          </nav>
          <button type="button" tabIndex={tabIndex} className="ds-btn primary sm" onClick={interactive ? act : undefined}>
            {String(p.cta ?? '')}
          </button>
        </header>
      );
    case 'siteFooter':
      return (
        <footer className="ds-footer">
          {list(p.groups).map((gname) => (
            <div key={gname}>
              <strong>{gname}</strong>
              <span>Links</span>
            </div>
          ))}
          <div>
            <strong>Accessibility</strong>
            <span>Statement</span>
          </div>
        </footer>
      );
    case 'hero':
      return (
        <section className={`ds-hero ${inst.variantId}`}>
          <div className="ds-field" style={{ gap: 12, alignItems: inst.variantId === 'centered' ? 'center' : 'flex-start' }}>
            <h2 className="ds-hero-title">{String(p.title ?? '')}</h2>
            <p>{String(p.body ?? '')}</p>
            <button type="button" tabIndex={tabIndex} className="ds-btn primary" onClick={interactive ? act : undefined}>
              {String(p.cta ?? '')}
            </button>
          </div>
          {inst.variantId === 'split' ? <div className="ds-hero-art" aria-hidden /> : null}
        </section>
      );
    case 'ctaBand':
      return (
        <section className={`ds-ctaband ${inst.variantId === 'subtle' ? 'subtle' : ''}`}>
          <span className="ds-ctaband-title">{String(p.title ?? '')}</span>
          <button type="button" tabIndex={tabIndex} className={`ds-btn ${inst.variantId === 'subtle' ? 'primary' : 'secondary'}`} onClick={interactive ? act : undefined}>
            {String(p.cta ?? '')}
          </button>
        </section>
      );
    case 'tabs':
      return <TabsRender items={list(p.items)} pill={inst.variantId === 'pill'} tabIndex={tabIndex} />;
    case 'accordion':
      return <AccordionRender items={list(p.items)} multi={inst.variantId === 'multi'} tabIndex={tabIndex} />;
    case 'tag':
      return <TagsRender items={list(p.items)} filter={inst.variantId === 'filter'} tabIndex={tabIndex} />;
    case 'breadcrumbs': {
      const items = list(p.items);
      return (
        <nav className="ds-crumbs" aria-label="Breadcrumb">
          <ol>
            {items.map((it, i) => (
              <li key={it} aria-current={i === items.length - 1 ? 'page' : undefined}>
                {it}
              </li>
            ))}
          </ol>
        </nav>
      );
    }
    case 'stat':
      return (
        <div className="ds-stat">
          <div className="ds-stat-value">{String(p.value ?? '')}</div>
          <div>{String(p.label ?? '')}</div>
        </div>
      );
    case 'testimonial':
      return (
        <figure className="ds-quote">
          <blockquote>{String(p.quote ?? '')}</blockquote>
          <figcaption>{String(p.author ?? '')}</figcaption>
        </figure>
      );
    case 'emptyState':
      return (
        <div className="ds-empty" role={interactive ? 'status' : undefined}>
          <strong>{String(p.title ?? '')}</strong>
          <button type="button" tabIndex={tabIndex} className="ds-btn secondary sm" onClick={interactive ? act : undefined}>
            {String(p.cta ?? '')}
          </button>
        </div>
      );
    case 'select':
      return (
        <div className="ds-field">
          <label className="ds-label" htmlFor={inputId}>
            {String(p.label ?? '')}
          </label>
          <select id={inputId} className="ds-select" tabIndex={tabIndex} disabled={ctx.mode === 'thumb'}>
            {list(p.options).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
      );
    case 'textarea':
      return (
        <div className="ds-field">
          <label className="ds-label" htmlFor={inputId}>
            {String(p.label ?? '')}
          </label>
          {p.hint ? <span className="ds-hint">{String(p.hint)}</span> : null}
          <textarea id={inputId} className="ds-textarea" tabIndex={tabIndex} readOnly={!interactive} />
        </div>
      );
    default:
      return null;
  }
}

function CodeBoxes({ len, single, interactive, tabIndex, error }: { len: number; single: boolean; interactive: boolean; tabIndex?: number; error: boolean }) {
  const [vals, setVals] = useState<string[]>(() => Array(len).fill(''));
  if (single) {
    return (
      <div className="ds-code single">
        <input aria-label="Verification code" inputMode="numeric" tabIndex={tabIndex} readOnly={!interactive} maxLength={len} aria-invalid={error || undefined} />
      </div>
    );
  }
  const onPaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, len);
    if (!digits) return;
    e.preventDefault();
    setVals(Array.from({ length: len }, (_, i) => digits[i] ?? ''));
  };
  return (
    <div className="ds-code" onPaste={interactive ? onPaste : undefined}>
      {vals.map((v, i) => (
        <input
          key={i}
          aria-label={`Digit ${i + 1} of ${len}`}
          inputMode="numeric"
          maxLength={1}
          tabIndex={tabIndex}
          readOnly={!interactive}
          value={v}
          aria-invalid={error || undefined}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(-1);
            setVals((prev) => prev.map((x, j) => (j === i ? d : x)));
            if (d) (e.target.nextElementSibling as HTMLInputElement | null)?.focus();
          }}
        />
      ))}
    </div>
  );
}

function TabsRender({ items, pill, tabIndex }: { items: string[]; pill: boolean; tabIndex?: number }) {
  const [sel, setSel] = useState(0);
  return (
    <div className={`ds-tabs ${pill ? 'pill' : ''}`} role="tablist">
      {items.map((it, i) => (
        <button
          key={it}
          type="button"
          role="tab"
          aria-selected={i === sel}
          tabIndex={tabIndex ?? (i === sel ? 0 : -1)}
          onClick={() => setSel(i)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              const n = (sel + (e.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length;
              setSel(n);
              const sib = (e.currentTarget.parentElement?.children[n] as HTMLElement | undefined);
              sib?.focus();
            }
          }}
        >
          {it}
        </button>
      ))}
    </div>
  );
}

function AccordionRender({ items, multi, tabIndex }: { items: string[]; multi: boolean; tabIndex?: number }) {
  const [open, setOpen] = useState<number[]>([]);
  return (
    <div className="ds-accordion">
      {items.map((q, i) => {
        const isOpen = open.includes(i);
        return (
          <div key={q}>
            <button type="button" aria-expanded={isOpen} tabIndex={tabIndex} onClick={() => setOpen(isOpen ? open.filter((x) => x !== i) : multi ? [...open, i] : [i])}>
              {q}
              <ChevronDown size={18} aria-hidden style={{ transform: isOpen ? 'rotate(180deg)' : undefined }} />
            </button>
            {isOpen ? <p>The answer is written here in plain words, with a link to the detail if needed.</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function TagsRender({ items, filter, tabIndex }: { items: string[]; filter: boolean; tabIndex?: number }) {
  const [on, setOn] = useState<string[]>([]);
  return (
    <div className="ds-tags">
      {items.map((t) =>
        filter ? (
          <button key={t} type="button" className="ds-tag" tabIndex={tabIndex} aria-pressed={on.includes(t)} onClick={() => setOn(on.includes(t) ? on.filter((x) => x !== t) : [...on, t])}>
            {t}
          </button>
        ) : (
          <span key={t} className="ds-tag">
            {t}
          </span>
        ),
      )}
    </div>
  );
}
