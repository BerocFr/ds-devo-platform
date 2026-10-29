import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, ChevronRight, CircleAlert, ExternalLink, Info, Lightbulb, Play, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ComponentDef, ComponentInstance, Journey, JourneyEdge, JourneyNode } from '../../domain/types';
import type { ValidationIssue, ValidationReport } from '../../domain/validation';
import { usePlatform } from '../../store/store';
import { SelectField, Tabs, TextField } from '../../ui/kit';
import { ComponentGlyph } from '../components/glyphs';
import type { Selection } from './JourneyBuilder';

interface Props {
  journey: Journey;
  selection: Selection;
  onSelect: (s: Selection) => void;
  report: ValidationReport;
  tab: 'journey' | 'checks';
  onTab: (t: 'journey' | 'checks') => void;
  onFocusNode: (id: string) => void;
  onDeleteSelection: () => void;
  onPreviewFrom: (id: string) => void;
}

export function Inspector(p: Props) {
  const node = p.selection?.kind === 'node' ? p.journey.nodes.find((n) => n.id === p.selection!.id) : undefined;
  const edge = p.selection?.kind === 'edge' ? p.journey.edges.find((e) => e.id === p.selection!.id) : undefined;
  return (
    <aside className="side right" aria-label="Properties and configuration">
      {node ? (
        <NodeInspector key={node.id} {...p} node={node} />
      ) : edge ? (
        <EdgeInspector key={edge.id} {...p} edge={edge} />
      ) : (
        <JourneyPanel {...p} />
      )}
    </aside>
  );
}

/* ---------- Journey (nothing selected) ---------- */

