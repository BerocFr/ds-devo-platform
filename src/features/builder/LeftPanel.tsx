import { Flag, GripVertical, Link2, MonitorSmartphone, Play, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ComponentCategory, Journey, NodeKind } from '../../domain/types';
import { usePlatform } from '../../store/store';
import { Tabs } from '../../ui/kit';
import { ComponentGlyph } from '../components/glyphs';
import type { Selection } from './JourneyBuilder';
import { BLOCK_MIME, COMPONENT_MIME } from './nodes';

type Tab = 'context' | 'components' | 'blocks';

const KIND_LABEL = { 'pain-point': 'Pain point', need: 'Need', observation: 'Observation', opportunity: 'Opportunity' } as const;

export function LeftPanel({
  journey,
  selection,
  onAddBlock,
  onAddComponent,
  onFocusNode,
}: {
  journey: Journey;
  selection: Selection;
  onAddBlock: (k: NodeKind) => void;
  onAddComponent: (componentId: string) => void;
  onFocusNode: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>('context');
  return (
    <aside className="side left" aria-label="Context and assets">
      <Tabs<Tab>
        label="Left panel"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'context', label: 'Context' },
          { id: 'components', label: 'Components' },
          { id: 'blocks', label: 'Blocks' },
        ]}
      />
      <div className="side-scroll" role="tabpanel">
        {tab === 'context' && <ContextTab journey={journey} selection={selection} onFocusNode={onFocusNode} />}
        {tab === 'components' && <ComponentsTab selection={selection} journey={journey} onAdd={onAddComponent} />}
        {tab === 'blocks' && <BlocksTab journey={journey} onAdd={onAddBlock} onFocusNode={onFocusNode} />}
      </div>
    </aside>
  );
}

