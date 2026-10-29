import type { ComponentDef, ComponentInstance, Insight, Journey, JourneyEdge, JourneyNode, NodeKind, UseCase } from './types';

// Model-backed planner: builds the prompt that asks Claude to compose a journey from THIS
// workspace's library, then turns the JSON answer into a valid Journey. Nothing from the answer
// is trusted as is: unknown components, variants, props, insights and links are dropped, keys
// are re-mapped to fresh ids, and the canvas layout is computed here.

export interface ClaudePlanJson {
  name?: string;
  useCase?: Partial<UseCase> & { existingId?: string | null };
  pages?: {
    key?: string;
    kind?: string;
    title?: string;
    description?: string;
    question?: string;
    tone?: string;
    sections?: { key?: string; componentId?: string; variantId?: string; props?: Record<string, unknown>; trigger?: string }[];
    insightIds?: string[];
    decisions?: { text?: string; insightIds?: string[] }[];
  }[];
  links?: { from?: string; to?: string; label?: string; condition?: string; kind?: string; trigger?: string }[];
}

export function buildClaudePrompt(request: string, data: { components: ComponentDef[]; useCases: UseCase[]; insights: Insight[] }): string {
  const lib = data.components
    .filter((c) => c.status !== 'deprecated')
    .map((c) => {
      const props = c.props.map((p) => `${p.name}${p.kind === 'select' ? `(${(p.options ?? []).join('|')})` : p.kind === 'number' ? '(number)' : ''}`).join(', ');
      const variants = c.variants.map((v) => v.id).join('|');
      const acts = c.interactions.filter((k) => k !== 'none');
      return `- ${c.id} [${c.category}] ${c.name}: ${c.description} variants: ${variants}. props: ${props || 'none'}.${acts.length ? ` can trigger: ${acts.join('|')}.` : ''}`;
    })
    .join('\n');
  const ucs = data.useCases.map((u) => `- ${u.id}: ${u.title}`).join('\n');
  const ins = data.insights.map((i) => `- ${i.id} (${i.kind}): ${i.title}`).join('\n');
  return `You design user journeys for the Devoteam website with its design system. Compose ONE journey for the request below, using ONLY components from the library.

REQUEST:
${request}

LIBRARY (id [category] name: purpose. variants. props):
${lib}

EXISTING USE CASES:
${ucs}

EXISTING INSIGHTS:
${ins}

RULES:
- Pages are full web pages: start most screens with cmp-site-header, then 1 to 4 sections. Prefer [Patterns] components for page sections; use atoms (cmp-confirmation, cmp-alert, cmp-form-field with variant inline-error, cmp-file, cmp-button) for confirmations and error screens.
- Exactly one page of kind "start" (an entry point, no sections) and at least one "outcome" (no sections, tone success|failure|neutral).
- Use "decision" pages (no sections, a "question") where the system checks something; each decision has at least two links, each with a "condition".
- Include error and recovery paths as links of kind "alternative", unless the request says not to.
- A link leaving a screen should name the section that triggers it with "trigger": the section "key" you give that section (add "key" inside the section object), and that section must be one that can trigger something.
- Copy: write all titles, labels and props in the language of the request, sentence case, no em dashes, buttons start with a verb and name the result ("Send my application"), errors say how to fix. Fill props with realistic, specific content for the request.
- Link each screen to the existing insight ids it addresses ("insightIds"), and add 0 to 2 design "decisions" per screen, each justified by insight ids. Never invent insight ids.
- Reuse an existing use case when it fits ("existingId"); otherwise describe a new one.
- 3 to 6 screens in total.

Reply with only this JSON:
{"name": "...", "useCase": {"existingId": "uc-... or null", "title": "...", "actor": "...", "goal": "...", "outcome": "...", "businessObjective": "...", "audience": "...", "context": "...", "metric": "Proposed: ..."},
 "pages": [{"key": "p1", "kind": "start|screen|decision|outcome", "title": "...", "description": "...", "question": "decision only", "tone": "outcome only", "sections": [{"key": "s1", "componentId": "...", "variantId": "...", "props": {}}], "insightIds": [], "decisions": [{"text": "...", "insightIds": []}]}],
 "links": [{"from": "p1", "to": "p2", "label": "...", "condition": "decision links only", "kind": "main|alternative", "trigger": "s1"}]}`;
}

