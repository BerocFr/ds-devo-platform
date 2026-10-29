import { Plus, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { href, navigate } from '../../app/router';
import { contrastRatio, resolveToken } from '../../domain/tokens';
import { validateJourney } from '../../domain/validation';
import { usePlatform } from '../../store/store';
import { relativeTime } from '../../ui/kit';
import { GenerateJourneyDialog } from '../journeys/GenerateJourneyDialog';
import './overview.css';

export function Overview() {
  const { workspace, tokens, components, useCases, insights, journeys, activity } = usePlatform((s) => s.data);
  const [gen, setGen] = useState(false);
  const reports = useMemo(() => new Map(journeys.map((j) => [j.id, validateJourney(j, components, tokens)])), [journeys, components, tokens]);
  const todo = tokens.filter((t) => t.provenance === 'todo-brand');
  const btnContrast = contrastRatio(resolveToken('color.surface.default', tokens) ?? '#fff', resolveToken('color.action.primary', tokens) ?? '#000') ?? 0;
  const uncovered = insights.filter((i) => !journeys.some((j) => j.nodes.some((n) => n.insightIds.includes(i.id))));
  const validated = journeys.filter((j) => j.status === 'validated').length;
  const recent = [...journeys].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const bench = components.filter((c) => c.provenance?.source === 'bench-01').length;

  const chain = [
    { label: 'Company identity', value: workspace.name, note: 'Brand source linked', to: href({ name: 'design-system', tab: 'foundations' }), state: 'done' },
    { label: 'Design System', value: `${tokens.length} tokens`, note: todo.length ? `${todo.length} awaiting brand values` : 'All values sourced', to: href({ name: 'design-system', tab: 'tokens' }), state: todo.length ? 'warn' : 'done' },
    { label: 'Component Library', value: `${components.length} components`, note: `${bench} from the benchmark`, to: href({ name: 'components' }), state: 'done' },
    { label: 'Use cases and insights', value: `${useCases.length} use cases, ${insights.length} insights`, note: uncovered.length ? `${uncovered.length} insight${uncovered.length > 1 ? 's' : ''} not yet addressed` : 'All insights addressed', to: href({ name: 'insights' }), state: uncovered.length ? 'warn' : 'done' },
    { label: 'Journeys', value: `${journeys.length} journeys`, note: `${validated} validated`, to: href({ name: 'journeys' }), state: validated ? 'done' : 'warn' },
    { label: 'Interactive preview', value: 'Open a journey', note: 'Walk through it screen by screen', to: recent[0] ? href({ name: 'journey', id: recent[0].id }) : href({ name: 'journeys' }), state: 'next' },
  ];

  return (
    <>
      <header className="page-head">
        <h1>Overview</h1>
        <span className="muted">{workspace.industry}</span>
        <span className="grow" />
        <a className="btn" href="#/components">
          <Plus size={15} /> New component
        </a>
        <button type="button" className="btn primary" onClick={() => setGen(true)}>
          <Sparkles size={15} /> Generate a journey
        </button>
      </header>
      <div className="page-body">
        <section aria-labelledby="chain-h" className="chain-wrap">
          <h2 id="chain-h" className="section-title">
            From brand to experience
          </h2>
          <ol className="chain">
            {chain.map((c, i) => (
              <li key={c.label} className={`chain-step ${c.state}`}>
                <a href={c.to}>
                  <span className="chain-n" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="chain-label">{c.label}</span>
                  <strong>{c.value}</strong>
                  <span className="chain-note">{c.note}</span>
                </a>
              </li>
            ))}
          </ol>
        </section>

        <div className="ov-grid">
          <section className="panel ov-journeys" aria-labelledby="rj">
            <div className="panel-head">
              <h2 id="rj">Recent journeys</h2>
              <span className="grow" />
              <a href="#/journeys" className="btn ghost sm">
                All journeys
              </a>
            </div>
            <ul className="list">
              {recent.map((j) => {
                const r = reports.get(j.id)!;
                return (
                  <li key={j.id}>
                    <a className="row-btn" href={href({ name: 'journey', id: j.id })} style={{ color: 'inherit', textDecoration: 'none' }}>
                      <span className="grow">
                        <strong style={{ display: 'block' }}>{j.name}</strong>
                        <span className="muted" style={{ fontSize: 12 }}>
                          {useCases.find((u) => u.id === j.useCaseId)?.title ?? 'No use case'}, {plural(j.nodes.filter((n) => n.kind === 'screen').length, 'screen')}, updated {relativeTime(j.updatedAt)}
                        </span>
                      </span>
                      {r.counts.error ? <span className="badge danger">{r.counts.error} errors</span> : r.counts.warning ? <span className="badge warning">{r.counts.warning} warnings</span> : <span className="badge success">Passes</span>}
                      <span className={`badge ${j.status === 'validated' ? 'success' : j.status === 'in-review' ? 'info' : ''}`}>{j.status === 'in-review' ? 'In review' : j.status === 'validated' ? 'Validated' : 'Draft'}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
            {journeys.length === 0 ? (
              <div className="panel-body">
                <div className="empty">
                  <strong>No journey yet.</strong>
                  <button type="button" className="btn primary sm" onClick={() => setGen(true)}>
                    Generate a journey
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="panel" aria-labelledby="dss">
            <div className="panel-head">
              <h2 id="dss">Design System status</h2>
            </div>
            <div className="panel-body stack">
              <div className="meter-row">
                <span>Brand-sourced or derived</span>
                <strong>
                  {tokens.length - todo.length} of {tokens.length}
                </strong>
              </div>
              <div className="meter" aria-hidden>
                <span style={{ width: `${((tokens.length - todo.length) / Math.max(1, tokens.length)) * 100}%` }} />
              </div>
              <div className="meter-row">
                <span>Primary button text contrast</span>
                <strong className={btnContrast >= 4.5 ? 'ok' : 'ko'}>{btnContrast.toFixed(2)}:1 {btnContrast >= 4.5 ? 'AA' : 'fails AA'}</strong>
              </div>
              {todo.length ? (
                <p style={{ fontSize: 13 }}>
                  Waiting for the brand: {todo.map((t) => t.name.replace('color.', '')).join(', ')}.{' '}
                  <a href="#/design-system/tokens">Review tokens</a>
                </p>
              ) : null}
            </div>
          </section>

          <section className="panel" aria-labelledby="cl">
            <div className="panel-head">
              <h2 id="cl">Component library</h2>
            </div>
            <div className="panel-body">
              <table className="table">
                <tbody>
                  {(['Actions', 'Forms', 'Feedback', 'Navigation', 'Content', 'Layout'] as const).map((cat) => {
                    const n = components.filter((c) => c.category === cat);
                    return (
                      <tr key={cat}>
                        <td>{cat}</td>
                        <td style={{ textAlign: 'right' }}>{n.length}</td>
                        <td style={{ textAlign: 'right' }} className="muted">
                          {n.filter((c) => c.status === 'beta').length ? `${n.filter((c) => c.status === 'beta').length} beta` : ''}
                          {n.filter((c) => c.status === 'deprecated').length ? ` ${n.filter((c) => c.status === 'deprecated').length} deprecated` : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel" aria-labelledby="ri">
            <div className="panel-head">
              <h2 id="ri">Insights to act on</h2>
              <span className="grow" />
              <a href="#/insights" className="btn ghost sm">
                All insights
              </a>
            </div>
            <ul className="list">
              {(uncovered.length ? uncovered : insights.slice(0, 4)).slice(0, 4).map((i) => (
                <li key={i.id}>
                  <a className="row-btn" href={href({ name: 'insights', id: i.id })} style={{ color: 'inherit', textDecoration: 'none' }}>
                    <span className={`kind-dot ${i.kind}`} aria-hidden />
                    <span className="grow">{i.title}</span>
                    {uncovered.includes(i) ? <span className="badge warning">Not addressed</span> : null}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel" aria-labelledby="act">
            <div className="panel-head">
              <h2 id="act">Activity</h2>
            </div>
            <ul className="list activity">
              {activity.slice(0, 7).map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    className="row-btn"
                    onClick={() => {
                      if (!a.target) return;
                      const t = a.target;
                      if (t.kind === 'journey' && journeys.some((j) => j.id === t.id)) navigate({ name: 'journey', id: t.id });
                      else if (t.kind === 'component') navigate({ name: 'components', id: t.id });
                      else if (t.kind === 'insight' || t.kind === 'useCase') navigate({ name: 'insights', id: t.id });
                      else if (t.kind === 'token') navigate({ name: 'design-system', tab: 'tokens' });
                    }}
                  >
                    <span className="grow">{a.text}</span>
                    <span className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {relativeTime(a.at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      {gen ? <GenerateJourneyDialog onClose={() => setGen(false)} /> : null}
    </>
  );
}

export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
