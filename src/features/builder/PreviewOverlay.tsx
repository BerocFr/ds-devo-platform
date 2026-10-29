import { ArrowLeft, Flag, Lightbulb, Monitor, Pencil, RotateCcw, Smartphone, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Journey } from '../../domain/types';
import { DsScope, ScreenRender } from '../../ds/Renderer';
import { usePlatform } from '../../store/store';

function firstStep(journey: Journey, startNodeId?: string): string | null {
  if (startNodeId && journey.nodes.some((n) => n.id === startNodeId && n.kind !== 'start')) return startNodeId;
  const start = journey.nodes.find((n) => n.kind === 'start');
  if (!start) return journey.nodes[0]?.id ?? null;
  return journey.edges.find((e) => e.source === start.id)?.target ?? start.id;
}

export function PreviewOverlay({ journey, startNodeId, onClose, onEditNode }: { journey: Journey; startNodeId?: string; onClose: () => void; onEditNode: (id: string) => void }) {
  const { components, tokens, insights } = usePlatform((s) => s.data);
  const initial = useMemo(() => firstStep(journey, startNodeId), [journey, startNodeId]);
  const [trail, setTrail] = useState<string[]>(initial ? [initial] : []);
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [notice, setNotice] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const currentId = trail[trail.length - 1];
  const node = journey.nodes.find((n) => n.id === currentId);
  const outgoing = journey.edges.filter((e) => e.source === currentId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    const opener = document.activeElement as HTMLElement | null;
    stageRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey, true);
      opener?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    setNotice(null);
    // Move focus to the new screen so keyboard and screen reader users follow the journey.
    stageRef.current?.focus();
  }, [currentId]);

  const go = (target: string) => setTrail((t) => [...t, target]);
  const back = () => setTrail((t) => (t.length > 1 ? t.slice(0, -1) : t));
  const restart = () => setTrail(initial ? [initial] : []);

  const onAction = (instanceId: string) => {
    const inst = node?.components.find((c) => c.id === instanceId);
    const edge = outgoing.find((e) => e.triggerInstanceId === instanceId);
    if (edge) return go(edge.target);
    if (inst?.interaction?.kind === 'back') return back();
    const def = components.find((c) => c.id === inst?.componentId);
    setNotice(`"${String(inst?.props.label ?? inst?.props.cta ?? def?.name ?? 'This component')}" is not connected to a next step yet.`);
  };

  const untriggered = outgoing.filter((e) => !e.triggerInstanceId);
  const linkedInsights = insights.filter((i) => node?.insightIds.includes(i.id));

  return (
    <div className="preview" role="dialog" aria-modal="true" aria-label={`Preview of ${journey.name}`}>
      <div className="preview-stage">
        <div className="preview-bar">
          <button type="button" className="btn sm" onClick={back} disabled={trail.length < 2}>
            <ArrowLeft size={14} /> Back
          </button>
          <button type="button" className="btn sm" onClick={restart}>
            <RotateCcw size={14} /> Restart
          </button>
          <span className="grow" style={{ textAlign: 'center', fontWeight: 600 }}>
            {journey.name}
          </span>
          <div className="hstack" role="group" aria-label="Device">
            <button type="button" className="btn sm" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>
              <Smartphone size={14} /> Mobile
            </button>
            <button type="button" className="btn sm" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>
              <Monitor size={14} /> Desktop
            </button>
          </div>
          <button type="button" className="btn sm" onClick={onClose} aria-label="Close preview">
            <X size={14} /> Close
          </button>
        </div>
        <div className="preview-device-wrap">
          {!node ? (
            <div className="decision-card">
              <strong>Nothing to preview yet.</strong>
              <span>Add a Start block connected to a screen.</span>
            </div>
          ) : node.kind === 'screen' ? (
            <div className={`device ${device}`} ref={stageRef} tabIndex={-1} aria-label={`Screen: ${node.title}`}>
              <div className="device-chrome">{node.title}</div>
              <DsScope tokens={tokens}>
                {node.components.length ? (
                  <ScreenRender key={node.id} instances={node.components} components={components} mode="interactive" onAction={onAction} />
                ) : (
                  <div className="ds-screen">
                    <p>This screen has no component yet.</p>
                  </div>
                )}
              </DsScope>
            </div>
          ) : node.kind === 'decision' ? (
            <div className="decision-card" ref={stageRef} tabIndex={-1}>
              <span className="hstack" style={{ color: '#9a5b00', fontWeight: 600, fontSize: 12 }}>
                <span className="diamond" /> System decision, simulate the result
              </span>
              <strong style={{ fontSize: 17 }}>{node.question || node.title}</strong>
              {outgoing.length === 0 ? <span>No branch leaves this decision yet.</span> : null}
              {outgoing.map((e) => (
                <button key={e.id} type="button" className="choice" onClick={() => go(e.target)}>
                  <strong>{e.label || 'Unnamed branch'}</strong>
                  {e.condition ? <small>When {e.condition}</small> : <small>No condition written</small>}
                </button>
              ))}
            </div>
          ) : node.kind === 'outcome' ? (
            <div className="decision-card" ref={stageRef} tabIndex={-1}>
              <span className="hstack" style={{ fontWeight: 600, color: node.tone === 'failure' ? '#b42318' : node.tone === 'success' ? '#17734f' : '#4a515b' }}>
                <Flag size={16} /> Journey ends: {node.tone ?? 'neutral'}
              </span>
              <strong style={{ fontSize: 18 }}>{node.title}</strong>
              {node.description ? <span>{node.description}</span> : null}
              <span style={{ color: '#636b75', fontSize: 13 }}>
                {trail.length} step{trail.length > 1 ? 's' : ''} on this path.
              </span>
              <div className="hstack">
                <button type="button" className="btn primary" onClick={restart}>
                  <RotateCcw size={14} /> Run again
                </button>
                <button type="button" className="btn" onClick={back}>
                  Back
                </button>
              </div>
            </div>
          ) : (
            <div className="decision-card" ref={stageRef} tabIndex={-1}>
              <strong>{node.title}</strong>
              {outgoing.map((e) => (
                <button key={e.id} type="button" className="choice" onClick={() => go(e.target)}>
                  {e.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <aside className="preview-side" aria-label="Preview details">
        <div className="side-scroll">
          <div className="stack">
            {notice ? (
              <div className="badge warning" role="status" style={{ height: 'auto', padding: '6px 10px', whiteSpace: 'normal' }}>
                {notice}
              </div>
            ) : null}
            {node ? (
              <div className="hstack">
                <strong className="grow">{node.title}</strong>
                <button type="button" className="btn sm" onClick={() => onEditNode(node.id)}>
                  <Pencil size={13} /> Edit step
                </button>
              </div>
            ) : null}
            {node?.kind === 'screen' && untriggered.length ? (
              <div>
                <div className="section-title">Other ways out of this screen</div>
                <div className="stack" style={{ gap: 6 }}>
                  {untriggered.map((e) => (
                    <button key={e.id} type="button" className="btn" style={{ justifyContent: 'flex-start' }} onClick={() => go(e.target)}>
                      {e.label || 'Continue'}
                      {e.kind === 'alternative' ? <span className="badge warning">alternative</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <div className="section-title">Why this step</div>
              {linkedInsights.length === 0 && !node?.decisions.length ? <p className="muted">No insight linked to this step.</p> : null}
              {node?.decisions.map((d) => (
                <div key={d.id} className="trace">
                  <strong style={{ fontSize: 13 }}>{d.text}</strong>
                  {d.insightIds.map((iid) => {
                    const i = insights.find((x) => x.id === iid);
                    return i ? (
                      <span key={iid} className="muted" style={{ fontSize: 12 }}>
                        <Lightbulb size={11} aria-hidden /> {i.title} ({i.source})
                      </span>
                    ) : null;
                  })}
                </div>
              ))}
              {linkedInsights
                .filter((i) => !node?.decisions.some((d) => d.insightIds.includes(i.id)))
                .map((i) => (
                  <div key={i.id} className="trace">
                    <strong style={{ fontSize: 13 }}>{i.title}</strong>
                    <span className="muted" style={{ fontSize: 12 }}>{i.detail}</span>
                  </div>
                ))}
            </div>
            <div>
              <div className="section-title">Path so far</div>
              <ol className="path">
                {trail.map((id, i) => (
                  <li key={`${id}-${i}`} className={i === trail.length - 1 ? 'now' : ''}>
                    {journey.nodes.find((n) => n.id === id)?.title ?? id}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