const KINDS: NodeKind[] = ['start', 'screen', 'decision', 'outcome'];

export function planToJourney(
  raw: ClaudePlanJson,
  data: { components: ComponentDef[]; useCases: UseCase[]; insights: Insight[] },
  makeId: (p: string) => string,
  now = new Date(),
): { journey: Journey; useCase: UseCase; isNewUseCase: boolean; dropped: string[] } {
  const dropped: string[] = [];
  const insightIds = new Set(data.insights.map((i) => i.id));
  const okIns = (ids: unknown) => (Array.isArray(ids) ? ids.map(String).filter((i) => insightIds.has(i)) : []);
  const comp = new Map(data.components.filter((c) => c.status !== 'deprecated').map((c) => [c.id, c]));

  const existing = raw.useCase?.existingId ? data.useCases.find((u) => u.id === raw.useCase!.existingId) : undefined;
  const useCase: UseCase = existing ?? {
    id: makeId('uc'),
    title: String(raw.useCase?.title ?? raw.name ?? 'New use case').slice(0, 120),
    actor: String(raw.useCase?.actor ?? ''),
    goal: String(raw.useCase?.goal ?? ''),
    outcome: String(raw.useCase?.outcome ?? ''),
    businessObjective: String(raw.useCase?.businessObjective ?? ''),
    audience: String(raw.useCase?.audience ?? ''),
    context: String(raw.useCase?.context ?? ''),
    metric: String(raw.useCase?.metric ?? ''),
  };

  const keyToId = new Map<string, string>();
  const sectionKeyToInstance = new Map<string, string>();
  const nodes: JourneyNode[] = [];
  for (const [i, p] of (raw.pages ?? []).entries()) {
    const kind = KINDS.includes(p.kind as NodeKind) ? (p.kind as NodeKind) : 'screen';
    const id = makeId('n');
    keyToId.set(String(p.key ?? `p${i + 1}`), id);
    const components: ComponentInstance[] = [];
    if (kind === 'screen') {
      for (const [j, sct] of (p.sections ?? []).entries()) {
        const def = comp.get(String(sct.componentId));
        if (!def) {
          dropped.push(`Unknown component "${sct.componentId}" on "${p.title}"`);
          continue;
        }
        const iid = makeId('ci');
        const props: ComponentInstance['props'] = {};
        for (const pd of def.props) {
          const v = sct.props?.[pd.name];
          props[pd.name] = v == null ? pd.defaultValue : pd.kind === 'number' ? Number(v) || Number(pd.defaultValue) : pd.kind === 'boolean' ? Boolean(v) : String(v);
        }
        const variantId = def.variants.some((vv) => vv.id === sct.variantId) ? String(sct.variantId) : def.variants[0].id;
        const skey = String(sct.key ?? sct.trigger ?? `s${j + 1}`);
        sectionKeyToInstance.set(`${p.key}::${skey}`, iid);
        components.push({ id: iid, componentId: def.id, variantId, props });
      }
    }
    nodes.push({
      id,
      kind,
      title: String(p.title ?? (kind === 'start' ? 'Entry point' : 'Step')).slice(0, 80),
      description: String(p.description ?? ''),
      position: { x: 0, y: 0 },
      components,
      ...(kind === 'decision' ? { question: String(p.question ?? p.title ?? '') } : {}),
      ...(kind === 'outcome' ? { tone: (['success', 'failure', 'neutral'].includes(String(p.tone)) ? p.tone : 'success') as JourneyNode['tone'] } : {}),
      insightIds: okIns(p.insightIds),
      decisions: (p.decisions ?? [])
        .filter((d) => d.text)
        .map((d) => ({ id: makeId('d'), text: String(d.text), insightIds: okIns(d.insightIds) })),
    });
  }

  if (!nodes.some((n) => n.kind === 'start')) {
    const id = makeId('n');
    nodes.unshift({ id, kind: 'start', title: 'Entry point', description: '', position: { x: 0, y: 0 }, components: [], insightIds: [], decisions: [] });
    keyToId.set('__start', id);
  }
  if (!nodes.some((n) => n.kind === 'outcome')) {
    nodes.push({ id: makeId('n'), kind: 'outcome', title: 'Goal reached', description: '', tone: 'success', position: { x: 0, y: 0 }, components: [], insightIds: [], decisions: [] });
  }

  const edges: JourneyEdge[] = [];
  for (const l of raw.links ?? []) {
    const s = keyToId.get(String(l.from));
    const tg = keyToId.get(String(l.to));
    if (!s || !tg) {
      dropped.push(`Link "${l.label}" points to an unknown page`);
      continue;
    }
    const trig = l.trigger ? sectionKeyToInstance.get(`${l.from}::${l.trigger}`) : undefined;
    edges.push({ id: makeId('e'), source: s, target: tg, label: String(l.label ?? 'Continue').slice(0, 60), kind: l.kind === 'alternative' ? 'alternative' : 'main', ...(l.condition ? { condition: String(l.condition) } : {}), ...(trig ? { triggerInstanceId: trig } : {}) });
  }
  // Give triggering components an interaction that matches the component's abilities.
  for (const e of edges) {
    if (!e.triggerInstanceId) continue;
    for (const n of nodes) {
      const inst = n.components.find((c) => c.id === e.triggerInstanceId);
      if (!inst) continue;
      const def = comp.get(inst.componentId)!;
      const kindI = def.interactions.includes('submit') && /submit|send|envoy|valid|register|apply|subscri/i.test(e.label) ? 'submit' : def.interactions.find((k) => k !== 'none') ?? 'navigate';
      inst.interaction = { kind: kindI };
    }
  }
  // A start with no outgoing link leads to the first screen.
  const start = nodes.find((n) => n.kind === 'start')!;
  const firstScreen = nodes.find((n) => n.kind === 'screen');
  if (firstScreen && !edges.some((e) => e.source === start.id)) edges.unshift({ id: makeId('e'), source: start.id, target: firstScreen.id, label: 'Arrives', kind: 'main' });

  autoLayout(nodes, edges);
  const t = now.toISOString();
  const journey: Journey = { id: makeId('jr'), name: String(raw.name ?? useCase.title).slice(0, 100), useCaseId: useCase.id, status: 'draft', folder: 'Generated', nodes, edges, createdAt: t, updatedAt: t };
  return { journey, useCase, isNewUseCase: !existing, dropped };
}

