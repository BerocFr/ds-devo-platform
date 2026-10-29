import { useState } from 'react';
import { navigate } from '../../app/router';
import type { Journey } from '../../domain/types';
import { usePlatform } from '../../store/store';
import { Dialog, SelectField, TextField } from '../../ui/kit';

export function JourneySettingsDialog({ journey, onClose }: { journey: Journey; onClose: () => void }) {
  const st = usePlatform();
  const useCases = usePlatform((s) => s.data.useCases);
  const [name, setName] = useState(journey.name);
  const [folder, setFolder] = useState(journey.folder);
  const [useCaseId, setUseCaseId] = useState(journey.useCaseId ?? '');
  const [status, setStatus] = useState(journey.status);
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <Dialog
      title="Journey settings"
      description="Name, folder, status and the use case this journey answers."
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const id = st.duplicateJourney(journey.id);
              onClose();
              if (id) {
                st.toast('Journey duplicated');
                navigate({ name: 'journey', id });
              }
            }}
          >
            Duplicate
          </button>
          <span className="grow" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!name.trim()}
            onClick={() => {
              st.updateJourneyMeta(journey.id, { name: name.trim(), folder: folder.trim() || 'Drafts', useCaseId: useCaseId || null, status });
              st.toast('Journey settings saved');
              onClose();
            }}
          >
            Save settings
          </button>
        </>
      }
    >
      <div className="stack">
        <TextField label="Name" value={name} onChange={setName} error={name.trim() ? undefined : 'Enter a name for the journey'} />
        <TextField label="Folder" value={folder} onChange={setFolder} hint="Journeys are grouped by folder in the list." />
        <SelectField label="Use case" value={useCaseId} onChange={setUseCaseId} options={[{ value: '', label: 'None' }, ...useCases.map((u) => ({ value: u.id, label: u.title }))]} />
        <SelectField label="Status" value={status} onChange={setStatus} options={[{ value: 'draft', label: 'Draft' }, { value: 'in-review', label: 'In review' }, { value: 'validated', label: 'Validated' }]} />
        <div className="panel" style={{ borderColor: 'var(--c-danger-soft)' }}>
          <div className="panel-body hstack">
            <span className="grow">
              <strong>Delete this journey</strong>
              <br />
              <span className="muted" style={{ fontSize: 12 }}>
                Components and insights stay in the library.
              </span>
            </span>
            {confirmDelete ? (
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  st.deleteJourney(journey.id);
                  st.toast(`"${journey.name}" deleted`);
                  onClose();
                  navigate({ name: 'journeys' });
                }}
              >
                Confirm delete
              </button>
            ) : (
              <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}>
                Delete journey
              </button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
