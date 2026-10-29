import { ArrowRight, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { navigate } from '../../app/router';
import { contrastGrade, contrastRatio, dependents, isValidTokenValue, referenceTarget, resolveToken } from '../../domain/tokens';
import type { ComponentInstance, DesignToken, TokenProvenance, TokenType } from '../../domain/types';
import { DsScope, ScreenRender } from '../../ds/Renderer';
import { usePlatform } from '../../store/store';
import { Dialog, SelectField, Tabs, TextField } from '../../ui/kit';
import { ProvBadge } from '../components/ComponentsPage';
import './ds-page.css';

type Tab = 'foundations' | 'colors' | 'typography' | 'spacing' | 'tokens' | 'dependencies';

const SAMPLE: ComponentInstance[] = [
  { id: 's1', componentId: 'cmp-progress', variantId: 'steps', props: { current: 2, total: 3 } },
  { id: 's2', componentId: 'cmp-heading', variantId: 'h1', props: { text: 'Your details' } },
  { id: 's3', componentId: 'cmp-text', variantId: 'muted', props: { text: 'It takes less than a minute.' } },
  { id: 's4', componentId: 'cmp-form-field', variantId: 'inline-error', props: { label: 'Work email', hint: '', type: 'email', required: true, error: 'Enter an email address in the format name@example.com' } },
  { id: 's5', componentId: 'cmp-button', variantId: 'primary', props: { label: 'Create account', fullWidth: true, icon: 'none' } },
  { id: 's6', componentId: 'cmp-button', variantId: 'secondary', props: { label: 'Back', fullWidth: true, icon: 'none' } },
  { id: 's7', componentId: 'cmp-card', variantId: 'accent', props: { title: 'Why we ask', body: 'Your email is only used to sign in.' } },
];

export function DesignSystem({ tab }: { tab: string }) {
  const t = (['foundations', 'colors', 'typography', 'spacing', 'tokens', 'dependencies'].includes(tab) ? tab : 'foundations') as Tab;
  const { tokens, components } = usePlatform((s) => s.data);
  const todo = tokens.filter((x) => x.provenance === 'todo-brand').length;
  return (
    <>
      <header className="page-head">
        <h1>Design System</h1>
        <span className="muted">
          {tokens.length} tokens, {todo} awaiting brand values
        </span>
      </header>
      <div className="ds-page">
        <div className="ds-main">
          <div style={{ padding: '0 24px', background: 'var(--c-panel)', borderBottom: '1px solid var(--c-line)' }}>
            <Tabs<Tab>
              label="Design system sections"
              value={t}
              onChange={(v) => navigate({ name: 'design-system', tab: v })}
              tabs={[
                { id: 'foundations', label: 'Foundations' },
                { id: 'colors', label: 'Colors' },
                { id: 'typography', label: 'Typography' },
                { id: 'spacing', label: 'Spacing, shape, motion' },
                { id: 'tokens', label: 'All tokens' },
                { id: 'dependencies', label: 'Dependencies' },
              ]}
            />
          </div>
          <div className="ds-content" role="tabpanel">
            {t === 'foundations' && <Foundations />}
            {t === 'colors' && <Colors />}
            {t === 'typography' && <Typography />}
            {t === 'spacing' && <SpacingShape />}
            {t === 'tokens' && <TokenTable />}
            {t === 'dependencies' && <Dependencies />}
          </div>
        </div>
        <aside className="ds-preview" aria-label="Live preview">
          <div className="side-h" style={{ padding: '12px 14px 0' }}>
            Live preview
          </div>
          <p className="muted" style={{ fontSize: 12, padding: '0 14px 10px' }}>
            Real library components rendered with the current tokens. Edit a value and watch it change.
          </p>
          <DsScope tokens={tokens} className="ds-preview-frame">
            <ScreenRender instances={SAMPLE} components={components} mode="preview" />
          </DsScope>
        </aside>
      </div>
    </>
  );
}

function Foundations() {
  const st = usePlatform();
  const { workspace, principles, tokens, components } = usePlatform((s) => s.data);
  const [adding, setAdding] = useState(false);
  const counts = (['brand', 'derived', 'functional', 'todo-brand'] as TokenProvenance[]).map((p) => [p, tokens.filter((t) => t.provenance === p).length] as const);
  return (
    <div className="stack" style={{ gap: 20, maxWidth: 860 }}>
      <section className="panel">
        <div className="panel-head">
          <h2>Brand identity</h2>
        </div>
        <div className="panel-body stack">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <TextField label="Company" value={workspace.name} onChange={(v) => st.updateWorkspace({ name: v })} />
            <TextField label="Industry" value={workspace.industry} onChange={(v) => st.updateWorkspace({ industry: v })} />
          </div>
          <TextField label="Brand source of truth" value={workspace.brandSource} onChange={(v) => st.updateWorkspace({ brandSource: v })} hint="Every brand token cites this source. Values the source does not define are marked TODO-BRAND." />
          <div className="brand-strip" aria-label="Brand colors">
            {tokens
              .filter((t) => t.tier === 'primitive' && t.type === 'color')
              .map((t) => (
                <span key={t.id} title={`${t.name} ${t.value}`} style={{ background: t.value }} />
              ))}
          </div>
          <p style={{ fontFamily: resolveToken('font.family.brand', tokens) ?? undefined, fontSize: 22, fontWeight: 700 }}>Montserrat carries the brand voice in every screen.</p>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>Single source of truth status</h2>
        </div>
        <div className="panel-body">
          <div className="hstack wrap" style={{ marginBottom: 10 }}>
            {counts.map(([p, n]) => (
              <span key={p} className="hstack" style={{ gap: 4 }}>
                <ProvBadge p={p} /> {n}
              </span>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 13 }}>
            {components.length} components consume these tokens. Brand values mirror the DS-Devo brand file; derived values are computed from them with a stated reason; TODO-BRAND values are visible placeholders flagged by journey validation until the brand defines them.
          </p>
          {tokens.some((t) => t.provenance === 'todo-brand') ? (
            <div className="hstack wrap" style={{ marginTop: 10 }}>
              {tokens
                .filter((t) => t.provenance === 'todo-brand')
                .map((t) => (
                  <span key={t.id} className="badge warning code">
                    {t.name}
                  </span>
                ))}
            </div>
          ) : null}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>Design principles and UX guidelines</h2>
          <span className="grow" />
          <button type="button" className="btn sm" onClick={() => setAdding(true)}>
            <Plus size={13} /> Add principle
          </button>
        </div>
        <ol className="principles">
          {principles.map((p) => (
            <li key={p.id}>
              <div className="grow stack" style={{ gap: 6 }}>
                <input className="input principle-title" aria-label="Principle title" value={p.title} onChange={(e) => st.updatePrinciple(p.id, { title: e.target.value })} />
                <textarea className="textarea" aria-label="Principle description" value={p.description} onChange={(e) => st.updatePrinciple(p.id, { description: e.target.value })} />
              </div>
              <button type="button" className="btn ghost icon sm danger" aria-label={`Delete principle ${p.title}`} onClick={() => st.deletePrinciple(p.id)}>
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ol>
      </section>
      {adding ? <PrincipleDialog onClose={() => setAdding(false)} /> : null}
    </div>
  );
}

function PrincipleDialog({ onClose }: { onClose: () => void }) {
  const st = usePlatform();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  return (
    <Dialog
      title="Add a principle"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={!title.trim()} onClick={() => { st.addPrinciple({ title: title.trim(), description }); st.toast('Principle added'); onClose(); }}>
            Add principle
          </button>
        </>
      }
    >
      <div className="stack">
        <TextField label="Principle" value={title} onChange={setTitle} placeholder="for example: One primary action per screen" autoFocus />
        <TextField label="What it means in practice" value={description} onChange={setDescription} multiline />
      </div>
    </Dialog>
  );
}

function ValueInput({ token }: { token: DesignToken }) {
  const st = usePlatform();
  const [v, setV] = useState(token.value);
  useEffect(() => setV(token.value), [token.value]);
  const valid = isValidTokenValue(token.type, v);
  const commit = () => {
    if (v === token.value) return;
    if (!valid) return;
    st.updateToken(token.id, { value: v.trim() });
    st.toast(`${token.name} set to ${v.trim()}`);
  };
  return (
    <span className="stack" style={{ gap: 2 }}>
      <input
        className="input code"
        style={{ height: 28 }}
        aria-label={`Value of ${token.name}`}
        aria-invalid={!valid || undefined}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setV(token.value);
        }}
      />
      {!valid ? <span className="error" style={{ color: 'var(--c-danger)', fontSize: 11 }}>Not a valid {token.type} value</span> : null}
    </span>
  );
}

function Colors() {
  const st = usePlatform();
  const tokens = usePlatform((s) => s.data.tokens);
  const prim = tokens.filter((t) => t.type === 'color' && t.tier === 'primitive');
  const sem = tokens.filter((t) => t.type === 'color' && t.tier === 'semantic');
  const pairs: [string, string, string, 'text' | 'large'][] = [
    ['Body text on surface', 'color.text.default', 'color.surface.default', 'text'],
    ['Secondary text on surface', 'color.text.muted', 'color.surface.default', 'text'],
    ['White text on primary action', 'color.surface.default', 'color.action.primary', 'text'],
    ['Accent on surface', 'color.action.accent', 'color.surface.default', 'large'],
    ['Error text on surface', 'color.feedback.error', 'color.surface.default', 'text'],
    ['Body text on accent surface', 'color.text.default', 'color.surface.accent', 'text'],
  ];
  return (
    <div className="stack" style={{ gap: 20 }}>
      <section className="panel">
        <div className="panel-head">
          <h2>Palette (primitive tokens)</h2>
        </div>
        <div className="panel-body swatch-grid">
          {prim.map((t) => (
            <div key={t.id} className="swatch-card">
              <label className="swatch-big" style={{ background: t.value }}>
                <span className="sr-only">Pick color for {t.name}</span>
                <input type="color" value={/^#[0-9a-f]{6}$/i.test(t.value) ? t.value : '#000000'} onChange={(e) => st.updateToken(t.id, { value: e.target.value })} />
              </label>
              <div className="code" style={{ fontWeight: 600 }}>{t.name}</div>
              <ValueInput token={t} />
              <ProvBadge p={t.provenance} />
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>Semantic colors</h2>
          <span className="muted" style={{ fontSize: 12 }}>Components use these, never primitives directly.</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Semantic token</th>
              <th>Points to</th>
              <th>Resolved</th>
              <th>Provenance</th>
            </tr>
          </thead>
          <tbody>
            {sem.map((t) => {
              const v = resolveToken(t.name, tokens);
              return (
                <tr key={t.id}>
                  <td className="code">{t.name}</td>
                  <td>
                    <select className="select code" style={{ height: 28 }} aria-label={`Reference of ${t.name}`} value={referenceTarget(t) ?? ''} onChange={(e) => st.updateToken(t.id, { value: `{${e.target.value}}` })}>
                      {prim.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className="hstack">
                      <span className="swatch" style={{ background: v ?? 'transparent' }} aria-hidden />
                      <span className="code">{v}</span>
                    </span>
                  </td>
                  <td>
                    <ProvBadge p={t.provenance} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>Contrast check (WCAG 2.2)</h2>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Pair</th>
              <th>Sample</th>
              <th>Ratio</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map(([label, fg, bg, use]) => {
              const f = resolveToken(fg, tokens) ?? '#000';
              const b = resolveToken(bg, tokens) ?? '#fff';
              const r = contrastRatio(f, b);
              const grade = r ? contrastGrade(r) : null;
              const ok = r != null && (use === 'large' ? r >= 3 : r >= 4.5);
              return (
                <tr key={label}>
                  <td>
                    {label}
                    <br />
                    <span className="code muted">
                      {fg} on {bg}
                    </span>
                  </td>
                  <td>
                    <span className="contrast-sample" style={{ color: f, background: b }}>
                      Aa {use === 'large' ? 'large' : 'text'}
                    </span>
                  </td>
                  <td className="code">{r ? `${r.toFixed(2)}:1` : 'n/a'}</td>
                  <td>
                    <span className={`badge ${ok ? 'success' : 'danger'}`}>{grade === 'Fail' || !ok ? `Fails ${use === 'large' ? 'AA large' : 'AA'}` : grade}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Typography() {
  const tokens = usePlatform((s) => s.data.tokens);
  const family = resolveToken('font.family.brand', tokens) ?? 'sans-serif';
  const sizes = tokens.filter((t) => t.type === 'fontSize');
  const weights = tokens.filter((t) => t.type === 'fontWeight');
  return (
    <div className="stack" style={{ gap: 20 }}>
      <section className="panel">
        <div className="panel-head">
          <h2>Type scale</h2>
          <span className="muted code">{family}</span>
        </div>
        <div className="panel-body stack">
          {[...sizes].reverse().map((t) => (
            <div key={t.id} className="type-row">
              <div className="type-meta">
                <span className="code" style={{ fontWeight: 600 }}>{t.name}</span>
                <ValueInput token={t} />
                <span className="muted" style={{ fontSize: 12 }}>{t.description}</span>
              </div>
              <span style={{ fontFamily: family, fontSize: t.value, fontWeight: 700, lineHeight: 1.15 }}>Create your account</span>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>Weights</h2>
        </div>
        <div className="panel-body hstack wrap" style={{ gap: 24 }}>
          {weights.map((t) => (
            <div key={t.id} className="stack" style={{ gap: 4 }}>
              <span style={{ fontFamily: family, fontSize: 28, fontWeight: Number(t.value) }}>Ag</span>
              <span className="code">{t.name}</span>
              <span className="muted code">{t.value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SpacingShape() {
  const tokens = usePlatform((s) => s.data.tokens);
  const group = (cat: string) => tokens.filter((t) => t.category === cat);
  return (
    <div className="stack" style={{ gap: 20 }}>
      <section className="panel">
        <div className="panel-head">
          <h2>Spacing</h2>
        </div>
        <div className="panel-body stack">
          {group('Spacing').map((t) => (
            <div key={t.id} className="hstack">
              <span className="code" style={{ width: 120 }}>{t.name}</span>
              <span style={{ width: 120 }}><ValueInput token={t} /></span>
              <span className="space-bar" style={{ width: t.value }} aria-hidden />
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>Radius and elevation</h2>
        </div>
        <div className="panel-body hstack wrap" style={{ gap: 20, alignItems: 'flex-start' }}>
          {[...group('Shape'), ...group('Elevation')].map((t) => (
            <div key={t.id} className="stack" style={{ gap: 6, width: 170 }}>
              <span className="shape-sample" style={t.type === 'shadow' ? { boxShadow: t.value, borderRadius: 12 } : { borderRadius: t.value }} aria-hidden />
              <span className="code" style={{ fontWeight: 600 }}>{t.name}</span>
              <ValueInput token={t} />
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>Motion</h2>
          <span className="muted" style={{ fontSize: 12 }}>Brand values only. Reduced-motion settings turn movement into instant changes.</span>
        </div>
        <div className="panel-body stack">
          {group('Motion').map((t) => (
            <div key={t.id} className="hstack">
              <span className="code" style={{ width: 200 }}>{t.name}</span>
              <span style={{ width: 260 }}><ValueInput token={t} /></span>
              <span className="muted" style={{ fontSize: 12 }}>{t.description}</span>
            </div>
          ))}
          <MotionDemo />
        </div>
      </section>
    </div>
  );
}

function MotionDemo() {
  const tokens = usePlatform((s) => s.data.tokens);
  const [on, setOn] = useState(false);
  return (
    <div className="hstack" style={{ marginTop: 8 }}>
      <button type="button" className="btn sm" onClick={() => setOn(!on)}>
        Play transition
      </button>
      <div className="motion-track" aria-hidden>
        <span style={{ transform: on ? 'translateX(220px)' : 'none', transition: `transform ${resolveToken('motion.duration.lg', tokens)} ${resolveToken('motion.easing.standard', tokens)}` }} />
      </div>
    </div>
  );
}

const TYPES: TokenType[] = ['color', 'fontFamily', 'fontWeight', 'fontSize', 'dimension', 'radius', 'shadow', 'duration', 'easing'];

function TokenTable() {
  const st = usePlatform();
  const { tokens, components } = usePlatform((s) => s.data);
  const focus = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('focus');
  const [q, setQ] = useState(focus ?? '');
  const [cat, setCat] = useState('all');
  const [tier, setTier] = useState('all');
  const [prov, setProv] = useState('all');
  const [adding, setAdding] = useState(false);
  const cats = [...new Set(tokens.map((t) => t.category))];
  const rows = tokens.filter((t) => (cat === 'all' || t.category === cat) && (tier === 'all' || t.tier === tier) && (prov === 'all' || t.provenance === prov) && (!q || t.name.includes(q.toLowerCase())));
  return (
    <section className="panel">
      <div className="panel-head wrap">
        <div style={{ position: 'relative', width: 240 }}>
          <Search size={14} style={{ position: 'absolute', left: 9, top: 9, color: 'var(--c-ink-3)' }} aria-hidden />
          <input className="input" style={{ paddingLeft: 28 }} placeholder="Filter by name" aria-label="Filter tokens by name" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select" style={{ width: 140 }} aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">All categories</option>
          {cats.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className="select" style={{ width: 130 }} aria-label="Tier" value={tier} onChange={(e) => setTier(e.target.value)}>
          <option value="all">All tiers</option>
          <option value="primitive">Primitive</option>
          <option value="semantic">Semantic</option>
        </select>
        <select className="select" style={{ width: 150 }} aria-label="Provenance" value={prov} onChange={(e) => setProv(e.target.value)}>
          <option value="all">Any provenance</option>
          <option value="brand">Brand</option>
          <option value="derived">Derived</option>
          <option value="functional">Functional</option>
          <option value="todo-brand">TODO-BRAND</option>
        </select>
        <span className="grow" />
        <span className="muted" aria-live="polite">{rows.length} tokens</span>
        <button type="button" className="btn sm primary" onClick={() => setAdding(true)}>
          <Plus size={13} /> Add token
        </button>
      </div>
      <div style={{ maxHeight: 'calc(100vh - 230px)', overflow: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Tier</th>
              <th>Value</th>
              <th>Resolved</th>
              <th>Used by</th>
              <th>Provenance</th>
              <th>
                <span className="sr-only">Delete</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const v = resolveToken(t.name, tokens);
              const users = components.filter((c) => c.tokens.includes(t.name)).length;
              const refs = dependents(t.name, tokens).length;
              return (
                <tr key={t.id} style={focus === t.name ? { outline: '2px solid var(--c-accent)' } : undefined}>
                  <td className="code" style={{ fontWeight: 600 }}>{t.name}</td>
                  <td>{t.tier}</td>
                  <td style={{ minWidth: 200 }}>
                    <ValueInput token={t} />
                  </td>
                  <td>
                    <span className="hstack">
                      {t.type === 'color' && v ? <span className="swatch" style={{ background: v }} aria-hidden /> : null}
                      <span className="code muted">{v ?? 'broken reference'}</span>
                    </span>
                  </td>
                  <td className="muted">
                    {users} comp.{refs ? `, ${refs} token${refs > 1 ? 's' : ''}` : ''}
                  </td>
                  <td>
                    <ProvBadge p={t.provenance} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn ghost icon sm danger"
                      aria-label={`Delete ${t.name}`}
                      onClick={() => {
                        const r = st.deleteToken(t.id);
                        st.toast(r.ok ? `${t.name} deleted` : r.reason!, r.ok ? 'neutral' : 'error');
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {adding ? <TokenDialog onClose={() => setAdding(false)} /> : null}
    </section>
  );
}

function TokenDialog({ onClose }: { onClose: () => void }) {
  const st = usePlatform();
  const tokens = usePlatform((s) => s.data.tokens);
  const [name, setName] = useState('');
  const [type, setType] = useState<TokenType>('color');
  const [tier, setTier] = useState<'primitive' | 'semantic'>('primitive');
  const [value, setValue] = useState('');
  const [provenance, setProvenance] = useState<TokenProvenance>('derived');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState(false);
  const nameErr = !/^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/.test(name) ? 'Use a dotted lowercase name, for example color.surface.raised' : tokens.some((t) => t.name === name) ? 'This name is already used' : undefined;
  const valErr = !isValidTokenValue(type, value) ? `Enter a valid ${type} value or a {token.name} reference` : value.startsWith('{') && resolveToken(value.slice(1, -1), tokens) == null ? 'This reference points to no token' : undefined;
  const category = { color: 'Color', fontFamily: 'Typography', fontWeight: 'Typography', fontSize: 'Typography', dimension: 'Spacing', radius: 'Shape', shadow: 'Elevation', duration: 'Motion', easing: 'Motion' }[type];
  return (
    <Dialog
      title="Add a token"
      description="Semantic tokens should point to a primitive with a {reference}."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              setTouched(true);
              if (nameErr || valErr) return;
              st.addToken({ name, type, tier, category, value: value.trim(), provenance, description: description || undefined });
              st.toast(`${name} added`);
              onClose();
            }}
          >
            Add token
          </button>
        </>
      }
    >
      <div className="stack">
        <TextField label="Name" value={name} onChange={(v) => setName(v.trim())} mono error={touched ? nameErr : undefined} autoFocus />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <SelectField label="Type" value={type} onChange={setType} options={TYPES.map((t) => ({ value: t, label: t }))} />
          <SelectField label="Tier" value={tier} onChange={setTier} options={[{ value: 'primitive', label: 'Primitive' }, { value: 'semantic', label: 'Semantic' }]} />
        </div>
        <TextField label="Value" value={value} onChange={setValue} mono placeholder={type === 'color' ? '#1b1f24 or {color.ink.900}' : ''} error={touched ? valErr : undefined} />
        <SelectField
          label="Provenance"
          value={provenance}
          onChange={setProvenance}
          options={[
            { value: 'brand', label: 'Brand (from the brand source)' },
            { value: 'derived', label: 'Derived (computed from brand values)' },
            { value: 'functional', label: 'Functional (no brand meaning)' },
            { value: 'todo-brand', label: 'TODO-BRAND (placeholder)' },
          ]}
          hint="Never mark a value as Brand unless the brand source defines it."
        />
        <TextField label="Description" value={description} onChange={setDescription} />
      </div>
    </Dialog>
  );
}

function Dependencies() {
  const { tokens, components } = usePlatform((s) => s.data);
  const [sel, setSel] = useState(tokens.find((t) => t.tier === 'primitive')?.name ?? '');
  const prim = tokens.filter((t) => t.tier === 'primitive');
  const chain = useMemo(() => {
    const sems = dependents(sel, tokens);
    const names = [sel, ...sems.map((s) => s.name)];
    const comps = components.filter((c) => c.tokens.some((n) => names.includes(n)));
    return { sems, comps };
  }, [sel, tokens, components]);
  return (
    <div className="stack" style={{ gap: 16 }}>
      <p className="muted" style={{ maxWidth: 720 }}>
        Tokens are layered: a primitive holds a raw value, semantic tokens give it a role, components consume roles. Pick a primitive to see what a change would reach.
      </p>
      <div className="dep-grid">
        <div className="panel">
          <div className="panel-head">
            <h2>Primitive</h2>
          </div>
          <ul className="list" style={{ maxHeight: 460, overflow: 'auto' }}>
            {prim.map((t) => (
              <li key={t.id}>
                <button type="button" className="row-btn" aria-pressed={sel === t.name} aria-current={sel === t.name ? 'true' : undefined} onClick={() => setSel(t.name)}>
                  {t.type === 'color' ? <span className="swatch" style={{ background: t.value }} aria-hidden /> : null}
                  <span className="code grow">{t.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <ArrowRight className="dep-arrow" aria-hidden />
        <div className="panel">
          <div className="panel-head">
            <h2>Semantic roles</h2>
            <span className="muted">{chain.sems.length}</span>
          </div>
          <ul className="list">
            {chain.sems.length === 0 ? <li className="panel-body muted">Used directly, no semantic alias.</li> : null}
            {chain.sems.map((s) => (
              <li key={s.id} className="panel-body code" style={{ padding: '8px 16px' }}>
                {s.name}
              </li>
            ))}
          </ul>
        </div>
        <ArrowRight className="dep-arrow" aria-hidden />
        <div className="panel">
          <div className="panel-head">
            <h2>Components affected</h2>
            <span className="muted">{chain.comps.length}</span>
          </div>
          <ul className="list">
            {chain.comps.length === 0 ? <li className="panel-body muted">No component affected.</li> : null}
            {chain.comps.map((c) => (
              <li key={c.id}>
                <a className="row-btn" href={`#/components/${c.id}`} style={{ color: 'inherit', textDecoration: 'none', padding: '8px 16px' }}>
                  {c.name}
                  <span className="grow" />
                  <span className="muted" style={{ fontSize: 12 }}>{c.category}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
