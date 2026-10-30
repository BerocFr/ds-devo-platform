import {
  Background,
  BackgroundVariant,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useNodesInitialized,
  useReactFlow,
  useViewport,
  type Connection,
  type NodeChange,
} from '@xyflow/react';
import { ArrowLeft, Maximize, Minus, Play, Plus, Redo2, Settings2, ShieldCheck, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { navigate } from '../../app/router';
import { useValidation } from '../../app/useValidation';
import type { NodeKind } from '../../domain/types';
import { usePlatform } from '../../store/store';
import { relativeTime } from '../../ui/kit';
import { Inspector } from './Inspector';
import { LeftPanel } from './LeftPanel';
import { BLOCK_MIME, edgeTypes, nodeTypes, type JFlowEdge, type JFlowNode } from './nodes';
import { PreviewOverlay } from './PreviewOverlay';
import { PagesView } from './PagesView';
import { JourneySettingsDialog } from './JourneySettingsDialog';
import './builder.css';

export type Selection = { kind: 'node'; id: string; instanceId?: string } | { kind: 'edge'; id: string } | null;

export function JourneyBuilder(props: { journeyId: string; focusNodeId?: string }) {
  return (
    <ReactFlowProvider>
      <BuilderInner {...props} />
    </ReactFlowProvider>
  );
}

function BuilderInner({ journeyId, focusNodeId }: { journeyId: string; focusNodeId?: string }) {
  const journey = usePlatform((s) => s.data.journeys.find((j) => j.id === journeyId));
  const st = usePlatform();
  const report = useValidation(journey);
  const rf = useReactFlow();
  const { zoom } = useViewport();
  const [sel, setSel] = useState<Selection>(focusNodeId ? { kind: 'node', id: focusNodeId } : null);
  const [preview, setPreview] = useState<{ startNodeId?: string } | null>(null);
  const [settings, setSettings] = useState(false);
  const [rightTab, setRightTab] = useState<'journey' | 'checks'>('journey');
  const [view, setView] = useState<'canvas' | 'pages'>('canvas');
  const wrapRef = useRef<HTMLDivElement>(null);

  const issuesByNode = useMemo(() => {
    const m = new Map<string, { errors: number; warnings: number }>();
    for (const i of report?.issues ?? []) {
      if (!i.nodeId) continue;
      const e = m.get(i.nodeId) ?? { errors: 0, warnings: 0 };
      if (i.severity === 'error') e.errors++;
      if (i.severity === 'warning') e.warnings++;
      m.set(i.nodeId, e);
    }
    return m;
  }, [report]);

  const onDropComponent = useCallback(
    (nodeId: string, componentId: string) => {
      const iid = usePlatform.getState().addInstance(journeyId, nodeId, componentId);
      const def = usePlatform.getState().data.components.find((c) => c.id === componentId);
      if (iid) {
        setSel({ kind: 'node', id: nodeId, instanceId: iid });
        usePlatform.getState().toast(`${def?.name ?? 'Component'} added to the screen`);
      }
    },
    [journeyId],
  );

  const buildNodes = useCallback(
    (): JFlowNode[] =>
      (journey?.nodes ?? []).map((n) => ({
        id: n.id,
        type: n.kind,
        position: n.position,
        selected: sel?.kind === 'node' && sel.id === n.id,
        data: { node: n, errors: issuesByNode.get(n.id)?.errors ?? 0, warnings: issuesByNode.get(n.id)?.warnings ?? 0, onDropComponent },
        ariaLabel: `${n.kind} ${n.title}`,
      })),
    [journey?.nodes, sel, issuesByNode, onDropComponent],
  );

  const [nodes, setNodes] = useState<JFlowNode[]>(buildNodes);
  useEffect(() => setNodes(buildNodes()), [buildNodes]);

  const edges: JFlowEdge[] = useMemo(
    () =>
      (journey?.edges ?? []).map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'journey',
        selected: sel?.kind === 'edge' && sel.id === e.id,
        className: e.kind === 'alternative' ? 'alt' : '',
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        data: { edge: e, isLoop: e.source === e.target, onSelect: (id: string) => setSel({ kind: 'edge', id }) },
        ariaLabel: `Connection ${e.label}`,
      })),
    [journey?.edges, sel],
  );

  const onNodesChange = useCallback((changes: NodeChange<JFlowNode>[]) => {
    // Positions move locally while dragging; the store is updated once on drag stop (one undo step).
    setNodes((ns) => applyNodeChanges(changes.filter((c) => c.type === 'position' || c.type === 'dimensions'), ns));
  }, []);

  const onConnect = useCallback(
    (c: Connection) => {
      if (!journey || !c.source || !c.target) return;
      const src = journey.nodes.find((n) => n.id === c.source);
      const existing = journey.edges.filter((e) => e.source === c.source).length;
      const isDecision = src?.kind === 'decision';
      const id = st.addEdge(journeyId, {
        source: c.source,
        target: c.target,
        label: isDecision ? (existing === 0 ? 'Yes' : 'No') : 'Continue',
        kind: isDecision && existing > 0 ? 'alternative' : 'main',
        ...(isDecision ? { condition: '' } : {}),
      });
      if (id) {
        setSel({ kind: 'edge', id });
        st.toast(isDecision ? 'Branch added. Write its condition in the panel.' : 'Steps connected');
      } else st.toast('These steps are already connected', 'error');
    },
    [journey, journeyId, st],
  );

  const addBlock = useCallback(
    (kind: NodeKind, pos?: { x: number; y: number }) => {
      const el = wrapRef.current?.getBoundingClientRect();
      const center = pos ?? rf.screenToFlowPosition({ x: (el?.left ?? 0) + (el?.width ?? 800) / 2, y: (el?.top ?? 0) + (el?.height ?? 600) / 2 });
      const id = st.addNode(journeyId, kind, { x: Math.round(center.x - 100), y: Math.round(center.y - 40) });
      setSel({ kind: 'node', id });
    },
    [journeyId, rf, st],
  );

  const deleteSelection = useCallback(() => {
    if (!sel || !journey) return;
    if (sel.kind === 'node') {
      const n = journey.nodes.find((x) => x.id === sel.id);
      st.deleteNodes(journeyId, [sel.id]);
      st.toast(`"${n?.title}" deleted`, 'neutral', { label: 'Undo', run: () => usePlatform.getState().undo(journeyId) });
    } else {
      st.deleteEdges(journeyId, [sel.id]);
      st.toast('Connection deleted', 'neutral', { label: 'Undo', run: () => usePlatform.getState().undo(journeyId) });
    }
    setSel(null);
  }, [journey, journeyId, sel, st]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.closest('input, textarea, select, [contenteditable="true"]');
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        if (e.shiftKey) st.redo(journeyId);
        else st.undo(journeyId);
      } else if (mod && e.key.toLowerCase() === 'y' && !typing) {
        e.preventDefault();
        st.redo(journeyId);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && sel && !preview && !settings) {
        e.preventDefault();
        deleteSelection();
      } else if (e.key === 'Escape' && !preview && !settings && !typing) {
        setSel(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleteSelection, journeyId, preview, sel, settings, st]);

  useEffect(() => {
    if (focusNodeId) {
      setTimeout(() => {
        const n = rf.getNode(focusNodeId);
        if (n) rf.setCenter(n.position.x + 110, n.position.y + 120, { zoom: 1, duration: 300 });
      }, 60);
    }
  }, [focusNodeId, rf]);

  // The fitView prop can run before React Flow has measured the nodes (screens render a live
  // miniature), which leaves the view off the journey. Fit again once they are measured.
  const nodesReady = useNodesInitialized();
  const fitted = useRef(false);
  useEffect(() => {
    if (!nodesReady || fitted.current) return;
    fitted.current = true;
    requestAnimationFrame(() => rf.fitView({ padding: 0.08, minZoom: 0.55, maxZoom: 1, nodes: (journey?.nodes ?? []).slice(0, 4).map((n) => ({ id: n.id })) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesReady]);

  if (!journey) {
    return (
      <div className="page-body">
        <div className="empty">
          <strong>This journey does not exist any more.</strong>
          <span>It may have been deleted from another tab.</span>
          <a className="btn" href="#/journeys">
            Back to journeys
          </a>
        </div>
      </div>
    );
  }

  const focusNode = (nodeId: string) => {
    setSel({ kind: 'node', id: nodeId });
    const n = rf.getNode(nodeId);
    if (n) rf.setCenter(n.position.x + 110, n.position.y + 100, { zoom: Math.max(zoom, 0.9), duration: 300 });
  };

  const runValidation = () => {
    setSel(null);
    setRightTab('checks');
    const c = report!.counts;
    st.toast(
      report!.passes ? `Validation passed: ${c.warning} warning${c.warning === 1 ? '' : 's'}, ${c.info} note${c.info === 1 ? '' : 's'}` : `Validation found ${c.error} error${c.error === 1 ? '' : 's'} to fix`,
      report!.passes ? 'success' : 'error',
    );
  };

  const errors = report?.counts.error ?? 0;
  // Open on the beginning of the journey at a readable zoom rather than squeezing the whole flow.
  const initialFitNodes = journey.nodes.slice(0, 4).map((n) => ({ id: n.id }));
  const warnings = report?.counts.warning ?? 0;

  return (
    <div className="builder">
      <div className="toolbar" role="toolbar" aria-label="Journey tools">
        <button type="button" className="btn ghost icon" aria-label="Back to journeys" onClick={() => navigate({ name: 'journeys' })}>
          <ArrowLeft size={16} />
        </button>
        <label className="sr-only" htmlFor="jname">
          Journey name
        </label>
        <input id="jname" className="jname" value={journey.name} onChange={(e) => st.updateJourneyMeta(journeyId, { name: e.target.value })} size={Math.max(10, journey.name.length)} />
        <span className={`badge ${journey.status === 'validated' ? 'success' : journey.status === 'in-review' ? 'info' : ''}`}>{journey.status === 'in-review' ? 'In review' : journey.status === 'validated' ? 'Validated' : 'Draft'}</span>
        <span className="save-state" aria-live="polite">
          <span className={`save-dot ${st.saveStatus !== 'saved' ? 'unsaved' : ''}`} aria-hidden />
          {st.saveStatus === 'saved' ? `Saved ${relativeTime(st.lastSavedAt ?? journey.updatedAt)}` : st.saveStatus === 'saving' ? 'Saving' : 'Unsaved changes'}
        </span>
        <span className="grow" />
        <div className="seg view-switch" role="group" aria-label="View">
          <button type="button" aria-pressed={view === 'canvas'} onClick={() => setView('canvas')}>
            Canvas
          </button>
          <button type="button" aria-pressed={view === 'pages'} onClick={() => setView('pages')}>
            Pages
          </button>
        </div>
        <span className="sep" />
        <button type="button" className="btn ghost icon" aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!st.canUndo(journeyId)} onClick={() => st.undo(journeyId)}>
          <Undo2 size={16} />
        </button>
        <button type="button" className="btn ghost icon" aria-label="Redo" title="Redo (Ctrl+Shift+Z)" disabled={!st.canRedo(journeyId)} onClick={() => st.redo(journeyId)}>
          <Redo2 size={16} />
        </button>
        <span className="sep" />
        <button type="button" className="btn ghost icon" aria-label="Zoom out" disabled={view === 'pages'} onClick={() => rf.zoomOut({ duration: 150 })}>
          <Minus size={16} />
        </button>
        <span className="zoom-val" aria-live="off">
          {Math.round(zoom * 100)}%
        </span>
        <button type="button" className="btn ghost icon" aria-label="Zoom in" disabled={view === 'pages'} onClick={() => rf.zoomIn({ duration: 150 })}>
          <Plus size={16} />
        </button>
        <button type="button" className="btn ghost icon" aria-label="Fit journey to view" disabled={view === 'pages'} title="Fit to view" onClick={() => rf.fitView({ padding: 0.15, duration: 250 })}>
          <Maximize size={15} />
        </button>
        <span className="sep" />
        <button type="button" className="btn" onClick={runValidation}>
          <ShieldCheck size={16} aria-hidden />
          Validate
          {errors ? <span className="badge danger">{errors}<span className="sr-only"> errors</span></span> : warnings ? <span className="badge warning">{warnings}<span className="sr-only"> warnings</span></span> : <span className="badge success">OK</span>}
        </button>
        <button type="button" className="btn primary" onClick={() => setPreview({ startNodeId: sel?.kind === 'node' ? sel.id : undefined })}>
          <Play size={15} />
          Preview
        </button>
        <button type="button" className="btn ghost icon" aria-label="Journey settings" onClick={() => setSettings(true)}>
          <Settings2 size={16} />
        </button>
      </div>

      <div className="builder-body">
        <LeftPanel journey={journey} selection={sel} onAddBlock={addBlock} onAddComponent={(cid) => {
          if (sel?.kind === 'node') {
            const n = journey.nodes.find((x) => x.id === sel.id);
            if (n?.kind === 'screen') return onDropComponent(n.id, cid);
          }
          st.toast('Select a screen first, or drag the component onto one', 'error');
        }} onFocusNode={focusNode} />

        {view === 'pages' ? (
          <PagesView journey={journey} selection={sel} onSelect={setSel} onPreviewFrom={(id) => setPreview({ startNodeId: id })} />
        ) : (
        <div className="canvas" ref={wrapRef} aria-label="Journey canvas">
          <ReactFlow<JFlowNode, JFlowEdge>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onNodeDragStop={(_, __, dragged) => {
              const pos: Record<string, { x: number; y: number }> = {};
              for (const d of dragged) pos[d.id] = { x: Math.round(d.position.x), y: Math.round(d.position.y) };
              st.moveNodes(journeyId, pos);
            }}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSel({ kind: 'node', id: n.id })}
            onEdgeClick={(_, e) => setSel({ kind: 'edge', id: e.id })}
            onPaneClick={() => setSel(null)}
            onNodeDoubleClick={(_, n) => n.type === 'screen' && setPreview({ startNodeId: n.id })}
            deleteKeyCode={null}
            selectionKeyCode={null}
            multiSelectionKeyCode={null}
            fitView
            fitViewOptions={{ padding: 0.08, minZoom: 0.55, maxZoom: 1, nodes: initialFitNodes }}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes(BLOCK_MIME)) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }
            }}
            onDrop={(e) => {
              const kind = e.dataTransfer.getData(BLOCK_MIME) as NodeKind;
              if (!kind) return;
              e.preventDefault();
              addBlock(kind, rf.screenToFlowPosition({ x: e.clientX, y: e.clientY }));
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1.4} color="var(--c-canvas-dot)" />
            <MiniMap pannable zoomable ariaLabel="Journey overview map" nodeColor={(n) => (n.type === 'decision' ? '#e8b65c' : n.type === 'start' ? '#1b1f24' : n.type === 'outcome' ? '#6bbf98' : '#ffffff')} nodeStrokeColor="#9aa2ad" />
          </ReactFlow>
          <div className="legend" aria-hidden>
            <span>
              <i /> Main path
            </span>
            <span>
              <i className="alt" /> Alternative path
            </span>
          </div>
          {journey.nodes.length <= 2 && journey.edges.length === 0 ? (
            <div className="canvas-hint">Drag a Screen block from the left panel, then connect steps by dragging from the dot on the right of a step to the next one.</div>
          ) : null}
        </div>
        )}

        <Inspector
          journey={journey}
          selection={sel}
          onSelect={setSel}
          report={report!}
          tab={rightTab}
          onTab={setRightTab}
          onFocusNode={focusNode}
          onDeleteSelection={deleteSelection}
          onPreviewFrom={(id) => setPreview({ startNodeId: id })}
        />
      </div>

      {preview ? <PreviewOverlay journey={journey} startNodeId={preview.startNodeId} onClose={() => setPreview(null)} onEditNode={(id) => { setPreview(null); focusNode(id); }} /> : null}
      {settings ? <JourneySettingsDialog journey={journey} onClose={() => setSettings(false)} /> : null}
    </div>
  );
}
