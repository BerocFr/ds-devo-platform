import { Pencil, Plus, Route, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { href } from '../../app/router';
import type { Insight, InsightKind, UseCase } from '../../domain/types';
import { usePlatform } from '../../store/store';
import { Dialog, SelectField, TextField } from '../../ui/kit';
import { GenerateJourneyDialog } from '../journeys/GenerateJourneyDialog';
import { NewJourneyDialog } from '../journeys/JourneysPage';
import '../builder/builder.css';

const KIND_LABEL: Record<InsightKind, string> = { 'pain-point': 'Pain point', need: 'Need', observation: 'Observation', opportunity: 'Opportunity' };

export function InsightsPage({ selectedId }: { selectedId?: string }) {
  const st = usePlatform();
  const { useCases, insights, journeys } = usePlatform((s) => s.data);
  const focusInsight = selectedId?.startsWith('in') ? insights.find((i) => i.id === selectedId) : undefined;
  const ucId = selectedId?.startsWith('uc') ? selectedId : focusInsight?.useCaseIds[0] ?? useCases[0]?.id;
  const uc = useCases.find((u) => u.id === ucId);
  const [scope, setScope] = useState<'use-case' | 'all'>(focusInsight && !focusInsight.useCaseIds.length ? 'all' : 'use-case');
  const [kind, setKind] = useState<InsightKind | 'all'>('all');
  const [editing, setEditing] = useState<Insight | 'new' | null>(null);
  const [ucDialog, setUcDialog] = useState<UseCase | 'new' | null>(null);
  const [gen, setGen] = useState(false);
  const [blank, setBlank] = useState(false);

  const list = insights.filter((i) => (scope === 'all' || (uc && i.useCaseIds.includes(uc.id))) && (kind === 'all' || i.kind === kind));
  const ucJourneys = journeys.filter((j) => j.useCaseId === uc?.id);

  return (
    <>
      <header className="page-head">
        <h1>Use Cases & Insights</h1>
        <span className="grow" />
        <button type="button" className="btn" onClick={() => setUcDialog('new')}>
          <Plus size={15} /> New use case
        </button>
        <button type="button" className="btn primary" onClick={() => setEditing('new')}>
          <Plus size={15} /> New insight
        </button>
      </header>
      <div className="page-body flush">
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', width: '100%', minHeight: 0 }}>
          <aside className="lib-list" style={{ borderRight: '1px solid var(--c-line)', background: 'var(--c-panel)', overflow: 'auto' }} aria-label="Use cases">
            <div className="side-h" style={{ padding: '14px 16px 6px' }}>
              Use cases
            </div>
            <ul className="list">
              {useCases.map((u) => (
                <li key={u.id}>
                  <a className="row-btn" href={href({ name: 'insights', id: u.id })} aria-current={u.id === uc?.id ? 'true' : undefined} style={{ color: 'inherit', textDecoration: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                    <strong style={{ fontSize: 13 }}>{u.title}</strong>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {insights.filter((i) => i.useCaseIds.includes(u.id)).length} insights, {journeys.filter((j) => j.useCaseId === u.id).length} journeys
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            {useCases.length === 0 ? (
              <div className="empty" style={{ margin: 12 }}>
                <span>Start with the job a person wants to get done.</span>
                <button type="button" className="btn sm" onClick={() => setUcDialog('new')}>
                  New use case
                </button>
              </div>
            ) : null}
          </aside>
          <div style={{ overflow: 'auto', padding: 24 }}>
            {uc ? (
              <section className="panel" style={{ marginBottom: 20 }} aria-labelledby="uc-title">
                <div className="panel-head">
                  <h2 id="uc-title">{uc.title}</h2>
                  <span className="grow" />
                  <button type="button" className="btn sm" onClick={() => setUcDialog(uc)}>
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    type="button"
                    className="btn ghost icon sm danger"
                    aria-label={`Delete use case ${uc.title}`}
                    onClick={() => {
                      st.deleteUseCase(uc.id);
                      st.toast('Use case deleted; its insights and journeys are kept');
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 24 }}>
                  <dl className="kv" style={{ gridTemplateColumns: '150px 1fr' }}>
                    <dt>Actor</dt>
                    <dd>{uc.actor}</dd>
                    <dt>Goal</dt>
                    <dd>{uc.goal}</dd>
                    <dt>Desired outcome</dt>
                    <dd>{uc.outcome}</dd>
                    <dt>Business objective</dt>
                    <dd>{uc.businessObjective}</dd>
                    <dt>Target audience</dt>
                    <dd>{uc.audience}</dd>
                    <dt>Context</dt>
                    <dd>{uc.context}</dd>
                    <dt>Success metric</dt>
                    <dd>{uc.metric}</dd>
                  </dl>
                  <div className="stack">
                    <div className="section-title" style={{ margin: 0 }}>
                      Journeys for this use case
                    </div>
                    {ucJourneys.length === 0 ? <span className="muted">No journey yet.</span> : null}
                    {ucJourneys.map((j) => (
                      <a key={j.id} href={href({ name: 'journey', id: j.id })} className="hstack" style={{ fontSize: 13 }}>
                        <Route size={14} /> {j.name}
                      </a>
                    ))}
                    <div className="hstack wrap">
                      <button type="button" className="btn primary sm" onClick={() => setGen(true)}>
                        <Sparkles size={14} /> Generate a journey
                      </button>
                      <button type="button" className="btn sm" onClick={() => setBlank(true)}>
                        Blank journey
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <section aria-labelledby="ins-title">
              <div className="hstack wrap" style={{ marginBottom: 12 }}>
                <h2 id="ins-title" style={{ fontSize: 15, fontWeight: 600 }}>
                  Insights
                </h2>
                <span className="grow" />
                <div className="seg" role="group" aria-label="Scope">
                  <button type="button" aria-pressed={scope === 'use-case'} onClick={() => setScope('use-case')} disabled={!uc}>
                    This use case
                  </button>
                  <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
                    All
                  </button>
                </div>
                <div className="seg" role="group" aria-label="Kind">
                  {(['all', 'pain-point', 'need', 'observation', 'opportunity'] as const).map((k) => (
                    <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
                      {k === 'all' ? 'All kinds' : KIND_LABEL[k]}
                    </button>
                  ))}
                </div>
              </div>
              {list.length === 0 ? (
                <div className="empty">
                  <strong>No insight here yet.</strong>
                  <span>Record what research, analytics or support taught you, so each design decision can point to it.</span>
                  <button type="button" className="btn sm" onClick={() => setEditing('new')}>
                    New insight
                  </button>
                </div>
              ) : null}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                {list.map((i) => {
                  const uses = journeys.flatMap((j) => j.nodes.filter((n) => n.insightIds.includes(i.id) || n.decisions.some((d) => d.insightIds.includes(i.id))).map((n) => ({ j, n })));
                  return (
                    <article key={i.id} className={`insight ${focusInsight?.id === i.id ? 'linked' : ''}`} style={{ margin: 0, padding: 14 }}>
                      <div className="meta">
                        <span className={`kind-dot ${i.kind}`} aria-hidden />
                        <span className="muted" style={{ fontSize: 12 }}>
                          {KIND_LABEL[i.kind]}, {i.evidence} evidence
                        </span>
                        <span className="grow" />
                        <button type="button" className="btn ghost icon sm" aria-label={`Edit ${i.title}`} onClick={() => setEditing(i)}>
                          <Pencil size={13} />
                        </button>
                      </div>
                      <strong style={{ fontSize: 14 }}>{i.title}</strong>
                      <span>{i.detail}</span>
                      <span className="muted" style={{ fontSize: 12 }}>
                        Source: {i.source}
                      </span>
                      <div className="stack" style={{ gap: 4, marginTop: 6 }}>
                        <span className="field-label">Traced to {uses.length} step{uses.length === 1 ? '' : 's'}</span>
                        <div className="hstack wrap" style={{ gap: 4 }}>
                          {uses.map(({ j, n }) => (
                            <a key={`${j.id}-${n.id}`} className="badge accent" style={{ textDecoration: 'none' }} href={href({ name: 'journey', id: j.id, node: n.id })}>
                              {n.title} in {j.name}
                            </a>
                          ))}
                          {uses.length === 0 ? <span className="badge warning">Not addressed by any journey yet</span> : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
      {editing ? <InsightDialog insight={editing === 'new' ? undefined : editing} defaultUseCaseId={uc?.id} onClose={() => setEditing(null)} /> : null}
      {ucDialog ? <UseCaseDialog useCase={ucDialog === 'new' ? undefined : ucDialog} onClose={() => setUcDialog(null)} /> : null}
      {gen && uc ? <GenerateJourneyDialog initialUseCaseId={uc.id} onClose={() => setGen(false)} /> : null}
      {blank && uc ? <NewJourneyDialog initialUseCaseId={uc.id} onClose={() => setBlank(false)} /> : null}
    </>
  );
}

function InsightDialog({ insight, defaultUseCaseId, onClose }: { insight?: Insight; defaultUseCaseId?: string; onClose: () => void }) {
  const st = usePlatform();
  const useCases = usePlatform((s) => s.data.useCases);
  const [f, setF] = useState<Omit<Insight, 'id'>>(
    insight ?? { kind: 'pain-point', title: '', detail: '', source: '', evidence: 'medium', useCaseIds: defaultUseCaseId ? [defaultUseCaseId] : [] },
  );
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF({ ...f, [k]: v });
  const save = () => {
    setTouched(true);
    if (!f.title.trim()) return;
    if (insight) {
      st.updateInsight(insight.id, f);
      st.toast('Insight updated');
    } else {
      st.addInsight({ ...f, title: f.title.trim() });
      st.toast('Insight added');
    }
    onClose();
  };
  return (
    <Dialog
      title={insight ? 'Edit insight' : 'New insight'}
      description="An insight is something you learned about people. Journeys link to it to justify design decisions."
      onClose={onClose}
      footer={
        <>
          {insight ? (
            <button type="button" className="btn danger" onClick={() => { st.deleteInsight(insight.id); st.toast('Insight deleted and unlinked from journeys'); onClose(); }}>
              Delete
            </button>
          ) : null}
          <span className="grow" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" onClick={save}>
            {insight ? 'Save insight' : 'Add insight'}
          </button>
        </>
      }
    >
      <div className="stack">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <SelectField label="Kind" value={f.kind} onChange={(v) => set('kind', v)} options={(Object.keys(KIND_LABEL) as InsightKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
          <SelectField label="Evidence" value={f.evidence} onChange={(v) => set('evidence', v)} options={[{ value: 'low', label: 'Low (anecdote, hunch)' }, { value: 'medium', label: 'Medium (a few sessions)' }, { value: 'high', label: 'High (data, repeated)' }]} />
        </div>
        <TextField label="Insight" value={f.title} onChange={(v) => set('title', v)} placeholder="for example: People abandon long forms" error={touched && !f.title.trim() ? 'Write the insight in one sentence' : undefined} autoFocus />
        <TextField label="Detail" value={f.detail} onChange={(v) => set('detail', v)} multiline placeholder="What you observed, with numbers when you have them." />
        <TextField label="Source" value={f.source} onChange={(v) => set('source', v)} placeholder="Interviews, analytics, support tickets" />
        <div className="field">
          <span className="field-label">Use cases</span>
          {useCases.map((u) => (
            <label key={u.id} className="check">
              <input type="checkbox" checked={f.useCaseIds.includes(u.id)} onChange={() => set('useCaseIds', f.useCaseIds.includes(u.id) ? f.useCaseIds.filter((x) => x !== u.id) : [...f.useCaseIds, u.id])} />
              {u.title}
            </label>
          ))}
        </div>
      </div>
    </Dialog>
  );
}

function UseCaseDialog({ useCase, onClose }: { useCase?: UseCase; onClose: () => void }) {
  const st = usePlatform();
  const [f, setF] = useState<Omit<UseCase, 'id'>>(useCase ?? { title: '', actor: '', goal: '', outcome: '', businessObjective: '', audience: '', context: '', metric: '' });
  const [touched, setTouched] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  return (
    <Dialog
      wide
      title={useCase ? 'Edit use case' : 'New use case'}
      description="Describe the job, who does it, and how the business measures success."
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
              if (!f.title.trim()) return;
              if (useCase) {
                st.updateUseCase(useCase.id, f);
                st.toast('Use case updated');
              } else {
                const id = st.addUseCase(f);
                st.toast('Use case added');
                window.location.hash = href({ name: 'insights', id });
              }
              onClose();
            }}
          >
            {useCase ? 'Save use case' : 'Add use case'}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <TextField label="Use case" value={f.title} onChange={set('title')} placeholder="for example: Book a discovery call" error={touched && !f.title.trim() ? 'Name the use case' : undefined} autoFocus />
        <TextField label="Actor" value={f.actor} onChange={set('actor')} placeholder="Who does it" />
        <TextField label="Goal" value={f.goal} onChange={set('goal')} multiline />
        <TextField label="Desired outcome" value={f.outcome} onChange={set('outcome')} multiline />
        <TextField label="Business objective" value={f.businessObjective} onChange={set('businessObjective')} multiline />
        <TextField label="Target audience" value={f.audience} onChange={set('audience')} multiline />
        <TextField label="Context" value={f.context} onChange={set('context')} multiline />
        <TextField label="Success metric" value={f.metric} onChange={set('metric')} multiline />
      </div>
    </Dialog>
  );
}
