import { Copy, Download, RotateCcw, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import type { PlatformData } from '../../domain/types';
import { usePlatform } from '../../store/store';
import { Dialog, TextField } from '../../ui/kit';

// In an embedded frame (for example a hosted preview) file downloads are blocked, so only copying is offered.
const framed = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

export function SettingsPage() {
  const st = usePlatform();
  const ws = usePlatform((s) => s.data.workspace);
  const [confirmReset, setConfirmReset] = useState(false);
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'system');
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(usePlatform.getState().data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `atelier-${ws.name.toLowerCase().replace(/\W+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    st.toast('Workspace exported');
  };

  const importJson = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as PlatformData;
      if (!data.workspace || !Array.isArray(data.tokens) || !Array.isArray(data.components) || !Array.isArray(data.journeys)) throw new Error('shape');
      usePlatform.setState({ data, history: {} });
      usePlatform.getState().saveNow();
      st.toast(`Workspace "${data.workspace.name}" imported`, 'success');
    } catch {
      st.toast('This file is not an Atelier workspace export. Choose a .json file exported from Settings.', 'error');
    }
  };

  return (
    <>
      <header className="page-head">
        <h1>Settings</h1>
      </header>
      <div className="page-body">
        <div className="stack" style={{ maxWidth: 720, gap: 20 }}>
          <section className="panel">
            <div className="panel-head">
              <h2>Workspace</h2>
            </div>
            <div className="panel-body stack">
              <TextField label="Company name" value={ws.name} onChange={(v) => st.updateWorkspace({ name: v })} />
              <TextField label="Industry" value={ws.industry} onChange={(v) => st.updateWorkspace({ industry: v })} />
              <div className="field">
                <span className="field-label">Interface theme</span>
                <div className="seg" role="group" aria-label="Interface theme">
                  {['system', 'light', 'dark'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={theme === t}
                      onClick={() => {
                        setTheme(t);
                        if (t === 'system') delete document.documentElement.dataset.theme;
                        else document.documentElement.dataset.theme = t;
                        try {
                          localStorage.setItem('atelier.theme', t);
                        } catch {
                          /* ignore */
                        }
                      }}
                    >
                      {t[0].toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
                <span className="hint">Applies to the platform only. Screens keep the company design system.</span>
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>Data</h2>
            </div>
            <div className="panel-body stack">
              <p style={{ fontSize: 13 }}>
                This prototype saves the workspace in this browser. Storage goes through a repository interface, so a server or a design-token pipeline can replace it without changing the screens.
              </p>
              <div className="hstack wrap">
                {framed ? null : (
                  <button type="button" className="btn" onClick={exportJson}>
                    <Download size={15} /> Export workspace (JSON)
                  </button>
                )}
                <button
                  type="button"
                  className="btn"
                  onClick={async () => {
                    const text = JSON.stringify(usePlatform.getState().data, null, 2);
                    try {
                      await navigator.clipboard.writeText(text);
                      st.toast('Workspace JSON copied to the clipboard');
                    } catch {
                      st.toast('Copying is blocked here. Use Export instead.', 'error');
                    }
                  }}
                >
                  <Copy size={15} /> Copy workspace JSON
                </button>
                <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
                  <Upload size={15} /> Import workspace
                </button>
                <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
                <button type="button" className="btn danger" onClick={() => setConfirmReset(true)}>
                  <RotateCcw size={15} /> Reset demo data
                </button>
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>Keyboard shortcuts</h2>
            </div>
            <div className="panel-body">
              <dl className="kv">
                <dt>Ctrl or Cmd + S</dt>
                <dd>Save now</dd>
                <dt>Ctrl or Cmd + Z</dt>
                <dd>Undo in the Journey Builder</dd>
                <dt>Ctrl or Cmd + Shift + Z</dt>
                <dd>Redo</dd>
                <dt>Delete</dt>
                <dd>Delete the selected step or connection</dd>
                <dt>Escape</dt>
                <dd>Clear the selection, close a dialog or the preview</dd>
                <dt>Double click a screen</dt>
                <dd>Preview from that screen</dd>
              </dl>
            </div>
          </section>
        </div>
      </div>
      {confirmReset ? (
        <Dialog
          title="Reset the demo data?"
          description="Every change you made in this browser is replaced by the Devoteam sample workspace."
          onClose={() => setConfirmReset(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setConfirmReset(false)} data-autofocus>
                Keep my changes
              </button>
              <button type="button" className="btn danger" onClick={() => { st.resetDemo(); setConfirmReset(false); st.toast('Demo data restored'); }}>
                Reset demo data
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