/** Columns follow main-path depth from the start; alternative-only steps go to a lower lane. */
export function autoLayout(nodes: JourneyNode[], edges: JourneyEdge[]) {
  const start = nodes.find((n) => n.kind === 'start');
  const depth = new Map<string, number>();
  const lane = new Map<string, 'main' | 'alt'>();
  if (start) {
    depth.set(start.id, 0);
    lane.set(start.id, 'main');
    const q = [start.id];
    while (q.length) {
      const id = q.shift()!;
      for (const e of edges.filter((x) => x.source === id)) {
        if (depth.has(e.target)) continue;
        depth.set(e.target, depth.get(id)! + (e.kind === 'main' ? 1 : 0));
        lane.set(e.target, e.kind === 'main' && lane.get(id) === 'main' ? 'main' : 'alt');
        q.push(e.target);
      }
    }
  }
  const altStack = new Map<number, number>();
  let orphan = 0;
  for (const n of nodes) {
    const d = depth.get(n.id);
    if (d == null) {
      n.position = { x: orphan++ * 300, y: 900 };
      continue;
    }
    if (lane.get(n.id) === 'main') n.position = { x: d * 300, y: n.kind === 'screen' ? 40 : 120 };
    else {
      const k = altStack.get(d) ?? 0;
      altStack.set(d, k + 1);
      n.position = { x: d * 300, y: 380 + k * 300 };
    }
  }
}
