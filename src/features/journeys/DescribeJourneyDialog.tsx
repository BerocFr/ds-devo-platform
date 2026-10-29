import { LayoutTemplate, Lightbulb, RefreshCcw, Sparkles, Square, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getSample, sampleErrorText, type SampleFn } from '../../app/claudeSample';
import { navigate } from '../../app/router';
import { buildClaudePrompt, planToJourney, type ClaudePlanJson } from '../../domain/claudePlanner';
import { PATTERNS, generateJourney } from '../../domain/generator';
import { planFromText } from '../../domain/nlPlanner';
import type { Journey, UseCase } from '../../domain/types';
import { validateJourney } from '../../domain/validation';
import { uid, usePlatform } from '../../store/store';
import { Dialog } from '../../ui/kit';
import { plural } from '../overview/Overview';
import { GenerateJourneyDialog } from './GenerateJourneyDialog';
import './describe.css';

const EXAMPLES = [
  'Un candidat cherche un poste de data engineer au Portugal et postule avec son CV',
  'A CISO reads a cybersecurity case study, then asks to talk to an expert',
  'Inscription à un webinar sur l’IA, avec le cas où l’événement est complet',
  'A visitor downloads our AWS cloud whitepaper and reads it online',
  'Un investisseur cherche le rapport annuel 2025',
  'A leader takes the AI maturity self-assessment and books a call',
];

interface Draft {
  journey: Journey;
  useCase: UseCase;
  isNewUseCase: boolean;
  engine: 'claude' | 'rules';
  notes: string[];
}