function JourneyPanel({ journey, report, tab, onTab, onFocusNode, onSelect }: Props) {
  const st = usePlatform();
  const { useCases, insights } = usePlatform((s) => s.data);
  const screens = journey.nodes.filter((n) => n.kind === 'screen');
  const ucInsights = insights.filter((i) => journey.useCaseId && i.useCaseIds.includes(journey.useCaseId));
  const covered = ucInsights.filter((i) => journey.nodes.some((n) => n.insightIds.includes(i.id)));
  const decisions = journey.nodes.flatMap((n) => n.decisions);
  const traced = decisions.filter((d) => d.insightIds.length > 0);
  const usedComponents = new Set(journey.nodes.flatMap((n) => n.components.map((c) => c.componentId)));

  return (
    <>
      <div className="insp-head">
        <h2>{journey.name}</h2>
      </div>
      <Tabs
        label="Journey panel"
        value={tab}
        onChange={onTab}
        tabs={[
          { id: 'journey', label: 'Journey' },
          { id: 'checks', label: <>Checks <span className={`badge ${report.counts.error ? 'danger' : report.counts.warning ? 'warning' : 'success'}`}>{report.counts.error + report.counts.warning}</span></> },
        ]}
      />
      <div className="side-scroll" role="tabpanel">
        {tab === 'journey' ? (
          <div className="stack">
            <SelectField
              label="Use case"
              value={journey.useCaseId ?? ''}
              onChange={(v) => st.updateJourneyMeta(journey.id, { useCaseId: v || null })}
              options={[{ value: '', label: 'None' }, ...useCases.map((u) => ({ value: u.id, label: u.title }))]}
            />
            <SelectField
              label="Status"
              value={journey.status}
              onChange={(v) => st.updateJourneyMeta(journey.id, { status: v })}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'in-review', label: 'In review' },
                { value: 'validated', label: 'Validated' },
              ]}
            />
            <div>
              <div className="section-title">Structure</div>
              <dl className="kv">
                <dt>Screens</dt>
                <dd>{screens.length}</dd>
                <dt>Decisions</dt>
                <dd>{journey.nodes.filter((n) => n.kind === 'decision').length}</dd>
                <dt>Alternative paths</dt>
                <dd>{journey.edges.filter((e) => e.kind === 'alternative').length}</dd>
                <dt>Library components</dt>
                <dd>{usedComponents.size} distinct</dd>
              </dl>
            </div>
            <div>
              <div className="section-title">Traceability</div>
              <dl className="kv">
                <dt>Use case insights covered</dt>
                <dd>
                  {covered.length} of {ucInsights.length}
                </dd>
                <dt>Design decisions traced</dt>
                <dd>
                  {traced.length} of {decisions.length}
                </dd>
              </dl>
              {ucInsights.length > covered.length ? (
                <div className="stack" style={{ gap: 6, marginTop: 8 }}>
                  <span className="muted" style={{ fontSize: 12 }}>
                    Not yet addressed by any step:
                  </span>
                  {ucInsights
                    .filter((i) => !covered.includes(i))
                    .map((i) => (
                      <span key={i.id} className="badge warning">
                        {i.title}
                      </span>
                    ))}
                </div>
              ) : null}
            </div>
            <div>
              <div className="section-title">Design decisions</div>
              {decisions.length === 0 ? <p className="muted">No design decision recorded yet. Select a screen, open Insights, and record why it looks the way it does.</p> : null}
              {journey.nodes
                .filter((n) => n.decisions.length)
                .map((n) => (
                  <div key={n.id} className="trace">
                    <button type="button" className="btn ghost sm" style={{ alignSelf: 'flex-start', padding: 0 }} onClick={() => onFocusNode(n.id)}>
                      {n.title}
                    </button>
                    {n.decisions.map((d) => (
                      <div key={d.id}>
                        <span>{d.text}</span>
                        <div className="hstack wrap" style={{ marginTop: 2 }}>
                          {d.insightIds.map((iid) => (
                            <span key={iid} className="badge accent">
                              <Lightbulb size={11} aria-hidden />
                              {insights.find((x) => x.id === iid)?.title ?? 'Removed insight'}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <ChecksList
            issues={report.issues}
            onPick={(i) => {
              if (i.nodeId) {
                onFocusNode(i.nodeId);
                if (i.instanceId) onSelect({ kind: 'node', id: i.nodeId, instanceId: i.instanceId });
              } else if (i.edgeId) onSelect({ kind: 'edge', id: i.edgeId });
            }}
            footer={
              report.passes && journey.status !== 'validated' ? (
                <button type="button" className="btn primary" style={{ marginTop: 12 }} onClick={() => { st.updateJourneyMeta(journey.id, { status: 'validated' }); st.toast('Journey marked as validated', 'success'); }}>
                  Mark journey as validated
                </button>
              ) : !report.passes ? (
                <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
                  Fix the errors to mark this journey as validated. Warnings do not block.
                </p>
              ) : null
            }
          />
        )}
      </div>
    </>
  );
}

const SEV_ICON = { error: CircleAlert, warning: AlertTriangle, info: Info };

function ChecksList({ issues, onPick, footer }: { issues: ValidationIssue[]; onPick: (i: ValidationIssue) => void; footer?: React.ReactNode }) {
  const order = { error: 0, warning: 1, info: 2 };
  const sorted = [...issues].sort((a, b) => order[a.severity] - order[b.severity]);
  const c = { error: 0, warning: 0, info: 0 };
  for (const i of issues) c[i.severity]++;
  return (
    <div>
      <div className="score" style={{ marginBottom: 10 }}>
        <span className="badge danger">{c.error} errors</span>
        <span className="badge warning">{c.warning} warnings</span>
        <span className="badge info">{c.info} notes</span>
      </div>
      {sorted.length === 0 ? (
        <div className="empty">
          <strong>No issue found.</strong>
          <span>The flow is complete, components match the design system and every step is traced.</span>
        </div>
      ) : null}
      {sorted.map((i) => {
        const I = SEV_ICON[i.severity];
        return (
          <button key={i.id} type="button" className="issue" onClick={() => onPick(i)}>
            <I size={15} className={`sev ${i.severity}`} aria-label={i.severity} />
            <span>
              <span className="muted" style={{ fontSize: 11 }}>
                {i.area}
              </span>
              <br />
              {i.message}
              {i.fix ? <span className="fix">{i.fix}</span> : null}
            </span>
          </button>
        );
      })}
      {footer}
    </div>
  );
}

/* ---------- Node ---------- */

type NodeTab = 'props' | 'components' | 'insights' | 'branches' | 'checks';

function NodeInspector({ journey, node, selection, report, onSelect, onDeleteSelection, onPreviewFrom, onFocusNode }: Props & { node: JourneyNode }) {
  const st = usePlatform();
  const nodeIssues = report.issues.filter((i) => i.nodeId === node.id);
  const tabs: { id: NodeTab; label: React.ReactNode }[] = [{ id: 'props', label: 'Step' }];
  if (node.kind === 'screen') tabs.push({ id: 'components', label: <>Components <span className="tab-count">{node.components.length}</span></> });
  if (node.kind === 'decision') tabs.push({ id: 'branches', label: 'Branches' });
  tabs.push({ id: 'insights', label: <>Insights <span className="tab-count">{node.insightIds.length}</span></> });
  if (node.kind === 'screen' || node.kind === 'decision') tabs.push({ id: 'checks', label: nodeIssues.length ? <>Checks <span className={`tab-count ${nodeIssues.some((i) => i.severity === 'error') ? 'danger' : 'warning'}`}>{nodeIssues.length}</span></> : 'Checks' });
  const [tab, setTab] = useState<NodeTab>(selection?.kind === 'node' && selection.instanceId ? 'components' : node.kind === 'screen' ? 'components' : 'props');
  useEffect(() => {
    if (selection?.kind === 'node' && selection.instanceId) setTab('components');
  }, [selection]);
  const kindLabel = { start: 'Start', screen: 'Screen', decision: 'Decision', outcome: 'Outcome' }[node.kind];
  const upd = (patch: Partial<JourneyNode>) => st.updateNode(journey.id, node.id, patch);

  return (
    <>
      <div className="insp-head">
        <span className={`badge ${node.kind === 'decision' ? 'decision' : node.kind === 'outcome' ? 'success' : ''}`}>{kindLabel}</span>
        <h2>{node.title}</h2>
        {node.kind === 'screen' ? (
          <button type="button" className="btn ghost icon sm" aria-label={`Preview from ${node.title}`} title="Preview from this screen" onClick={() => onPreviewFrom(node.id)}>
            <Play size={14} />
          </button>
        ) : null}
        <button type="button" className="btn ghost icon sm danger" aria-label={`Delete ${node.title}`} onClick={onDeleteSelection}>
          <Trash2 size={14} />
        </button>
      </div>
      <Tabs label="Step settings" value={tab} onChange={setTab} tabs={tabs} />
      <div className="side-scroll" role="tabpanel">
        {tab === 'props' && (
          <div className="stack">
            <TextField label="Title" value={node.title} onChange={(v) => upd({ title: v })} />
            <TextField label="Description" value={node.description} onChange={(v) => upd({ description: v })} multiline hint="What happens here and why, for reviewers." />
            {node.kind === 'decision' ? <TextField label="Question evaluated" value={node.question ?? ''} onChange={(v) => upd({ question: v })} hint="Each outgoing branch answers this question." /> : null}
            {node.kind === 'outcome' ? (
              <SelectField label="Outcome type" value={node.tone ?? 'neutral'} onChange={(v) => upd({ tone: v })} options={[{ value: 'success', label: 'Success' }, { value: 'failure', label: 'Failure' }, { value: 'neutral', label: 'Neutral' }]} />
            ) : null}
            <TextField label="Notes for developers" value={node.notes ?? ''} onChange={(v) => upd({ notes: v })} multiline placeholder="Analytics events, API calls, edge cases" />
            <div>
              <div className="section-title">Connections</div>
              <ConnList journey={journey} node={node} onSelect={onSelect} />
            </div>
          </div>
        )}
        {tab === 'components' && node.kind === 'screen' && <ComponentsEditor journey={journey} node={node} openId={selection?.kind === 'node' ? selection.instanceId : undefined} onSelect={onSelect} />}
        {tab === 'branches' && <ConnList journey={journey} node={node} onSelect={onSelect} outgoingOnly editable />}
        {tab === 'insights' && <InsightsEditor journey={journey} node={node} />}
        {tab === 'checks' && (
          <ChecksList
            issues={nodeIssues}
            onPick={(i) => {
              if (i.instanceId) onSelect({ kind: 'node', id: node.id, instanceId: i.instanceId });
              else if (i.edgeId) onSelect({ kind: 'edge', id: i.edgeId });
              else onFocusNode(node.id);
            }}
          />
        )}
      </div>
    </>
  );
}

function ConnList({ journey, node, onSelect, outgoingOnly, editable }: { journey: Journey; node: JourneyNode; onSelect: (s: Selection) => void; outgoingOnly?: boolean; editable?: boolean }) {
  const st = usePlatform();
  const name = (id: string) => journey.nodes.find((n) => n.id === id)?.title ?? 'Unknown';
  const outgoing = journey.edges.filter((e) => e.source === node.id);
  const incoming = journey.edges.filter((e) => e.target === node.id && e.source !== node.id);
  if (editable) {
    return (
      <div className="stack">
        {outgoing.length === 0 ? <div className="empty">No branch yet. Drag from the right dot of this decision to the next step.</div> : null}
        {outgoing.map((e) => (
          <div key={e.id} className="inst open">
            <div className="inst-body" style={{ borderTop: 0 }}>
              <div className="hstack">
                <strong className="grow">To {name(e.target)}</strong>
                <button type="button" className="btn ghost sm" onClick={() => onSelect({ kind: 'edge', id: e.id })}>
                  Open
                </button>
              </div>
              <TextField label="Label" value={e.label} onChange={(v) => st.updateEdge(journey.id, e.id, { label: v })} />
              <TextField label="Condition" value={e.condition ?? ''} onChange={(v) => st.updateEdge(journey.id, e.id, { condition: v })} placeholder="for example: email is malformed" />
              <div className="seg" role="group" aria-label="Path type">
                <button type="button" aria-pressed={e.kind === 'main'} onClick={() => st.updateEdge(journey.id, e.id, { kind: 'main' })}>
                  Main path
                </button>
                <button type="button" aria-pressed={e.kind === 'alternative'} onClick={() => st.updateEdge(journey.id, e.id, { kind: 'alternative' })}>
                  Alternative
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <ul className="list" style={{ fontSize: 13 }}>
      {!outgoingOnly &&
        incoming.map((e) => (
          <li key={e.id}>
            <button type="button" className="row-btn" style={{ padding: '6px 2px' }} onClick={() => onSelect({ kind: 'edge', id: e.id })}>
              <span className="muted" style={{ width: 40 }}>
                From
              </span>
              <span className="grow">{name(e.source)}</span>
              <span className="badge">{e.label}</span>
            </button>
          </li>
        ))}
      {outgoing.map((e) => (
        <li key={e.id}>
          <button type="button" className="row-btn" style={{ padding: '6px 2px' }} onClick={() => onSelect({ kind: 'edge', id: e.id })}>
            <span className="muted" style={{ width: 40 }}>
              To
            </span>
            <span className="grow">{name(e.target)}</span>
            <span className={`badge ${e.kind === 'alternative' ? 'warning' : ''}`}>{e.label}</span>
          </button>
        </li>
      ))}
      {incoming.length + outgoing.length === 0 ? <li className="muted">Not connected.</li> : null}
    </ul>
  );
}

function ComponentsEditor({ journey, node, openId, onSelect }: { journey: Journey; node: JourneyNode; openId?: string; onSelect: (s: Selection) => void }) {
  const st = usePlatform();
  const components = usePlatform((s) => s.data.components);
  const [open, setOpen] = useState<string | undefined>(openId);
  useEffect(() => setOpen(openId), [openId]);
  const [adding, setAdding] = useState('');
  return (
    <div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        Each item is one use of a library component on this screen. Changes here apply to this screen only; edit the component itself in the library.
      </p>
      {node.components.length === 0 ? <div className="empty">This screen is empty. Add components below or drag them from the left panel.</div> : null}
      {node.components.map((inst, idx) => {
        const def = components.find((c) => c.id === inst.componentId);
        const isOpen = open === inst.id;
        const summary = String(inst.props.label ?? inst.props.text ?? inst.props.title ?? '');
        return (
          <div key={inst.id} className={`inst ${isOpen ? 'open' : ''}`}>
            <div className="inst-head">
              <button type="button" className="name" aria-expanded={isOpen} onClick={() => { setOpen(isOpen ? undefined : inst.id); if (!isOpen) onSelect({ kind: 'node', id: node.id, instanceId: inst.id }); }}>
                <span className="hstack" style={{ gap: 6 }}>
                  {isOpen ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                  {def ? <ComponentGlyph kind={def.kind} size={13} /> : null}
                  <strong>{def?.name ?? 'Missing component'}</strong>
                  <span className="muted" style={{ fontSize: 11 }}>{def?.variants.find((v) => v.id === inst.variantId)?.name}</span>
                </span>
                {summary ? <span>{summary}</span> : null}
              </button>
              <button type="button" className="btn ghost icon sm" aria-label="Move up" disabled={idx === 0} onClick={() => st.moveInstance(journey.id, node.id, idx, idx - 1)}>
                <ArrowUp size={13} />
              </button>
              <button type="button" className="btn ghost icon sm" aria-label="Move down" disabled={idx === node.components.length - 1} onClick={() => st.moveInstance(journey.id, node.id, idx, idx + 1)}>
                <ArrowDown size={13} />
              </button>
              <button type="button" className="btn ghost icon sm danger" aria-label={`Remove ${def?.name ?? 'component'}`} onClick={() => { st.removeInstance(journey.id, node.id, inst.id); st.toast(`${def?.name ?? 'Component'} removed`, 'neutral', { label: 'Undo', run: () => usePlatform.getState().undo(journey.id) }); }}>
                <X size={13} />
              </button>
            </div>
            {isOpen && def ? <InstanceEditor journey={journey} node={node} inst={inst} def={def} /> : null}
          </div>
        );
      })}
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="add-comp">Add a component</label>
        <div className="hstack">
          <select id="add-comp" className="select" value={adding} onChange={(e) => setAdding(e.target.value)}>
            <option value="">Choose from the library</option>
            {['Patterns', 'Actions', 'Forms', 'Feedback', 'Navigation', 'Content', 'Layout'].map((cat) => (
              <optgroup key={cat} label={cat}>
                {components
                  .filter((c) => c.category === cat && c.status !== 'deprecated')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <button
            type="button"
            className="btn"
            disabled={!adding}
            onClick={() => {
              const id = st.addInstance(journey.id, node.id, adding);
              setAdding('');
              if (id) {
                setOpen(id);
                onSelect({ kind: 'node', id: node.id, instanceId: id });
              }
            }}
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}

function InstanceEditor({ journey, node, inst, def }: { journey: Journey; node: JourneyNode; inst: ComponentInstance; def: ComponentDef }) {
  const st = usePlatform();
  const [advanced, setAdvanced] = useState(false);
  const upd = (patch: Partial<ComponentInstance>) => st.updateInstance(journey.id, node.id, inst.id, patch);
  const outgoing = journey.edges.filter((e) => e.source === node.id);
  const triggered = outgoing.filter((e) => e.triggerInstanceId === inst.id);
  const canInteract = def.interactions.some((k) => k !== 'none');
  const props = def.props.filter((p) => advanced || !p.advanced);
  const hasAdvanced = def.props.some((p) => p.advanced);
  return (
    <div className="inst-body">
      <div className="field">
        <span className="field-label">Variant</span>
        <div className="seg" role="group" aria-label="Variant">
          {def.variants.map((v) => (
            <button key={v.id} type="button" aria-pressed={inst.variantId === v.id} title={v.description} onClick={() => upd({ variantId: v.id })}>
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
              <button key={s} type="button" aria-pressed={(inst.size ?? def.sizes[Math.min(1, def.sizes.length - 1)]) === s} onClick={() => upd({ size: s })}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {props.map((p) =>
        p.kind === 'boolean' ? (
          <label key={p.name} className="check">
            <input type="checkbox" checked={!!inst.props[p.name]} onChange={(e) => upd({ props: { [p.name]: e.target.checked } })} />
            {p.label}
          </label>
        ) : p.kind === 'select' ? (
          <SelectField key={p.name} label={p.label} value={String(inst.props[p.name] ?? p.defaultValue)} onChange={(v) => upd({ props: { [p.name]: v } })} options={(p.options ?? []).map((o) => ({ value: o, label: o }))} />
        ) : p.kind === 'number' ? (
          <TextField key={p.name} label={p.label} type="number" value={String(inst.props[p.name] ?? p.defaultValue)} onChange={(v) => upd({ props: { [p.name]: Number(v) } })} />
        ) : (
          <TextField key={p.name} label={p.label} value={String(inst.props[p.name] ?? '')} onChange={(v) => upd({ props: { [p.name]: v } })} />
        ),
      )}
      {hasAdvanced || def.states.length > 1 ? (
        <button type="button" className="btn ghost sm" style={{ alignSelf: 'flex-start' }} aria-expanded={advanced} onClick={() => setAdvanced(!advanced)}>
          {advanced ? 'Hide advanced settings' : 'Show advanced settings'}
        </button>
      ) : null}
      {advanced && def.states.length > 1 ? (
        <div className="field">
          <span className="field-label">State shown in previews</span>
          <div className="seg" role="group" aria-label="State">
            {def.states.map((s) => (
              <button key={s} type="button" aria-pressed={(inst.state ?? 'default') === s} onClick={() => upd({ state: s })}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {canInteract ? (
        <div className="field">
          <SelectField
            label="Interaction"
            value={inst.interaction?.kind ?? 'none'}
            onChange={(v) => upd({ interaction: { kind: v } })}
            options={def.interactions.map((k) => ({ value: k, label: { navigate: 'Go to another step', submit: 'Submit and check', back: 'Go back', none: 'No interaction' }[k] }))}
          />
          {inst.interaction && inst.interaction.kind !== 'none' && inst.interaction.kind !== 'back' ? (
            <SelectField
              label="Leads to"
              value={triggered[0]?.id ?? ''}
              onChange={(edgeId) => {
                for (const e of triggered) st.updateEdge(journey.id, e.id, { triggerInstanceId: undefined });
                if (edgeId) st.updateEdge(journey.id, edgeId, { triggerInstanceId: inst.id });
              }}
              options={[
                { value: '', label: outgoing.length ? 'Not connected' : 'Connect this screen first' },
                ...outgoing.map((e) => ({ value: e.id, label: `${e.label} → ${journey.nodes.find((n) => n.id === e.target)?.title ?? '?'}` })),
              ]}
              hint="Pick the connection this component triggers. In preview, it follows that path."
            />
          ) : null}
        </div>
      ) : null}
      <div>
        <span className="field-label">Design tokens used</span>
        <div className="hstack wrap" style={{ marginTop: 4, gap: 4 }}>
          {def.tokens.map((t) => (
            <a key={t} className="badge code" href="#/design-system/tokens" style={{ textDecoration: 'none' }}>
              {t}
            </a>
          ))}
        </div>
      </div>
      <a href={`#/components/${def.id}`} className="hstack" style={{ fontSize: 12 }}>
        <ExternalLink size={12} /> Open {def.name} in the library
      </a>
    </div>
  );
}

function InsightsEditor({ journey, node }: { journey: Journey; node: JourneyNode }) {
  const st = usePlatform();
  const insights = usePlatform((s) => s.data.insights);
  const linked = insights.filter((i) => node.insightIds.includes(i.id));
  const candidates = insights.filter((i) => !node.insightIds.includes(i.id) && (!journey.useCaseId || i.useCaseIds.includes(journey.useCaseId)));
  const others = insights.filter((i) => !node.insightIds.includes(i.id) && !candidates.includes(i));
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const addable = useMemo(() => [...candidates, ...others], [candidates, others]);
  return (
    <div className="stack">
      <div>
        <div className="section-title">Linked insights</div>
        {linked.length === 0 ? <p className="muted">No insight linked. Every screen should answer a need or a pain point.</p> : null}
        {linked.map((i) => (
          <div key={i.id} className="insight linked">
            <div className="hstack">
              <span className={`kind-dot ${i.kind}`} aria-hidden />
              <strong className="grow" style={{ fontSize: 13 }}>
                {i.title}
              </strong>
              <button type="button" className="btn ghost icon sm" aria-label={`Unlink ${i.title}`} onClick={() => st.toggleNodeInsight(journey.id, node.id, i.id)}>
                <X size={13} />
              </button>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>
              {i.source}
            </span>
          </div>
        ))}
        {addable.length ? (
          <div className="field" style={{ marginTop: 8 }}>
            <label htmlFor="link-in">Link an insight</label>
            <select id="link-in" className="select" value="" onChange={(e) => e.target.value && st.toggleNodeInsight(journey.id, node.id, e.target.value)}>
              <option value="">Choose an insight</option>
              {candidates.length ? (
                <optgroup label="From this use case">
                  {candidates.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.title}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {others.length ? (
                <optgroup label="Other insights">
                  {others.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.title}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </div>
        ) : null}
      </div>
      {node.kind === 'screen' || node.kind === 'decision' ? (
        <div>
          <div className="section-title">Design decisions on this step</div>
          {node.decisions.map((d) => (
            <div key={d.id} className="inst open" style={{ marginBottom: 6 }}>
              <div className="inst-body" style={{ borderTop: 0 }}>
                <TextField label="Decision" value={d.text} onChange={(v) => st.updateDecision(journey.id, node.id, d.id, { text: v })} />
                <div className="field">
                  <span className="field-label">Justified by</span>
                  <div className="hstack wrap" style={{ gap: 4 }}>
                    {insights
                      .filter((i) => node.insightIds.includes(i.id) || d.insightIds.includes(i.id))
                      .map((i) => (
                        <button
                          key={i.id}
                          type="button"
                          className="badge"
                          aria-pressed={d.insightIds.includes(i.id)}
                          style={{ cursor: 'pointer', ...(d.insightIds.includes(i.id) ? { background: 'var(--c-accent-soft)', color: 'var(--c-accent)', borderColor: 'transparent' } : {}) }}
                          onClick={() => st.updateDecision(journey.id, node.id, d.id, { insightIds: d.insightIds.includes(i.id) ? d.insightIds.filter((x) => x !== i.id) : [...d.insightIds, i.id] })}
                        >
                          {i.title}
                        </button>
                      ))}
                    {node.insightIds.length === 0 && d.insightIds.length === 0 ? <span className="muted" style={{ fontSize: 12 }}>Link an insight to the step first.</span> : null}
                  </div>
                </div>
                <button type="button" className="btn ghost sm danger" style={{ alignSelf: 'flex-start' }} onClick={() => st.removeDecision(journey.id, node.id, d.id)}>
                  Remove decision
                </button>
              </div>
            </div>
          ))}
          <form
            className="stack"
            style={{ gap: 8, marginTop: 6 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              st.addDecision(journey.id, node.id, text.trim(), picked.length ? picked : node.insightIds.slice(0, 1));
              setText('');
              setPicked([]);
              st.toast('Design decision recorded');
            }}
          >
            <TextField label="New decision" value={text} onChange={setText} placeholder="for example: ask for three fields only" hint="It will be linked to the insights selected below, or to the first linked insight." />
            {linked.length ? (
              <div className="hstack wrap" style={{ gap: 4 }}>
                {linked.map((i) => (
                  <button key={i.id} type="button" className="badge" aria-pressed={picked.includes(i.id)} style={{ cursor: 'pointer', ...(picked.includes(i.id) ? { background: 'var(--c-accent-soft)', color: 'var(--c-accent)', borderColor: 'transparent' } : {}) }} onClick={() => setPicked(picked.includes(i.id) ? picked.filter((x) => x !== i.id) : [...picked, i.id])}>
                    {i.title}
                  </button>
                ))}
              </div>
            ) : null}
            <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }} disabled={!text.trim()}>
              <Plus size={14} /> Record decision
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- Edge ---------- */

function EdgeInspector({ journey, edge, onSelect, onDeleteSelection }: Props & { edge: JourneyEdge }) {
  const st = usePlatform();
  const components = usePlatform((s) => s.data.components);
  const src = journey.nodes.find((n) => n.id === edge.source);
  const upd = (patch: Partial<JourneyEdge>) => st.updateEdge(journey.id, edge.id, patch);
  const triggers = (src?.components ?? []).filter((i) => {
    const d = components.find((c) => c.id === i.componentId);
    return d?.interactions.some((k) => k !== 'none');
  });
  const nodeOpts = journey.nodes.map((n) => ({ value: n.id, label: `${n.title} (${n.kind})` }));
  return (
    <>
      <div className="insp-head">
        <span className={`badge ${edge.kind === 'alternative' ? 'warning' : ''}`}>{edge.kind === 'alternative' ? 'Alternative path' : 'Main path'}</span>
        <h2>{edge.label || 'Connection'}</h2>
        <button type="button" className="btn ghost icon sm danger" aria-label="Delete connection" onClick={onDeleteSelection}>
          <Trash2 size={14} />
        </button>
      </div>
      <div className="side-scroll">
        <div className="stack">
          <SelectField label="From" value={edge.source} onChange={(v) => upd({ source: v, triggerInstanceId: undefined })} options={nodeOpts.filter((o) => journey.nodes.find((n) => n.id === o.value)?.kind !== 'outcome')} />
          <SelectField label="To" value={edge.target} onChange={(v) => upd({ target: v })} options={nodeOpts.filter((o) => journey.nodes.find((n) => n.id === o.value)?.kind !== 'start')} />
          <TextField label="Label" value={edge.label} onChange={(v) => upd({ label: v })} hint="Shown on the canvas and as a choice in preview." />
          <TextField label="Condition" value={edge.condition ?? ''} onChange={(v) => upd({ condition: v })} placeholder={src?.kind === 'decision' ? 'for example: code expired' : 'Optional'} hint={src?.kind === 'decision' ? 'Required for branches leaving a decision.' : undefined} />
          <div className="field">
            <span className="field-label">Path type</span>
            <div className="seg" role="group" aria-label="Path type">
              <button type="button" aria-pressed={edge.kind === 'main'} onClick={() => upd({ kind: 'main' })}>
                Main path
              </button>
              <button type="button" aria-pressed={edge.kind === 'alternative'} onClick={() => upd({ kind: 'alternative' })}>
                Alternative (error, recovery)
              </button>
            </div>
          </div>
          {src?.kind === 'screen' ? (
            <SelectField
              label="Triggered by"
              value={edge.triggerInstanceId ?? ''}
              onChange={(v) => upd({ triggerInstanceId: v || undefined })}
              options={[
                { value: '', label: 'No component (shown as a side choice in preview)' },
                ...triggers.map((i) => ({ value: i.id, label: `${components.find((c) => c.id === i.componentId)?.name}: ${String(i.props.label ?? i.props.cta ?? i.props.title ?? '')}` })),
              ]}
              hint="The button or link that takes the person along this path."
            />
          ) : null}
          <button type="button" className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => onSelect({ kind: 'node', id: edge.source })}>
            Select source step
          </button>
        </div>
      </div>
    </>
  );
}
