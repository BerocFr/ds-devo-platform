import { Archive, Check, Copy, Pencil, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { href, navigate } from '../../app/router';
import { resolveToken } from '../../domain/tokens';
import type { ComponentCategory, ComponentDef, ComponentInstance, ComponentKind, ComponentStatus } from '../../domain/types';
import { DsScope, InstanceRender } from '../../ds/Renderer';
import { usePlatform } from '../../store/store';
import { Dialog, SelectField, Tabs, TextField } from '../../ui/kit';
import { ComponentGlyph } from './glyphs';
import './components.css';

const CATS: ComponentCategory[] = ['Actions', 'Forms', 'Feedback', 'Navigation', 'Content', 'Layout'];

export function ComponentsPage({ selectedId }: { selectedId?: string }) {
  const components = usePlatform((s) => s.data.components);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<ComponentCategory | 'All'>('All');
  const [status, setStatus] = useState<ComponentStatus | 'all'>('all');
  const [source, setSource] = useState<'all' | 'core' | 'bench-01'>('all');
  const [creating, setCreating] = useState(false);
  const filtered = useMemo(
    () =>
      components.filter(
        (c) =>
          (cat === 'All' || c.category === cat) &&
          (status === 'all' || c.status === status) &&
          (source === 'all' || (c.provenance?.source ?? 'core') === source) &&
          (!q || `${c.name} ${c.description} ${c.category} ${c.tokens.join(' ')}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [components, q, cat, status, source],
  );
  const selected = components.find((c) => c.id === selectedId) ?? filtered[0];

  return (
    <>
      <header className="page-head">
        <h1>Components</h1>
        <span className="muted">
          {components.length} in the library, {components.filter((c) => c.provenance?.source === 'bench-01').length} from the benchmark
        </span>
        <span className="grow" />
        <button type="button" className="btn primary" onClick={() => setCreating(true)}>
          <Plus size={15} /> New component
        </button>
      </header>
      <div className="page-body flush">
        <div className="lib">
          <aside className="lib-list" aria-label="Component list">
            <div className="lib-filters">
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 9, top: 9, color: 'var(--c-ink-3)' }} aria-hidden />
                <input className="input" style={{ paddingLeft: 28 }} placeholder="Search name, purpose or token" aria-label="Search components" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="seg" role="group" aria-label="Category">
                {(['All', ...CATS] as const).map((c) => (
                  <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>
                    {c}
                  </button>
                ))}
              </div>
              <div className="hstack">
                <select className="select" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                  <option value="all">Any status</option>
                  <option value="stable">Stable</option>
                  <option value="beta">Beta</option>
                  <option value="deprecated">Deprecated</option>
                </select>
                <select className="select" aria-label="Source" value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
                  <option value="all">Any source</option>
                  <option value="core">Core</option>
                  <option value="bench-01">Benchmark</option>
                </select>
              </div>
              <span className="muted" style={{ fontSize: 12 }} aria-live="polite">
                {filtered.length} component{filtered.length === 1 ? '' : 's'}
              </span>
            </div>
            <ul className="list" style={{ overflow: 'auto' }}>
              {filtered.map((c) => (
                <li key={c.id}>
                  <a className="row-btn" href={href({ name: 'components', id: c.id })} aria-current={selected?.id === c.id ? 'true' : undefined} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <span className="lib-glyph" aria-hidden>
                      <ComponentGlyph kind={c.kind} size={15} />
                    </span>
                    <span className="grow">
                      <strong style={{ display: 'block', fontSize: 13 }}>{c.name}</strong>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {c.category}, {c.variants.length} variant{c.variants.length > 1 ? 's' : ''}
                      </span>
                    </span>
                    {c.status !== 'stable' ? <span className={`badge ${c.status === 'deprecated' ? 'danger' : 'info'}`}>{c.status}</span> : null}
                  </a>
                </li>
              ))}
            </ul>
            {filtered.length === 0 ? (
              <div className="empty" style={{ margin: 12 }}>
                <span>No component matches these filters.</span>
                <button type="button" className="btn sm" onClick={() => { setQ(''); setCat('All'); setStatus('all'); setSource('all'); }}>
                  Clear filters
                </button>
              </div>
            ) : null}
          </aside>
          {selected ? <ComponentDetail key={selected.id} def={selected} /> : <div className="page-body"><div className="empty">Select a component.</div></div>}
        </div>
      </div>
      {creating ? <ComponentDialog onClose={() => setCreating(false)} /> : null}
    </>
  );
}

function ComponentDetail({ def }: { def: ComponentDef }) {
  const st = usePlatform();
  const { tokens, journeys } = usePlatform((s) => s.data);
  const [variant, setVariant] = useState(def.variants[0]?.id ?? '');
  const [size, setSize] = useState(def.sizes[Math.min(1, def.sizes.length - 1)] ?? '');
  const [state, setState] = useState('default');
  const [props, setProps] = useState<ComponentInstance['props']>(() => Object.fromEntries(def.props.map((p) => [p.name, p.defaultValue])));
  const [tab, setTab] = useState<'usage' | 'props' | 'tokens' | 'used'>('usage');
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  useEffect(() => {
    if (!def.variants.some((v) => v.id === variant)) setVariant(def.variants[0]?.id ?? '');
  }, [def, variant]);

  const inst: ComponentInstance = { id: `pv-${def.id}`, componentId: def.id, variantId: variant, size, state, props, ...(def.interactions.some((k) => k !== 'none') ? { interaction: { kind: 'navigate' } } : {}) };
  const usage = journeys.flatMap((j) => j.nodes.filter((n) => n.components.some((c) => c.componentId === def.id)).map((n) => ({ j, n, count: n.components.filter((c) => c.componentId === def.id).length })));
  const wide = ['siteHeader', 'siteFooter', 'hero', 'ctaBand'].includes(def.kind);

  return (
    <section className="lib-detail" aria-labelledby="cd-title">
      <div className="lib-detail-head">
        <span className="lib-glyph big" aria-hidden>
          <ComponentGlyph kind={def.kind} size={18} />
        </span>
        <div className="grow">
          <h2 id="cd-title">{def.name}</h2>
          <p className="muted">{def.description}</p>
        </div>
        <span className={`badge ${def.status === 'stable' ? 'success' : def.status === 'beta' ? 'info' : 'danger'}`}>{def.status}</span>
        <span className="badge">{def.category}</span>
        {def.provenance?.source === 'bench-01' ? <span className="badge accent">From benchmark</span> : <span className="badge">Core</span>}
      </div>
      <div className="hstack" style={{ padding: '0 24px 12px' }}>
        <button type="button" className="btn sm" onClick={() => setEditing(true)}>
          <Pencil size={13} /> Edit component
        </button>
        <button type="button" className="btn sm" onClick={() => { const id = st.duplicateComponent(def.id); if (id) navigate({ name: 'components', id }); }}>
          <Copy size={13} /> Duplicate
        </button>
        {def.status === 'deprecated' ? (
          <button type="button" className="btn sm" onClick={() => { st.updateComponent(def.id, { status: 'stable' }); st.toast(`${def.name} restored`); }}>
            <RotateCcw size={13} /> Restore
          </button>
        ) : (
          <button type="button" className="btn sm" onClick={() => { st.updateComponent(def.id, { status: 'deprecated' }); st.toast(`${def.name} marked deprecated; journeys using it now show a warning`); }}>
            <Archive size={13} /> Deprecate
          </button>
        )}
        <button type="button" className="btn sm danger" onClick={() => setConfirmDel(true)}>
          <Trash2 size={13} /> Delete
        </button>
      </div>

      <div className="stage-wrap">
        <div className="stage-controls">
          <div className="field">
            <span className="field-label">Variant</span>
            <div className="seg" role="group" aria-label="Variant">
              {def.variants.map((v) => (
                <button key={v.id} type="button" aria-pressed={variant === v.id} title={v.description} onClick={() => setVariant(v.id)}>
                  {v.name}
                </button>
              ))}
            </div>
          </div>
          {def.sizes.length > 1 ? (
            <div className="field">
              <span className="field-label">Size</span>
              <div className="seg" role="group" aria-label="Size">
                {def.sizes.map((s) => (
                  <button key={s} type="button" aria-pressed={size === s} onClick={() => setSize(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {def.states.length > 1 ? (
            <div className="field">
              <span className="field-label">State</span>
              <div className="seg" role="group" aria-label="State">
                {def.states.map((s) => (
                  <button key={s} type="button" aria-pressed={state === s} onClick={() => setState(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {def.props
            .filter((p) => p.kind !== 'boolean')
            .slice(0, 3)
            .map((p) =>
              p.kind === 'select' ? (
                <SelectField key={p.name} label={p.label} value={String(props[p.name])} onChange={(v) => setProps({ ...props, [p.name]: v })} options={(p.options ?? []).map((o) => ({ value: o, label: o }))} />
              ) : (
                <TextField key={p.name} label={p.label} value={String(props[p.name] ?? '')} onChange={(v) => setProps({ ...props, [p.name]: p.kind === 'number' ? Number(v) : v })} type={p.kind === 'number' ? 'number' : 'text'} />
              ),
            )}
        </div>
        <DsScope tokens={tokens} className={`stage ${wide ? 'wide' : ''}`}>
          <div className="stage-inner">
            <InstanceRender def={def} inst={inst} ctx={{ mode: 'preview' }} />
          </div>
        </DsScope>
      </div>

      <div style={{ padding: '0 24px' }}>
        <Tabs
          label="Component documentation"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'usage', label: 'Usage' },
            { id: 'props', label: 'Properties' },
            { id: 'tokens', label: `Tokens ${def.tokens.length}` },
            { id: 'used', label: `Used in ${usage.length}` },
          ]}
        />
      </div>
      <div className="lib-tabpanel" role="tabpanel">
        {tab === 'usage' && (
          <div className="usage-grid">
            <div>
              <div className="section-title">Do</div>
              <ul className="dodont do">
                {def.guidelines.do.map((g) => (
                  <li key={g}>
                    <Check size={14} aria-hidden /> {g}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="section-title">Don't</div>
              <ul className="dodont dont">
                {def.guidelines.dont.map((g) => (
                  <li key={g}>
                    <X size={14} aria-hidden /> {g}
                  </li>
                ))}
              </ul>
            </div>
            {def.a11y?.length ? (
              <div>
                <div className="section-title">Accessibility</div>
                <ul className="dodont">
                  {def.a11y.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div>
              <div className="section-title">Provenance</div>
              {def.provenance?.source === 'bench-01' ? (
                <p style={{ fontSize: 13 }}>
                  Added from benchmark 01 (DS-Devo {def.provenance.ref}). {def.provenance.note}
                </p>
              ) : (
                <p style={{ fontSize: 13 }}>Core component of the workspace design system.</p>
              )}
            </div>
          </div>
        )}
        {tab === 'props' && (
          <div className="stack">
            <table className="table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Default</th>
                </tr>
              </thead>
              <tbody>
                {def.props.map((p) => (
                  <tr key={p.name}>
                    <td>
                      {p.label} <span className="code muted">{p.name}</span>
                      {p.advanced ? <span className="badge" style={{ marginLeft: 6 }}>advanced</span> : null}
                    </td>
                    <td>{p.kind === 'select' ? (p.options ?? []).join(' | ') : p.kind}</td>
                    <td className="code">{String(p.defaultValue) || '(empty)'}</td>
                  </tr>
                ))}
                {def.props.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      No configurable property.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <dl className="kv">
              <dt>Variants</dt>
              <dd>{def.variants.map((v) => v.name).join(', ')}</dd>
              <dt>Sizes</dt>
              <dd>{def.sizes.join(', ')}</dd>
              <dt>States</dt>
              <dd>{def.states.join(', ')}</dd>
              <dt>Journey interactions</dt>
              <dd>{def.interactions.filter((k) => k !== 'none').join(', ') || 'None (display only)'}</dd>
            </dl>
          </div>
        )}
        {tab === 'tokens' && (
          <table className="table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Resolved value</th>
                <th>Provenance</th>
              </tr>
            </thead>
            <tbody>
              {def.tokens.map((name) => {
                const t = tokens.find((x) => x.name === name);
                const v = resolveToken(name, tokens);
                return (
                  <tr key={name}>
                    <td>
                      <a className="code" href={`#/design-system/tokens?focus=${name}`}>
                        {name}
                      </a>
                    </td>
                    <td>
                      <span className="hstack">
                        {t?.type === 'color' && v ? <span className="swatch" style={{ background: v }} aria-hidden /> : null}
                        <span className="code">{v ?? 'missing'}</span>
                      </span>
                    </td>
                    <td>{t ? <ProvBadge p={t.provenance} /> : <span className="badge danger">Missing from the design system</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {tab === 'used' && (
          <div>
            {usage.length === 0 ? <div className="empty">Not used in any journey yet. Drag it onto a screen in the Journey Builder.</div> : null}
            <ul className="list panel">
              {usage.map(({ j, n, count }) => (
                <li key={`${j.id}-${n.id}`}>
                  <a className="row-btn" style={{ color: 'inherit', textDecoration: 'none' }} href={href({ name: 'journey', id: j.id, node: n.id })}>
                    <span className="grow">
                      <strong>{n.title}</strong> <span className="muted">in {j.name}</span>
                    </span>
                    <span className="badge">{count} use{count > 1 ? 's' : ''}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {editing ? <ComponentDialog def={def} onClose={() => setEditing(false)} /> : null}
      {confirmDel ? (
        <Dialog
          title={`Delete ${def.name}?`}
          description="Deleting removes it from the library. Components used in journeys cannot be deleted; deprecate them instead."
          onClose={() => setConfirmDel(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setConfirmDel(false)} data-autofocus>
                Keep component
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  const r = st.deleteComponent(def.id);
                  setConfirmDel(false);
                  if (r.ok) {
                    st.toast(`${def.name} deleted`);
                    navigate({ name: 'components' });
                  } else st.toast(r.reason!, 'error');
                }}
              >
                Delete component
              </button>
            </>
          }
        >
          <span />
        </Dialog>
      ) : null}
    </section>
  );
}

export function ProvBadge({ p }: { p: string }) {
  const map: Record<string, [string, string]> = {
    brand: ['success', 'Brand'],
    derived: ['info', 'Derived'],
    functional: ['', 'Functional'],
    'todo-brand': ['warning', 'TODO-BRAND'],
  };
  const [cls, label] = map[p] ?? ['', p];
  return <span className={`badge ${cls}`}>{label}</span>;
}

const KINDS: { kind: ComponentKind; label: string }[] = [
  { kind: 'button', label: 'Button' },
  { kind: 'formField', label: 'Form field' },
  { kind: 'textInput', label: 'Text input' },
  { kind: 'select', label: 'Select' },
  { kind: 'textarea', label: 'Text area' },
  { kind: 'checkbox', label: 'Checkbox' },
  { kind: 'alert', label: 'Notification' },
  { kind: 'errorMessage', label: 'Error message' },
  { kind: 'confirmation', label: 'Confirmation' },
  { kind: 'card', label: 'Card' },
  { kind: 'heading', label: 'Heading' },
  { kind: 'text', label: 'Text' },
  { kind: 'link', label: 'Link' },
  { kind: 'progress', label: 'Progress' },
  { kind: 'tabs', label: 'Tabs' },
  { kind: 'accordion', label: 'Accordion' },
  { kind: 'tag', label: 'Tag' },
  { kind: 'emptyState', label: 'Empty state' },
];

function ComponentDialog({ def, onClose }: { def?: ComponentDef; onClose: () => void }) {
  const st = usePlatform();
  const { components, tokens } = usePlatform((s) => s.data);
  const [name, setName] = useState(def?.name ?? '');
  const [kind, setKind] = useState<ComponentKind>(def?.kind ?? 'button');
  const [category, setCategory] = useState<ComponentCategory>(def?.category ?? 'Actions');
  const [description, setDescription] = useState(def?.description ?? '');
  const [status, setStatus] = useState<ComponentStatus>(def?.status ?? 'beta');
  const [doText, setDo] = useState((def?.guidelines.do ?? []).join('\n'));
  const [dontText, setDont] = useState((def?.guidelines.dont ?? []).join('\n'));
  const base = components.find((c) => c.kind === kind && c.provenance?.source !== 'bench-01') ?? components.find((c) => c.kind === kind);
  const [tokenSel, setTokenSel] = useState<string[]>(def?.tokens ?? base?.tokens ?? []);
  const [touched, setTouched] = useState(false);
  const dup = components.some((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase() && c.id !== def?.id);
  const nameError = !name.trim() ? 'Enter a component name' : dup ? 'A component with this name already exists' : undefined;

  const save = () => {
    setTouched(true);
    if (nameError) return;
    const lines = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean);
    if (def) {
      st.updateComponent(def.id, { name: name.trim(), category, description, status, tokens: tokenSel, guidelines: { do: lines(doText), dont: lines(dontText) } });
      st.toast(`${name.trim()} updated`);
      onClose();
    } else {
      const id = st.addComponent({
        kind,
        name: name.trim(),
        category,
        status,
        description: description || `Built on the ${KINDS.find((k) => k.kind === kind)?.label} renderer.`,
        variants: base?.variants ?? [{ id: 'default', name: 'Default' }],
        sizes: base?.sizes ?? ['md'],
        states: base?.states ?? ['default'],
        props: base?.props ?? [],
        tokens: tokenSel,
        guidelines: { do: lines(doText), dont: lines(dontText) },
        interactions: base?.interactions ?? ['none'],
        provenance: { source: 'core' },
      });
      st.toast(`${name.trim()} added to the library`);
      onClose();
      navigate({ name: 'components', id });
    }
  };

  return (
    <Dialog
      wide
      title={def ? `Edit ${def.name}` : 'New component'}
      description={def ? 'Changes apply to every screen that uses this component.' : 'A new component reuses an existing renderer and declares the tokens it consumes.'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" onClick={save}>
            {def ? 'Save component' : 'Create component'}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="stack">
          <TextField label="Name" value={name} onChange={setName} error={touched ? nameError : undefined} autoFocus />
          {!def ? (
            <SelectField
              label="Based on"
              value={kind}
              onChange={(k) => {
                setKind(k);
                const b = components.find((c) => c.kind === k);
                if (b) {
                  setTokenSel(b.tokens);
                  setCategory(b.category);
                }
              }}
              options={KINDS.map((k) => ({ value: k.kind, label: k.label }))}
              hint="Variants, properties and states are copied from it and can evolve later."
            />
          ) : null}
          <SelectField label="Category" value={category} onChange={setCategory} options={CATS.map((c) => ({ value: c, label: c }))} />
          <SelectField label="Status" value={status} onChange={setStatus} options={[{ value: 'stable', label: 'Stable' }, { value: 'beta', label: 'Beta' }, { value: 'deprecated', label: 'Deprecated' }]} />
          <TextField label="Purpose" value={description} onChange={setDescription} multiline />
          <TextField label="Do (one per line)" value={doText} onChange={setDo} multiline />
          <TextField label="Don't (one per line)" value={dontText} onChange={setDont} multiline />
        </div>
        <div className="field">
          <span className="field-label">Design tokens consumed</span>
          <span className="hint">Validation flags journeys whose components depend on missing or placeholder tokens.</span>
          <div style={{ maxHeight: 420, overflow: 'auto', border: '1px solid var(--c-line)', borderRadius: 6, padding: 8 }}>
            {tokens
              .filter((t) => t.tier === 'semantic' || !['Color'].includes(t.category))
              .map((t) => (
                <label key={t.id} className="check" style={{ padding: '3px 0' }}>
                  <input type="checkbox" checked={tokenSel.includes(t.name)} onChange={() => setTokenSel(tokenSel.includes(t.name) ? tokenSel.filter((x) => x !== t.name) : [...tokenSel, t.name])} />
                  <span className="code">{t.name}</span>
                </label>
              ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
