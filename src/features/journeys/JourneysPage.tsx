import { Copy, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { href, navigate } from '../../app/router';
import { validateJourney } from '../../domain/validation';
import type { Journey } from '../../domain/types';
import { usePlatform } from '../../store/store';
import { Dialog, SelectField, TextField, relativeTime } from '../../ui/kit';
import { GenerateJourneyDialog } from './GenerateJourneyDialog';
import { plural } from '../overview/Overview';

export function JourneysPage() {
  const st = usePlatform();
  const { journeys, useCases, components, tokens } = usePlatform((s) => s.data);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | Journey['status']>('all');
  const [dialog, setDialog] = useState<'new' | 'generate' | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const reports = useMemo(() => new Map(journeys.map((j) => [j.id, validateJourney(j, components, tokens)])), [journeys, components, tokens]);
  const filtered = journeys.filter((j) => (status === 'all' || j.status === status) && (!q || j.name.toLowerCase().includes(q.toLowerCase())));
  const folders = [...new Set(filtered.map((j) => j.folder))].sort();

  return (
    <>
      <header className="page-head">
        <h1>Journeys</h1>
        <span className="grow" />
        <button type="button" className="btn" onClick={() => setDialog('new')}>
          <Plus size={15} /> New blank journey
        </button>
        <button type="button" className="btn primary" onClick={() => setDialog('generate')}>
          <Sparkles size={15} /> Generate from a use case
        </button>
      </header>
      <div className="page-body">
        <div className="hstack" style={{ marginBottom: 16, maxWidth: 720 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 9, top: 9, color: 'var(--c-ink-3)' }} aria-hidden />
            <input className="input" style={{ paddingLeft: 28 }} placeholder="Search journeys" aria-label="Search journeys" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="seg" role="group" aria-label="Status filter">
            {(['all', 'draft', 'in-review', 'validated'] as const).map((s) => (
              <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}>
                {s === 'all' ? 'All' : s === 'in-review' ? 'In review' : s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="empty" style={{ maxWidth: 720 }}>
            <strong>{journeys.length ? 'No journey matches these filters.' : 'No journey yet.'}</strong>
            <span>Generate one from a use case to start from your component library, or start from a blank canvas.</span>
            <button type="button" className="btn primary" onClick={() => setDialog('generate')}>
              <Sparkles size={15} /> Generate from a use case
            </button>
          </div>
        ) : null}
        <div className="stack" style={{ gap: 20 }}>
          {folders.map((f) => (
            <section key={f} className="panel" aria-labelledby={`f-${f}`}>
              <div className="panel-head">
                <h2 id={`f-${f}`}>{f}</h2>
                <span className="muted">{filtered.filter((j) => j.folder === f).length}</span>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Journey</th>
                    <th>Use case</th>
                    <th>Steps</th>
                    <th>Checks</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered
                    .filter((j) => j.folder === f)
                    .map((j) => {
                      const r = reports.get(j.id)!;
                      return (
                        <tr key={j.id}>
                          <td>
                            <a href={href({ name: 'journey', id: j.id })} style={{ fontWeight: 600, color: 'var(--c-ink)' }}>
                              {j.name}
                            </a>
                          </td>
                          <td className="muted">{useCases.find((u) => u.id === j.useCaseId)?.title ?? 'None'}</td>
                          <td>
                            {plural(j.nodes.filter((n) => n.kind === 'screen').length, 'screen')}, {plural(j.edges.filter((e) => e.kind === 'alternative').length, 'alternative path')}
                          </td>
                          <td>
                            {r.counts.error ? <span className="badge danger">{r.counts.error} errors</span> : r.counts.warning ? <span className="badge warning">{r.counts.warning} warnings</span> : <span className="badge success">Passes</span>}
                          </td>
                          <td>
                            <span className={`badge ${j.status === 'validated' ? 'success' : j.status === 'in-review' ? 'info' : ''}`}>{j.status === 'in-review' ? 'In review' : j.status === 'validated' ? 'Validated' : 'Draft'}</span>
                          </td>
                          <td className="muted">{relativeTime(j.updatedAt)}</td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button type="button" className="btn ghost icon sm" aria-label={`Duplicate ${j.name}`} onClick={() => { st.duplicateJourney(j.id); st.toast('Journey duplicated'); }}>
                              <Copy size={14} />
                            </button>
                            <button type="button" className="btn ghost icon sm danger" aria-label={`Delete ${j.name}`} onClick={() => setConfirm(j.id)}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      </div>
      {dialog === 'generate' ? <GenerateJourneyDialog onClose={() => setDialog(null)} /> : null}
      {dialog === 'new' ? <NewJourneyDialog onClose={() => setDialog(null)} /> : null}
      {confirm ? (
        <Dialog
          title="Delete this journey?"
          description={`"${journeys.find((j) => j.id === confirm)?.name}" and its screens will be removed. Components and insights stay in the library.`}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setConfirm(null)} data-autofocus>
                Keep journey
              </button>
              <button type="button" className="btn danger" onClick={() => { st.deleteJourney(confirm); st.toast('Journey deleted'); setConfirm(null); }}>
                Delete journey
              </button>
            </>
          }
        >
          <span />
        </Dialog>
      ) : null}
    </>
  );
}

export function NewJourneyDialog({ onClose, initialUseCaseId }: { onClose: () => void; initialUseCaseId?: string }) {
  const st = usePlatform();
  const useCases = usePlatform((s) => s.data.useCases);
  const [name, setName] = useState('');
  const [useCaseId, setUseCaseId] = useState(initialUseCaseId ?? useCases[0]?.id ?? '');
  const [folder, setFolder] = useState('Drafts');
  const [touched, setTouched] = useState(false);
  const submit = () => {
    setTouched(true);
    if (!name.trim()) return;
    const id = st.createJourney(name.trim(), useCaseId || null, folder.trim() || 'Drafts');
    st.toast('Journey created');
    onClose();
    navigate({ name: 'journey', id });
  };
  return (
    <Dialog
      title="New blank journey"
      description="Starts with an entry point and an outcome. You add screens and decisions on the canvas."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" onClick={submit}>
            Create journey
          </button>
        </>
      }
    >
      <form className="stack" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <TextField label="Name" value={name} onChange={setName} placeholder="for example: Book a discovery call" error={touched && !name.trim() ? 'Enter a name for the journey' : undefined} autoFocus />
        <SelectField label="Use case" value={useCaseId} onChange={setUseCaseId} options={[{ value: '', label: 'None' }, ...useCases.map((u) => ({ value: u.id, label: u.title }))]} hint="The use case gives the canvas its objective and insights." />
        <TextField label="Folder" value={folder} onChange={setFolder} />
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
