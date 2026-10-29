import { Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { navigate } from '../../app/router';
import { PATTERNS, generateJourney, insightTopics, suggestPattern } from '../../domain/generator';
import { validateJourney } from '../../domain/validation';
import { uid, usePlatform } from '../../store/store';
import { Dialog, SelectField, TextField } from '../../ui/kit';
import { plural } from '../overview/Overview';

export function GenerateJourneyDialog({ onClose, initialUseCaseId }: { onClose: () => void; initialUseCaseId?: string }) {
  const st = usePlatform();
  const { useCases, insights, components, tokens } = usePlatform((s) => s.data);
  const [useCaseId, setUseCaseId] = useState(initialUseCaseId ?? useCases[0]?.id ?? '');
  const uc = useCases.find((u) => u.id === useCaseId) ?? null;
  const [patternId, setPatternId] = useState(() => suggestPattern(uc).id);
  const [name, setName] = useState(() => (uc ? `${uc.title} (generated)` : 'Generated journey'));
  const [picked, setPicked] = useState<string[]>(() => insights.filter((i) => uc && i.useCaseIds.includes(uc.id)).map((i) => i.id));
  const [errorPaths, setErrorPaths] = useState(true);

  const onUseCase = (id: string) => {
    setUseCaseId(id);
    const u = useCases.find((x) => x.id === id) ?? null;
    setPatternId(suggestPattern(u).id);
    setName(u ? `${u.title} (generated)` : 'Generated journey');
    setPicked(insights.filter((i) => u && i.useCaseIds.includes(u.id)).map((i) => i.id));
  };

  const draft = useMemo(
    () => generateJourney({ name, patternId, useCase: uc, insights: insights.filter((i) => picked.includes(i.id)), includeErrorPaths: errorPaths }, components, uid),
    [name, patternId, uc, insights, picked, errorPaths, components],
  );
  const report = useMemo(() => validateJourney(draft.journey, components, tokens), [draft, components, tokens]);
  const pattern = PATTERNS.find((p) => p.id === patternId)!;
  const screens = draft.journey.nodes.filter((n) => n.kind === 'screen').length;
  const alts = draft.journey.edges.filter((e) => e.kind === 'alternative').length;

  return (
    <Dialog
      wide
      title="Generate a journey"
      description="Assembles a journey from your component library, following a pattern, and links the selected insights to the steps they concern. Everything stays editable."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!name.trim()}
            onClick={() => {
              st.importJourney(draft.journey, `Journey "${draft.journey.name}" generated from the ${pattern.name} pattern`);
              st.toast(`Journey generated: ${plural(screens, 'screen')}, ${plural(draft.usedComponentIds.length, 'library component')}`, 'success');
              onClose();
              navigate({ name: 'journey', id: draft.journey.id });
            }}
          >
            <Sparkles size={15} /> Generate journey
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="stack">
          <SelectField label="Use case" value={useCaseId} onChange={onUseCase} options={[{ value: '', label: 'None' }, ...useCases.map((u) => ({ value: u.id, label: u.title }))]} />
          <div className="field">
            <span className="field-label">Pattern</span>
            <div className="stack" style={{ gap: 6 }} role="radiogroup" aria-label="Pattern">
              {PATTERNS.map((p) => (
                <label key={p.id} className="panel" style={{ padding: '8px 10px', display: 'flex', gap: 8, cursor: 'pointer', borderColor: p.id === patternId ? 'var(--c-accent)' : undefined }}>
                  <input type="radio" name="pattern" checked={p.id === patternId} onChange={() => setPatternId(p.id)} style={{ marginTop: 3 }} />
                  <span>
                    <strong style={{ fontSize: 13 }}>{p.name}</strong>
                    {p.id === suggestPattern(uc).id && uc ? <span className="badge accent" style={{ marginLeft: 6 }}>Suggested</span> : null}
                    <br />
                    <span className="muted" style={{ fontSize: 12 }}>
                      {p.summary}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="stack">
          <TextField label="Journey name" value={name} onChange={setName} />
          <label className="check">
            <input type="checkbox" checked={errorPaths} onChange={(e) => setErrorPaths(e.target.checked)} />
            Include error and recovery paths
          </label>
          <div className="field">
            <span className="field-label">Insights to design for</span>
            <div className="stack" style={{ gap: 4, maxHeight: 180, overflow: 'auto', border: '1px solid var(--c-line)', borderRadius: 6, padding: 8 }}>
              {insights.map((i) => {
                const topics = insightTopics(i);
                return (
                  <label key={i.id} className="check" style={{ alignItems: 'flex-start' }}>
                    <input type="checkbox" checked={picked.includes(i.id)} onChange={() => setPicked(picked.includes(i.id) ? picked.filter((x) => x !== i.id) : [...picked, i.id])} style={{ marginTop: 3 }} />
                    <span style={{ fontSize: 13 }}>
                      {i.title}
                      {topics.length === 0 ? <span className="muted" style={{ fontSize: 11 }}> (no matching step, kept as context)</span> : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="panel" style={{ background: 'var(--c-sunken)' }}>
            <div className="panel-body stack" style={{ gap: 6, fontSize: 13 }}>
              <strong>What will be generated</strong>
              <span>
                {plural(screens, 'screen')}, {plural(draft.journey.nodes.filter((n) => n.kind === 'decision').length, 'decision')}, {plural(alts, 'alternative path')}
              </span>
              <span>{plural(draft.usedComponentIds.length, 'distinct library component')}, all from your design system</span>
              <span>
                {draft.linkedInsights.filter((l) => l.nodeTitles.length).length} of {plural(picked.length, 'insight')} linked to steps,{' '}
                {plural(draft.journey.nodes.reduce((a, n) => a + n.decisions.length, 0), 'design decision')} traced
              </span>
              {draft.skipped.length ? (
                <span className="badge warning" style={{ height: 'auto', whiteSpace: 'normal', padding: '4px 8px' }}>
                  {draft.skipped.length} component use skipped because the component is {draft.skipped[0].reason}.
                </span>
              ) : null}
              <span className={`badge ${report.passes ? 'success' : 'danger'}`} style={{ alignSelf: 'flex-start' }}>
                Validation: {plural(report.counts.error, 'error')}, {plural(report.counts.warning, 'warning')}
              </span>
              <span className="muted" style={{ fontSize: 12 }}>
                Basis: {pattern.basis}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
