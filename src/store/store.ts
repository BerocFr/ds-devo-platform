import { create } from 'zustand';
import { createSeed } from '../data/seed';
import type {
  ComponentDef,
  ComponentInstance,
  DesignDecision,
  DesignPrinciple,
  DesignToken,
  Insight,
  Journey,
  JourneyEdge,
  JourneyNode,
  NodeKind,
  PlatformData,
  UseCase,
  Workspace,
} from '../domain/types';
import { LocalStorageRepository, type PlatformRepository } from './repository';

export const uid = (prefix: string) =>
  `${prefix}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`;

export type SaveStatus = 'saved' | 'saving' | 'unsaved';

export interface Toast {
  id: string;
  text: string;
  tone: 'neutral' | 'success' | 'error';
  action?: { label: string; run: () => void };
}

interface History {
  past: Journey[];
  future: Journey[];
}

const HISTORY_LIMIT = 80;

export interface PlatformState {
  data: PlatformData;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  history: Record<string, History>;
  toasts: Toast[];

  // feedback
  toast: (text: string, tone?: Toast['tone'], action?: Toast['action']) => void;
  dismissToast: (id: string) => void;

  // persistence
  saveNow: () => void;
  resetDemo: () => void;

  // workspace + design system
  updateWorkspace: (patch: Partial<Workspace>) => void;
  addToken: (token: Omit<DesignToken, 'id'>) => string;
  updateToken: (id: string, patch: Partial<DesignToken>) => void;
  deleteToken: (id: string) => { ok: boolean; reason?: string };
  addPrinciple: (p: Omit<DesignPrinciple, 'id'>) => void;
  updatePrinciple: (id: string, patch: Partial<DesignPrinciple>) => void;
  deletePrinciple: (id: string) => void;

  // components
  addComponent: (c: Omit<ComponentDef, 'id'>) => string;
  updateComponent: (id: string, patch: Partial<ComponentDef>) => void;
  duplicateComponent: (id: string) => string | null;
  deleteComponent: (id: string) => { ok: boolean; reason?: string };

  // use cases + insights
  addUseCase: (u: Omit<UseCase, 'id'>) => string;
  updateUseCase: (id: string, patch: Partial<UseCase>) => void;
  deleteUseCase: (id: string) => void;
  addInsight: (i: Omit<Insight, 'id'>) => string;
  updateInsight: (id: string, patch: Partial<Insight>) => void;
  deleteInsight: (id: string) => void;

  // journeys
  createJourney: (name: string, useCaseId: string | null, folder?: string) => string;
  duplicateJourney: (id: string) => string | null;
  importJourney: (journey: Journey, note: string, newUseCase?: UseCase) => void;
  deleteJourney: (id: string) => void;
  updateJourneyMeta: (id: string, patch: Partial<Pick<Journey, 'name' | 'status' | 'folder' | 'useCaseId'>>) => void;

  // journey graph (undoable)
  addNode: (journeyId: string, kind: NodeKind, position: { x: number; y: number }, init?: Partial<JourneyNode>) => string;
  updateNode: (journeyId: string, nodeId: string, patch: Partial<JourneyNode>) => void;
  deleteNodes: (journeyId: string, nodeIds: string[]) => void;
  moveNodes: (journeyId: string, positions: Record<string, { x: number; y: number }>) => void;
  addEdge: (journeyId: string, edge: Omit<JourneyEdge, 'id'>) => string | null;
  updateEdge: (journeyId: string, edgeId: string, patch: Partial<JourneyEdge>) => void;
  deleteEdges: (journeyId: string, edgeIds: string[]) => void;
  addInstance: (journeyId: string, nodeId: string, componentId: string, index?: number) => string | null;
  updateInstance: (journeyId: string, nodeId: string, instanceId: string, patch: Partial<ComponentInstance>) => void;
  removeInstance: (journeyId: string, nodeId: string, instanceId: string) => void;
  moveInstance: (journeyId: string, nodeId: string, from: number, to: number) => void;
  toggleNodeInsight: (journeyId: string, nodeId: string, insightId: string) => void;
  addDecision: (journeyId: string, nodeId: string, text: string, insightIds: string[]) => void;
  updateDecision: (journeyId: string, nodeId: string, decisionId: string, patch: Partial<DesignDecision>) => void;
  removeDecision: (journeyId: string, nodeId: string, decisionId: string) => void;
  undo: (journeyId: string) => void;
  redo: (journeyId: string) => void;
  canUndo: (journeyId: string) => boolean;
  canRedo: (journeyId: string) => boolean;
}