export function DescribeJourneyDialog({ onClose, initialText = '' }: { onClose: () => void; initialText?: string }) {
  const st = usePlatform();
  const data = usePlatform((s) => s.data);
  const [text, setText] = useState(initialText);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [sample, setSample] = useState<SampleFn | null>(null);
  const [useClaude, setUseClaude] = useState(true);
  const [pickPattern, setPickPattern] = useState(false);
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => {
    let live = true;
    getSample().then((s) => {
      if (!live) return;
      setSample(s);
      if (initialText.trim()) void draftIt(initialText, s);
    });
    return () => {
      live = false;
      ctl.current?.abort();
    };
  }, []);

  const rulesDraft = (request: string, extraNote?: string): Draft => {
    const plan = planFromText(request, data, uid);
    const r = generateJourney(
      { name: plan.name, patternId: plan.patternId, useCase: plan.useCase, insights: data.insights.filter((i) => plan.insightIds.includes(i.id)), includeErrorPaths: plan.includeErrorPaths, vars: plan.vars },
      data.components,
      uid,
    );
    if (r.skipped.length) plan.notes.push(`${plural(r.skipped.length, 'component use')} skipped: not available in the library.`);
    return { journey: r.journey, useCase: plan.useCase, isNewUseCase: plan.isNewUseCase, engine: 'rules', notes: extraNote ? [extraNote, ...plan.notes] : plan.notes };
  };

  const draftIt = async (requestText: string = text, sampleFn: SampleFn | null = sample) => {
    const request = requestText.trim();
    if (!request) return;
    setDraft(null);
    if (sampleFn && useClaude) {
      setBusy(true);
      setStatus('Claude is composing the journey from your library. This usually takes 20 to 60 seconds.');
      ctl.current = new AbortController();
      try {
        const raw = await sampleFn.json<ClaudePlanJson>(buildClaudePrompt(request, data), { signal: ctl.current.signal, onText: () => setStatus('Claude is writing the pages.') });
        const r = planToJourney(raw, data, uid);
        const notes = ['Drafted by Claude from your library and insights.', ...(r.dropped.length ? [`${plural(r.dropped.length, 'item')} ignored because it was not in the library.`] : [])];
        setDraft({ journey: r.journey, useCase: r.useCase, isNewUseCase: r.isNewUseCase, engine: 'claude', notes });
      } catch (e) {
        if ((e as { code?: string })?.code === 'cancelled') {
          setStatus('');
          setBusy(false);
          return;
        }
        setDraft(rulesDraft(request, sampleErrorText(e)));
      } finally {
        setBusy(false);
        setStatus('');
      }
    } else {
      setDraft(rulesDraft(request));
    }
  };

  const report = useMemo(() => (draft ? validateJourney(draft.journey, data.components, data.tokens) : null), [draft, data.components, data.tokens]);

  const create = () => {
    if (!draft) return;
    st.importJourney(draft.journey, `Journey "${draft.journey.name}" created from a description`, draft.isNewUseCase ? draft.useCase : undefined);
    st.toast(`Journey created: ${plural(draft.journey.nodes.filter((n) => n.kind === 'screen').length, 'page')}`, 'success');
    onClose();
    navigate({ name: 'journey', id: draft.journey.id });
  };

  if (pickPattern) return <GenerateJourneyDialog onClose={onClose} />;

  const order = draft ? orderPages(draft.journey) : [];

  return (
    <Dialog
      wide
      title="Describe a journey"
      description="Say who does what and why, in English or French. The platform drafts the pages from your component library and patterns, links the relevant insights, and checks the result."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={() => setPickPattern(true)}>
            <LayoutTemplate size={15} /> Pick a pattern instead
          </button>
          <span className="grow" />
          {draft ? (
            <>
              <button type="button" className="btn" onClick={() => void draftIt()} disabled={busy}>
                <RefreshCcw size={15} /> Draft again
              </button>
              <button type="button" className="btn primary" onClick={create}>
                <Sparkles size={15} /> Create journey
              </button>
            </>
          ) : busy ? (
            <button type="button" className="btn" onClick={() => ctl.current?.abort()}>
              <Square size={13} /> Stop
            </button>
          ) : (
            <button type="button" className="btn primary" onClick={() => void draftIt()} disabled={!text.trim()}>
              <Wand2 size={15} /> Draft the journey
            </button>
          )}
        </>
      }
    >
      <div className="describe">
        <div className="field">
          <label htmlFor="nl-request">What should the journey do?</label>
          <textarea
            id="nl-request"
            className="textarea describe-input"
            value={text}
            data-autofocus
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void draftIt();
            }}
            placeholder="for example: A job seeker finds a cloud architect role in Lisbon and applies with a CV"
          />
          <span className="hint">
            Name the person, their goal, and anything special: a country, a partner, error cases or not. Ctrl or Cmd + Enter drafts.
          </span>
        </div>
        <div className="describe-examples" aria-label="Examples">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className="badge" onClick={() => { setText(ex); setDraft(null); }}>
              {ex}
            </button>
          ))}
        </div>
        <div className="hstack" style={{ fontSize: 12 }}>
          {sample ? (
            <label className="check">
              <input type="checkbox" checked={useClaude} onChange={(e) => setUseClaude(e.target.checked)} />
              Draft with Claude (uses your Claude account; falls back to the built-in rules)
            </label>
          ) : (
            <span className="muted">Drafted by the built-in rules: {PATTERNS.length} journey types, English and French.</span>
          )}
        </div>
        {status ? (
          <div className="describe-status" role="status">
            <span className="spinner" aria-hidden /> {status}
          </div>
        ) : null}

        {draft && report ? (
          <section className="describe-result" aria-label="Draft">
            <div className="hstack wrap">
              <strong className="grow" style={{ fontSize: 15 }}>
                {draft.journey.name}
              </strong>
              <span className={`badge ${draft.engine === 'claude' ? 'accent' : ''}`}>{draft.engine === 'claude' ? 'Drafted by Claude' : 'Drafted by rules'}</span>
              <span className={`badge ${report.passes ? 'success' : 'danger'}`}>
                {plural(report.counts.error, 'error')}, {plural(report.counts.warning, 'warning')}
              </span>
            </div>
            <div className="describe-uc">
              <span className="field-label">{draft.isNewUseCase ? 'New use case, created with the journey' : 'Use case'}</span>
              <strong>{draft.useCase.title}</strong>
              <span className="muted">
                {draft.useCase.actor}
                {draft.useCase.businessObjective ? `. ${draft.useCase.businessObjective}` : ''}
              </span>
            </div>
            <ol className="describe-pages">
              {order.map((n) => (
                <li key={n.id} className={`k-${n.kind}`}>
                  <span className="describe-kind">{n.kind === 'screen' ? 'Page' : n.kind === 'decision' ? 'Check' : n.kind === 'outcome' ? 'Outcome' : 'Start'}</span>
                  <div className="grow">
                    <strong>{n.title}</strong>
                    {n.kind === 'decision' && n.question ? <span className="muted"> {n.question}</span> : null}
                    {n.components.length ? (
                      <div className="describe-sections">
                        {n.components.map((c) => {
                          const d = data.components.find((x) => x.id === c.componentId);
                          return (
                            <span key={c.id} className={`chip ${d?.category === 'Patterns' ? 'pattern' : ''}`}>
                              {d?.name}
                            </span>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  {n.insightIds.length ? (
                    <span className="muted hstack" style={{ gap: 3, fontSize: 12 }} title="Linked insights">
                      <Lightbulb size={12} aria-hidden /> {n.insightIds.length}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
            <ul className="describe-notes">
              {draft.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Dialog>
  );
}

/** Main path first (breadth-first from the start), alternative steps after the step they branch from. */
export function orderPages(j: Journey) {
  const start = j.nodes.find((n) => n.kind === 'start');
  const seen = new Set<string>();
  const out: typeof j.nodes = [];
  const visit = (id: string) => {
    const q = [id];
    while (q.length) {
      const cur = q.shift()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      const n = j.nodes.find((x) => x.id === cur);
      if (n) out.push(n);
      const outs = j.edges.filter((e) => e.source === cur).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'main' ? -1 : 1));
      for (const e of outs) q.push(e.target);
    }
  };
  if (start) visit(start.id);
  for (const n of j.nodes) if (!seen.has(n.id)) out.push(n);
  return out;
}