function ContextTab({ journey, selection, onFocusNode }: { journey: Journey; selection: Selection; onFocusNode: (id: string) => void }) {
  const { useCases, insights } = usePlatform((s) => s.data);
  const st = usePlatform();
  const [scope, setScope] = useState<'use-case' | 'all'>('use-case');
  const uc = useCases.find((u) => u.id === journey.useCaseId) ?? null;
  const node = selection?.kind === 'node' ? journey.nodes.find((n) => n.id === selection.id) : undefined;
  const shown = scope === 'all' || !uc ? insights : insights.filter((i) => i.useCaseIds.includes(uc.id));

  return (
    <>
      <section className="side-section" aria-labelledby="ctx-uc">
        <div className="side-h" id="ctx-uc">
          Use case
        </div>
        {uc ? (
          <div className="uc-box">
            <strong>{uc.title}</strong>
            <dl>
              <dt>Business objective</dt>
              <dd>{uc.businessObjective}</dd>
              <dt>Desired outcome</dt>
              <dd>{uc.outcome}</dd>
              <dt>Audience</dt>
              <dd>{uc.audience}</dd>
              <dt>Success metric</dt>
              <dd>{uc.metric}</dd>
            </dl>
            <a href={`#/insights/${uc.id}`} className="muted" style={{ fontSize: 12 }}>
              Edit use case
            </a>
          </div>
        ) : (
          <div className="empty" style={{ padding: 14 }}>
            <span>This journey is not linked to a use case yet.</span>
            <select className="select" aria-label="Link a use case" value="" onChange={(e) => st.updateJourneyMeta(journey.id, { useCaseId: e.target.value })}>
              <option value="" disabled>
                Link a use case
              </option>
              {useCases.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section className="side-section" aria-labelledby="ctx-in">
        <div className="side-h" id="ctx-in">
          <span className="grow">Insights, needs and pain points</span>
          {uc ? (
            <div className="seg" role="group" aria-label="Insight scope">
              <button type="button" aria-pressed={scope === 'use-case'} onClick={() => setScope('use-case')}>
                Use case
              </button>
              <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
                All
              </button>
            </div>
          ) : null}
        </div>
        {node ? (
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            Link insights to <strong>{node.title}</strong> to record why this step exists.
          </p>
        ) : (
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            Select a step on the canvas to link insights to it.
          </p>
        )}
        {shown.length === 0 ? <div className="empty">No insight yet. Add them in Use Cases and Insights.</div> : null}
        {shown.map((i) => {
          const linked = !!node?.insightIds.includes(i.id);
          const usedIn = journey.nodes.filter((n) => n.insightIds.includes(i.id));
          return (
            <article key={i.id} className={`insight ${linked ? 'linked' : ''}`}>
              <div className="meta">
                <span className={`kind-dot ${i.kind}`} aria-hidden />
                <span className="muted" style={{ fontSize: 12 }}>
                  {KIND_LABEL[i.kind]}, {i.evidence} evidence
                </span>
              </div>
              <strong style={{ fontSize: 13 }}>{i.title}</strong>
              <span className="muted" style={{ fontSize: 12 }}>
                {i.detail}
              </span>
              <div className="meta">
                {usedIn.map((n) => (
                  <button key={n.id} type="button" className="badge" style={{ cursor: 'pointer' }} onClick={() => onFocusNode(n.id)}>
                    {n.title}
                  </button>
                ))}
                <span className="grow" />
                {node ? (
                  <button type="button" className={`btn sm ${linked ? '' : 'ghost'}`} aria-pressed={linked} onClick={() => st.toggleNodeInsight(journey.id, node.id, i.id)}>
                    <Link2 size={13} />
                    {linked ? 'Linked' : 'Link'}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}

const CATS: (ComponentCategory | 'All')[] = ['All', 'Patterns', 'Actions', 'Forms', 'Feedback', 'Navigation', 'Content', 'Layout'];

function ComponentsTab({ selection, journey, onAdd }: { selection: Selection; journey: Journey; onAdd: (id: string) => void }) {
  const components = usePlatform((s) => s.data.components);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<(typeof CATS)[number]>('All');
  const node = selection?.kind === 'node' ? journey.nodes.find((n) => n.id === selection.id) : undefined;
  const list = useMemo(
    () =>
      components
        .filter((c) => c.status !== 'deprecated')
        .filter((c) => cat === 'All' || c.category === cat)
        .filter((c) => !q || `${c.name} ${c.description} ${c.category}`.toLowerCase().includes(q.toLowerCase())),
    [components, q, cat],
  );
  return (
    <>
      <div className="field" style={{ marginBottom: 8 }}>
        <label htmlFor="lib-q" className="sr-only">
          Search components
        </label>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 9, top: 9, color: 'var(--c-ink-3)' }} aria-hidden />
          <input id="lib-q" className="input" style={{ paddingLeft: 28 }} placeholder="Search the library" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="seg" role="group" aria-label="Category" style={{ marginBottom: 10 }}>
        {CATS.map((c) => (
          <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
        {node?.kind === 'screen' ? (
          <>
            Drag onto any screen, or press + to add to <strong>{node.title}</strong>.
          </>
        ) : (
          'Drag a component onto a screen on the canvas.'
        )}
      </p>
      {list.length === 0 ? <div className="empty">No component matches "{q}".</div> : null}
      {list.map((c) => (
        <div
          key={c.id}
          className="lib-item"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(COMPONENT_MIME, c.id);
            e.dataTransfer.effectAllowed = 'copy';
          }}
        >
          <GripVertical size={13} className="muted" aria-hidden />
          <span className="glyph" aria-hidden>
            <ComponentGlyph kind={c.kind} />
          </span>
          <span className="grow" style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 500 }}>{c.name}</span>
            <span className="muted" style={{ fontSize: 11 }}>
              {c.category}
              {c.status === 'beta' ? ', beta' : ''}
              {c.provenance?.source === 'bench-01' ? ', from benchmark' : ''}
            </span>
          </span>
          <button type="button" className="btn ghost icon sm add" aria-label={`Add ${c.name} to the selected screen`} onClick={() => onAdd(c.id)}>
            <Plus size={14} />
          </button>
        </div>
      ))}
    </>
  );
}

const BLOCKS: { kind: NodeKind; title: string; text: string; icon: JSX.Element }[] = [
  { kind: 'screen', title: 'Screen', text: 'A step the person sees, built from components.', icon: <MonitorSmartphone size={16} /> },
  { kind: 'decision', title: 'Decision', text: 'A check that splits the path: valid or not, found or not.', icon: <span className="diamond" style={{ margin: 3 }} /> },
  { kind: 'outcome', title: 'Outcome', text: 'Where the journey ends: success, failure or neutral.', icon: <Flag size={16} /> },
  { kind: 'start', title: 'Start', text: 'The entry point. One per journey.', icon: <Play size={16} /> },
];

function BlocksTab({ journey, onAdd, onFocusNode }: { journey: Journey; onAdd: (k: NodeKind) => void; onFocusNode: (id: string) => void }) {
  return (
    <>
      <section className="side-section">
        <div className="side-h">Journey blocks</div>
        {BLOCKS.map((b) => (
          <button
            key={b.kind}
            type="button"
            className="block-tile"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(BLOCK_MIME, b.kind);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            onClick={() => onAdd(b.kind)}
          >
            <span className="glyph" style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', border: '1px solid var(--c-line)', borderRadius: 6 }} aria-hidden>
              {b.icon}
            </span>
            <span>
              <strong style={{ fontSize: 13 }}>{b.title}</strong>
              <small>{b.text}</small>
            </span>
          </button>
        ))}
      </section>
      <section className="side-section">
        <div className="side-h">Steps in this journey</div>
        <ul className="list">
          {journey.nodes.map((n) => (
            <li key={n.id}>
              <button type="button" className="row-btn" style={{ padding: '6px 4px' }} onClick={() => onFocusNode(n.id)}>
                <span className="muted" style={{ width: 62, fontSize: 11 }}>
                  {n.kind}
                </span>
                <span className="grow">{n.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