let repository: PlatformRepository = new LocalStorageRepository();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function setRepository(r: PlatformRepository) {
  repository = r;
}

function initialData(): PlatformData {
  return repository.load() ?? createSeed();
}

const stamp = () => new Date().toISOString();

export const usePlatform = create<PlatformState>((set, get) => {
  const scheduleSave = () => {
    set({ saveStatus: 'unsaved' });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => get().saveNow(), 700);
  };

  const commit = (fn: (d: PlatformData) => PlatformData) => {
    set((s) => ({ data: fn(s.data) }));
    scheduleSave();
  };

  const log = (d: PlatformData, text: string, target?: PlatformData['activity'][number]['target']): PlatformData => ({
    ...d,
    activity: [{ id: uid('a'), at: stamp(), text, target }, ...d.activity].slice(0, 40),
  });

  /** Apply an undoable change to one journey. */
  const editJourney = (journeyId: string, fn: (j: Journey) => Journey) => {
    const s = get();
    const current = s.data.journeys.find((j) => j.id === journeyId);
    if (!current) return;
    const next = fn(current);
    if (next === current) return;
    const h = s.history[journeyId] ?? { past: [], future: [] };
    set({
      history: { ...s.history, [journeyId]: { past: [...h.past, current].slice(-HISTORY_LIMIT), future: [] } },
      data: { ...s.data, journeys: s.data.journeys.map((j) => (j.id === journeyId ? { ...next, updatedAt: stamp() } : j)) },
    });
    scheduleSave();
  };

  const mapNode = (j: Journey, nodeId: string, fn: (n: JourneyNode) => JourneyNode): Journey => ({
    ...j,
    nodes: j.nodes.map((n) => (n.id === nodeId ? fn(n) : n)),
  });

  return {
    data: initialData(),
    saveStatus: 'saved',
    lastSavedAt: null,
    history: {},
    toasts: [],

    toast: (text, tone = 'neutral', action) => {
      const id = uid('t');
      set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone, action }] }));
      setTimeout(() => get().dismissToast(id), action ? 7000 : 3600);
    },
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    saveNow: () => {
      if (saveTimer) clearTimeout(saveTimer);
      set({ saveStatus: 'saving' });
      repository.save(get().data);
      set({ saveStatus: 'saved', lastSavedAt: stamp() });
    },
    resetDemo: () => {
      repository.clear();
      set({ data: createSeed(), history: {}, saveStatus: 'saved', lastSavedAt: null });
      get().saveNow();
    },

    updateWorkspace: (patch) => commit((d) => ({ ...d, workspace: { ...d.workspace, ...patch } })),

    addToken: (token) => {
      const id = uid('tok');
      commit((d) => log({ ...d, tokens: [...d.tokens, { ...token, id }] }, `Token ${token.name} added`, { kind: 'token', id }));
      return id;
    },
    updateToken: (id, patch) =>
      commit((d) => {
        const old = d.tokens.find((t) => t.id === id);
        if (!old) return d;
        let tokens = d.tokens.map((t) => (t.id === id ? { ...t, ...patch } : t));
        let components = d.components;
        // Renaming a token updates references and component dependencies, so nothing breaks silently.
        if (patch.name && patch.name !== old.name) {
          tokens = tokens.map((t) => (t.value === `{${old.name}}` ? { ...t, value: `{${patch.name}}` } : t));
          components = components.map((c) => ({ ...c, tokens: c.tokens.map((n) => (n === old.name ? patch.name! : n)) }));
        }
        return { ...d, tokens, components };
      }),
    deleteToken: (id) => {
      const d = get().data;
      const tok = d.tokens.find((t) => t.id === id);
      if (!tok) return { ok: false, reason: 'Token not found.' };
      const refs = d.tokens.filter((t) => t.value === `{${tok.name}}`);
      const users = d.components.filter((c) => c.tokens.includes(tok.name));
      if (refs.length || users.length) {
        const parts = [
          refs.length ? `${refs.length} token${refs.length > 1 ? 's' : ''} (${refs.map((r) => r.name).join(', ')})` : '',
          users.length ? `${users.length} component${users.length > 1 ? 's' : ''} (${users.map((u) => u.name).join(', ')})` : '',
        ].filter(Boolean);
        return { ok: false, reason: `${tok.name} is used by ${parts.join(' and ')}. Update them first.` };
      }
      commit((x) => log({ ...x, tokens: x.tokens.filter((t) => t.id !== id) }, `Token ${tok.name} deleted`));
      return { ok: true };
    },
    addPrinciple: (p) => commit((d) => ({ ...d, principles: [...d.principles, { ...p, id: uid('pr') }] })),
    updatePrinciple: (id, patch) => commit((d) => ({ ...d, principles: d.principles.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
    deletePrinciple: (id) => commit((d) => ({ ...d, principles: d.principles.filter((p) => p.id !== id) })),

    addComponent: (c) => {
      const id = uid('cmp');
      commit((d) => log({ ...d, components: [...d.components, { ...c, id }] }, `Component "${c.name}" created`, { kind: 'component', id }));
      return id;
    },
    updateComponent: (id, patch) => commit((d) => ({ ...d, components: d.components.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
    duplicateComponent: (id) => {
      const src = get().data.components.find((c) => c.id === id);
      if (!src) return null;
      const nid = uid('cmp');
      commit((d) => log({ ...d, components: [...d.components, { ...structuredClone(src), id: nid, name: `${src.name} copy`, status: 'beta' }] }, `Component "${src.name}" duplicated`, { kind: 'component', id: nid }));
      return nid;
    },
    deleteComponent: (id) => {
      const d = get().data;
      const c = d.components.find((x) => x.id === id);
      if (!c) return { ok: false, reason: 'Component not found.' };
      const used = d.journeys.filter((j) => j.nodes.some((n) => n.components.some((i) => i.componentId === id)));
      if (used.length) return { ok: false, reason: `"${c.name}" is used in ${used.map((j) => `"${j.name}"`).join(', ')}. Mark it deprecated instead, or remove it from those screens.` };
      commit((x) => log({ ...x, components: x.components.filter((k) => k.id !== id) }, `Component "${c.name}" deleted`));
      return { ok: true };
    },

    addUseCase: (u) => {
      const id = uid('uc');
      commit((d) => log({ ...d, useCases: [...d.useCases, { ...u, id }] }, `Use case "${u.title}" added`, { kind: 'useCase', id }));
      return id;
    },
    updateUseCase: (id, patch) => commit((d) => ({ ...d, useCases: d.useCases.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
    deleteUseCase: (id) =>
      commit((d) => ({
        ...d,
        useCases: d.useCases.filter((u) => u.id !== id),
        insights: d.insights.map((i) => ({ ...i, useCaseIds: i.useCaseIds.filter((x) => x !== id) })),
        journeys: d.journeys.map((j) => (j.useCaseId === id ? { ...j, useCaseId: null } : j)),
      })),
    addInsight: (i) => {
      const id = uid('in');
      commit((d) => log({ ...d, insights: [...d.insights, { ...i, id }] }, `Insight "${i.title}" added`, { kind: 'insight', id }));
      return id;
    },
    updateInsight: (id, patch) => commit((d) => ({ ...d, insights: d.insights.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
    deleteInsight: (id) =>
      commit((d) => ({
        ...d,
        insights: d.insights.filter((i) => i.id !== id),
        journeys: d.journeys.map((j) => ({
          ...j,
          nodes: j.nodes.map((n) => ({
            ...n,
            insightIds: n.insightIds.filter((x) => x !== id),
            decisions: n.decisions.map((dd) => ({ ...dd, insightIds: dd.insightIds.filter((x) => x !== id) })),
          })),
        })),
      })),

    createJourney: (name, useCaseId, folder = 'Drafts') => {
      const id = uid('jr');
      const t = stamp();
      const journey: Journey = {
        id, name, useCaseId, status: 'draft', folder, createdAt: t, updatedAt: t,
        nodes: [
          { id: uid('n'), kind: 'start', title: 'Entry point', description: 'Where the person comes from.', position: { x: 0, y: 120 }, components: [], insightIds: [], decisions: [] },
          { id: uid('n'), kind: 'outcome', title: 'Goal reached', description: '', tone: 'success', position: { x: 640, y: 120 }, components: [], insightIds: [], decisions: [] },
        ],
        edges: [],
      };
      commit((d) => log({ ...d, journeys: [journey, ...d.journeys] }, `Journey "${name}" created`, { kind: 'journey', id }));
      return id;
    },
    duplicateJourney: (id) => {
      const src = get().data.journeys.find((j) => j.id === id);
      if (!src) return null;
      const nid = uid('jr');
      const t = stamp();
      const copy: Journey = { ...structuredClone(src), id: nid, name: `${src.name} (copy)`, status: 'draft', createdAt: t, updatedAt: t };
      commit((d) => log({ ...d, journeys: [copy, ...d.journeys] }, `Journey "${src.name}" duplicated`, { kind: 'journey', id: nid }));
      return nid;
    },
    importJourney: (journey, note, newUseCase) =>
      commit((d) => log({ ...d, useCases: newUseCase && !d.useCases.some((u) => u.id === newUseCase.id) ? [...d.useCases, newUseCase] : d.useCases, journeys: [journey, ...d.journeys] }, note, { kind: 'journey', id: journey.id })),
    deleteJourney: (id) =>
      commit((d) => {
        const j = d.journeys.find((x) => x.id === id);
        return log({ ...d, journeys: d.journeys.filter((x) => x.id !== id) }, `Journey "${j?.name ?? id}" deleted`);
      }),
    updateJourneyMeta: (id, patch) =>
      commit((d) => ({ ...d, journeys: d.journeys.map((j) => (j.id === id ? { ...j, ...patch, updatedAt: stamp() } : j)) })),

    addNode: (journeyId, kind, position, init) => {
      const id = uid('n');
      const defaults: Record<NodeKind, string> = { start: 'Entry point', screen: 'New screen', decision: 'New decision', outcome: 'Outcome' };
      editJourney(journeyId, (j) => ({
        ...j,
        nodes: [
          ...j.nodes,
          {
            id, kind, title: defaults[kind], description: '', position, components: [], insightIds: [], decisions: [],
            ...(kind === 'decision' ? { question: 'What is checked here?' } : {}),
            ...(kind === 'outcome' ? { tone: 'success' as const } : {}),
            ...init,
          },
        ],
      }));
      return id;
    },
    updateNode: (journeyId, nodeId, patch) => editJourney(journeyId, (j) => mapNode(j, nodeId, (n) => ({ ...n, ...patch }))),
    deleteNodes: (journeyId, nodeIds) =>
      editJourney(journeyId, (j) => ({
        ...j,
        nodes: j.nodes.filter((n) => !nodeIds.includes(n.id)),
        edges: j.edges.filter((e) => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)),
      })),
    moveNodes: (journeyId, positions) =>
      editJourney(journeyId, (j) => {
        const changed = j.nodes.some((n) => positions[n.id] && (positions[n.id].x !== n.position.x || positions[n.id].y !== n.position.y));
        if (!changed) return j;
        return { ...j, nodes: j.nodes.map((n) => (positions[n.id] ? { ...n, position: positions[n.id] } : n)) };
      }),
    addEdge: (journeyId, edge) => {
      const j = get().data.journeys.find((x) => x.id === journeyId);
      if (!j) return null;
      if (j.edges.some((e) => e.source === edge.source && e.target === edge.target && (e.triggerInstanceId ?? '') === (edge.triggerInstanceId ?? ''))) return null;
      const id = uid('e');
      editJourney(journeyId, (jj) => ({ ...jj, edges: [...jj.edges, { ...edge, id }] }));
      return id;
    },
    updateEdge: (journeyId, edgeId, patch) => editJourney(journeyId, (j) => ({ ...j, edges: j.edges.map((e) => (e.id === edgeId ? { ...e, ...patch } : e)) })),
    deleteEdges: (journeyId, edgeIds) => editJourney(journeyId, (j) => ({ ...j, edges: j.edges.filter((e) => !edgeIds.includes(e.id)) })),

    addInstance: (journeyId, nodeId, componentId, index) => {
      const def = get().data.components.find((c) => c.id === componentId);
      if (!def) return null;
      const id = uid('ci');
      const props: ComponentInstance['props'] = {};
      for (const p of def.props) props[p.name] = p.defaultValue;
      const inst: ComponentInstance = {
        id, componentId, variantId: def.variants[0]?.id ?? 'default', props,
        ...(def.interactions.some((k) => k !== 'none') ? { interaction: { kind: def.interactions[0] } } : {}),
      };
      editJourney(journeyId, (j) =>
        mapNode(j, nodeId, (n) => {
          const list = [...n.components];
          list.splice(index ?? list.length, 0, inst);
          return { ...n, components: list };
        }),
      );
      return id;
    },
    updateInstance: (journeyId, nodeId, instanceId, patch) =>
      editJourney(journeyId, (j) => mapNode(j, nodeId, (n) => ({ ...n, components: n.components.map((c) => (c.id === instanceId ? { ...c, ...patch, props: { ...c.props, ...(patch.props ?? {}) } } : c)) }))),
    removeInstance: (journeyId, nodeId, instanceId) =>
      editJourney(journeyId, (j) => ({
        ...mapNode(j, nodeId, (n) => ({ ...n, components: n.components.filter((c) => c.id !== instanceId) })),
        // Connections triggered by this component lose their trigger rather than being deleted.
        edges: j.edges.map((e) => (e.triggerInstanceId === instanceId ? { ...e, triggerInstanceId: undefined } : e)),
      })),
    moveInstance: (journeyId, nodeId, from, to) =>
      editJourney(journeyId, (j) =>
        mapNode(j, nodeId, (n) => {
          if (to < 0 || to >= n.components.length || from === to) return n;
          const list = [...n.components];
          const [it] = list.splice(from, 1);
          list.splice(to, 0, it);
          return { ...n, components: list };
        }),
      ),
    toggleNodeInsight: (journeyId, nodeId, insightId) =>
      editJourney(journeyId, (j) =>
        mapNode(j, nodeId, (n) => ({ ...n, insightIds: n.insightIds.includes(insightId) ? n.insightIds.filter((x) => x !== insightId) : [...n.insightIds, insightId] })),
      ),
    addDecision: (journeyId, nodeId, text, insightIds) =>
      editJourney(journeyId, (j) => mapNode(j, nodeId, (n) => ({ ...n, decisions: [...n.decisions, { id: uid('d'), text, insightIds }] }))),
    updateDecision: (journeyId, nodeId, decisionId, patch) =>
      editJourney(journeyId, (j) => mapNode(j, nodeId, (n) => ({ ...n, decisions: n.decisions.map((d) => (d.id === decisionId ? { ...d, ...patch } : d)) }))),
    removeDecision: (journeyId, nodeId, decisionId) =>
      editJourney(journeyId, (j) => mapNode(j, nodeId, (n) => ({ ...n, decisions: n.decisions.filter((d) => d.id !== decisionId) }))),

    undo: (journeyId) => {
      const s = get();
      const h = s.history[journeyId];
      const current = s.data.journeys.find((j) => j.id === journeyId);
      if (!h?.past.length || !current) return;
      const prev = h.past[h.past.length - 1];
      set({
        history: { ...s.history, [journeyId]: { past: h.past.slice(0, -1), future: [current, ...h.future] } },
        data: { ...s.data, journeys: s.data.journeys.map((j) => (j.id === journeyId ? prev : j)) },
      });
      scheduleSave();
    },
    redo: (journeyId) => {
      const s = get();
      const h = s.history[journeyId];
      const current = s.data.journeys.find((j) => j.id === journeyId);
      if (!h?.future.length || !current) return;
      const [next, ...rest] = h.future;
      set({
        history: { ...s.history, [journeyId]: { past: [...h.past, current], future: rest } },
        data: { ...s.data, journeys: s.data.journeys.map((j) => (j.id === journeyId ? next : j)) },
      });
      scheduleSave();
    },
    canUndo: (journeyId) => (get().history[journeyId]?.past.length ?? 0) > 0,
    canRedo: (journeyId) => (get().history[journeyId]?.future.length ?? 0) > 0,
  };
});
