import { Flag, GitBranch, Lightbulb, Play } from 'lucide-react';
import type { Journey } from '../../domain/types';
import { DsScope, ScaledPage, ScreenRender } from '../../ds/Renderer';
import { usePlatform } from '../../store/store';
import { orderPages } from '../journeys/DescribeJourneyDialog';
import type { Selection } from './JourneyBuilder';

/** The journey as a sequence of structured pages: section outline on the left, real render on the right. */
export function PagesView({ journey, selection, onSelect, onPreviewFrom }: { journey: Journey; selection: Selection; onSelect: (s: Selection) => void; onPreviewFrom: (id: string) => void }) {
  const { components, tokens, insights } = usePlatform((s) => s.data);
  const pages = orderPages(journey);
  let n = 0;
  return (
    <div className="pages-view" aria-label="Pages of the journey">
      {pages.map((node) => {
        const selected = selection?.kind === 'node' && selection.id === node.id;
        const outs = journey.edges.filter((e) => e.source === node.id);
        if (node.kind !== 'screen') {
          return (
            <div key={node.id} className={`pv-step k-${node.kind} ${selected ? 'selected' : ''}`}>
              {node.kind === 'decision' ? <GitBranch size={14} aria-hidden /> : node.kind === 'outcome' ? <Flag size={14} aria-hidden /> : <Play size={14} aria-hidden />}
              <button type="button" className="pv-link" onClick={() => onSelect({ kind: 'node', id: node.id })}>
                {node.kind === 'decision' ? node.question || node.title : node.title}
              </button>
              <span className="grow" />
              {outs.map((e) => (
                <span key={e.id} className={`badge ${e.kind === 'alternative' ? 'warning' : ''}`} title={e.condition ? `When ${e.condition}` : undefined}>
                  {e.label} to {journey.nodes.find((x) => x.id === e.target)?.title}
                </span>
              ))}
            </div>
          );
        }
        n++;
        const linked = insights.filter((i) => node.insightIds.includes(i.id));
        return (
          <article key={node.id} className={`pv-page ${selected ? 'selected' : ''}`} aria-labelledby={`pv-${node.id}`}>
            <aside className="pv-outline">
              <span className="pv-n">Page {n}</span>
              <h3 id={`pv-${node.id}`}>
                <button type="button" className="pv-link" onClick={() => onSelect({ kind: 'node', id: node.id })}>
                  {node.title}
                </button>
              </h3>
              {node.description ? <p className="muted">{node.description}</p> : null}
              <ol className="pv-sections">
                {node.components.map((c) => {
                  const d = components.find((x) => x.id === c.componentId);
                  return (
                    <li key={c.id}>
                      <button type="button" className={`chip ${d?.category === 'Patterns' ? 'pattern' : ''}`} onClick={() => onSelect({ kind: 'node', id: node.id, instanceId: c.id })}>
                        {d?.name ?? 'Missing component'}
                      </button>
                    </li>
                  );
                })}
              </ol>
              {linked.length ? (
                <div className="pv-why">
                  {linked.map((i) => (
                    <span key={i.id}>
                      <Lightbulb size={12} aria-hidden /> {i.title}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="hstack wrap" style={{ gap: 4 }}>
                {outs.map((e) => (
                  <span key={e.id} className={`badge ${e.kind === 'alternative' ? 'warning' : ''}`}>
                    {e.label}
                  </span>
                ))}
              </div>
              <button type="button" className="btn sm" onClick={() => onPreviewFrom(node.id)}>
                <Play size={13} /> Preview from here
              </button>
            </aside>
            <div className="pv-frame" aria-hidden>
              <ScaledPage width={1200}>
                <DsScope tokens={tokens}>
                  <ScreenRender instances={node.components} components={components} mode="thumb" />
                </DsScope>
              </ScaledPage>
            </div>
          </article>
        );
      })}
    </div>
  );
}
