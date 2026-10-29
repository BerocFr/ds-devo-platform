import type { ComponentDef, DesignToken, Journey, JourneyNode } from './types';

export type Severity = 'error' | 'warning' | 'info';

export type IssueArea = 'Flow' | 'Design system' | 'Accessibility' | 'Content' | 'Traceability';

export interface ValidationIssue {
  id: string;
  code: string;
  severity: Severity;
  area: IssueArea;
  message: string;
  fix?: string;
  nodeId?: string;
  edgeId?: string;
  instanceId?: string;
}

export interface ValidationReport {
  issues: ValidationIssue[];
  counts: Record<Severity, number>;
  /** True when there is no error. Warnings do not block. */
  passes: boolean;
  checkedAt: string;
}

const VAGUE_LABELS = /^(submit|ok|okay|click here|here|go|send)$/i;

export function validateJourney(
  journey: Journey,
  components: ComponentDef[],
  tokens: DesignToken[],
  now: Date = new Date(),
): ValidationReport {
  const issues: ValidationIssue[] = [];
  let seq = 0;
  const add = (i: Omit<ValidationIssue, 'id'>) => issues.push({ ...i, id: `${i.code}-${++seq}` });

  const byId = new Map(journey.nodes.map((n) => [n.id, n]));
  const out = new Map<string, typeof journey.edges>();
  for (const e of journey.edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) {
      add({ code: 'J0', severity: 'error', area: 'Flow', message: `Connection "${e.label || e.id}" points to a step that no longer exists.`, fix: 'Delete the connection.', edgeId: e.id });
      continue;
    }
    out.set(e.source, [...(out.get(e.source) ?? []), e]);
  }

  // Flow structure
  const starts = journey.nodes.filter((n) => n.kind === 'start');
  if (starts.length === 0) add({ code: 'J1', severity: 'error', area: 'Flow', message: 'The journey has no entry point.', fix: 'Add a Start block from the left panel.' });
  if (starts.length > 1) add({ code: 'J1', severity: 'error', area: 'Flow', message: `The journey has ${starts.length} entry points; keep one.`, fix: 'Delete the extra Start blocks.', nodeId: starts[1].id });
  if (!journey.nodes.some((n) => n.kind === 'outcome')) add({ code: 'J2', severity: 'error', area: 'Flow', message: 'The journey has no outcome, so it never ends.', fix: 'Add an Outcome block and connect the last step to it.' });

  const reachable = new Set<string>();
  const queue = starts.map((s) => s.id);
  while (queue.length) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const e of out.get(id) ?? []) queue.push(e.target);
  }

  for (const node of journey.nodes) {
    const edges = out.get(node.id) ?? [];
    if (starts.length && !reachable.has(node.id)) {
      add({ code: 'J3', severity: 'warning', area: 'Flow', message: `"${node.title}" cannot be reached from the entry point.`, fix: 'Connect a previous step to it, or delete it.', nodeId: node.id });
    }
    if (node.kind !== 'outcome' && edges.length === 0) {
      add({ code: 'J4', severity: 'error', area: 'Flow', message: `"${node.title}" is a dead end: nothing leads out of it.`, fix: 'Drag from its right handle to the next step.', nodeId: node.id });
    }
    if (node.kind === 'outcome' && edges.length > 0) {
      add({ code: 'J6', severity: 'warning', area: 'Flow', message: `Outcome "${node.title}" has outgoing connections; outcomes end the journey.`, nodeId: node.id });
    }
    if (node.kind === 'decision') {
      if (edges.length < 2) add({ code: 'J5', severity: 'error', area: 'Flow', message: `Decision "${node.title}" needs at least two branches.`, fix: 'Add a second path, for example the error case.', nodeId: node.id });
      for (const e of edges) {
        if (!e.condition?.trim()) add({ code: 'J7', severity: 'warning', area: 'Flow', message: `Branch "${e.label || 'unnamed'}" from "${node.title}" has no condition.`, fix: 'Select the connection and write the rule.', edgeId: e.id, nodeId: node.id });
      }
    }
    if (node.kind === 'screen') validateScreen(node, edges, components, tokens, add);
  }

  for (const e of journey.edges) {
    if (!e.triggerInstanceId) continue;
    const src = byId.get(e.source);
    if (src && !src.components.some((c) => c.id === e.triggerInstanceId)) {
      add({ code: 'J8', severity: 'error', area: 'Flow', message: `Connection "${e.label}" is triggered by a component that was removed from "${src.title}".`, fix: 'Pick another trigger in the connection settings.', edgeId: e.id, nodeId: src.id });
    }
  }

  const counts = { error: 0, warning: 0, info: 0 } as Record<Severity, number>;
  for (const i of issues) counts[i.severity]++;
  return { issues, counts, passes: counts.error === 0, checkedAt: now.toISOString() };
}

function validateScreen(
  node: JourneyNode,
  edges: Journey['edges'],
  components: ComponentDef[],
  tokens: DesignToken[],
  add: (i: Omit<ValidationIssue, 'id'>) => void,
) {
  if (node.components.length === 0) {
    add({ code: 'S1', severity: 'error', area: 'Design system', message: `Screen "${node.title}" is empty.`, fix: 'Drag components from the library onto the screen.', nodeId: node.id });
  }
  let primaries = 0;
  let headings = 0;
  const todoTokens = new Set<string>();
  for (const inst of node.components) {
    const def = components.find((c) => c.id === inst.componentId);
    if (!def) {
      add({ code: 'S4', severity: 'error', area: 'Design system', message: `"${node.title}" uses a component that is not in the library.`, fix: 'Remove it or restore the component.', nodeId: node.id, instanceId: inst.id });
      continue;
    }
    if (!def.variants.some((v) => v.id === inst.variantId)) {
      add({ code: 'S4', severity: 'error', area: 'Design system', message: `${def.name} in "${node.title}" uses a variant that no longer exists.`, fix: 'Choose one of the library variants.', nodeId: node.id, instanceId: inst.id });
    }
    if (def.status === 'deprecated') add({ code: 'S5', severity: 'warning', area: 'Design system', message: `${def.name} in "${node.title}" is deprecated.`, fix: 'Replace it with the recommended component.', nodeId: node.id, instanceId: inst.id });
    for (const part of def.composedOf ?? []) {
      const pc = components.find((c) => c.id === part);
      if (!pc) add({ code: 'S10', severity: 'warning', area: 'Design system', message: `Pattern ${def.name} in "${node.title}" is built from a component that is no longer in the library.`, fix: 'Restore the component or update the pattern.', nodeId: node.id, instanceId: inst.id });
      else if (pc.status === 'deprecated') add({ code: 'S10', severity: 'warning', area: 'Design system', message: `Pattern ${def.name} in "${node.title}" is built from ${pc.name}, which is deprecated.`, fix: 'Update the pattern to the recommended component.', nodeId: node.id, instanceId: inst.id });
    }
    if (def.status === 'beta' && def.category !== 'Patterns') add({ code: 'S6', severity: 'info', area: 'Design system', message: `${def.name} in "${node.title}" is in beta; its API may change.`, nodeId: node.id, instanceId: inst.id });
    for (const tn of def.tokens) {
      const tok = tokens.find((t) => t.name === tn);
      if (!tok) {
        add({ code: 'S9', severity: 'error', area: 'Design system', message: `${def.name} depends on token ${tn}, which is missing from the design system.`, nodeId: node.id, instanceId: inst.id });
      } else if (chainHasTodo(tn, tokens)) todoTokens.add(tn);
    }
    if (def.kind === 'button' && inst.variantId === 'primary') primaries++;
    if (def.kind === 'heading' && inst.variantId === 'h1') headings++;

    const label = String(inst.props.label ?? inst.props.text ?? '').trim();
    if ((def.kind === 'button' || def.kind === 'link') && !label) {
      add({ code: 'A1', severity: 'error', area: 'Accessibility', message: `A ${def.name.toLowerCase()} in "${node.title}" has no label, so it has no accessible name.`, fix: 'Write a label that names the result.', nodeId: node.id, instanceId: inst.id });
    } else if ((def.kind === 'button' || def.kind === 'link') && VAGUE_LABELS.test(label)) {
      add({ code: 'C1', severity: 'warning', area: 'Content', message: `"${label}" in "${node.title}" does not say what happens.`, fix: 'Use a verb and an object, for example "Create account".', nodeId: node.id, instanceId: inst.id });
    }
    if ((def.kind === 'formField' || def.kind === 'checkbox' || def.kind === 'codeInput') && !String(inst.props.label ?? '').trim()) {
      add({ code: 'A2', severity: 'error', area: 'Accessibility', message: `A ${def.name.toLowerCase()} in "${node.title}" has no visible label.`, fix: 'Add a label; placeholders are not labels.', nodeId: node.id, instanceId: inst.id });
    }
    if (def.kind === 'progress') {
      const cur = Number(inst.props.current), tot = Number(inst.props.total);
      if (!(cur >= 1 && tot >= 1 && cur <= tot)) add({ code: 'C2', severity: 'error', area: 'Content', message: `Progress in "${node.title}" shows step ${cur} of ${tot}.`, fix: 'Current step must be between 1 and the total.', nodeId: node.id, instanceId: inst.id });
    }
    if (inst.interaction && (inst.interaction.kind === 'navigate' || inst.interaction.kind === 'submit') && !edges.some((e) => e.triggerInstanceId === inst.id)) {
      add({ code: 'J9', severity: 'warning', area: 'Flow', message: `"${label || def.name}" in "${node.title}" leads nowhere in the journey.`, fix: 'Connect it: select a connection and set this component as its trigger.', nodeId: node.id, instanceId: inst.id });
    }
  }
  if (primaries > 1) add({ code: 'S2', severity: 'warning', area: 'Design system', message: `"${node.title}" has ${primaries} primary buttons; the guideline is one per screen.`, fix: 'Switch the less important one to Secondary.', nodeId: node.id });
  const hasTitledSection = node.components.some((c) => {
    const d = components.find((x) => x.id === c.componentId);
    return c.componentId === 'cmp-confirmation' || d?.kind === 'hero' || d?.category === 'Patterns';
  });
  if (node.components.length > 0 && headings === 0 && !hasTitledSection) {
    add({ code: 'A3', severity: 'info', area: 'Accessibility', message: `"${node.title}" has no page title.`, fix: 'Add a Heading (Page title).', nodeId: node.id });
  }
  if (todoTokens.size) {
    add({ code: 'S7', severity: 'info', area: 'Design system', message: `"${node.title}" relies on ${todoTokens.size} placeholder value${todoTokens.size > 1 ? 's' : ''} not yet defined by the brand (${[...todoTokens].join(', ')}).`, nodeId: node.id });
  }
  if (node.insightIds.length === 0) {
    add({ code: 'T1', severity: 'warning', area: 'Traceability', message: `"${node.title}" is not linked to any insight.`, fix: 'Link the insight that justifies this step in the Insights tab.', nodeId: node.id });
  }
  for (const d of node.decisions) {
    if (d.insightIds.length === 0) add({ code: 'T2', severity: 'warning', area: 'Traceability', message: `Design decision "${d.text}" in "${node.title}" has no supporting insight.`, nodeId: node.id });
  }
}

function chainHasTodo(name: string, tokens: DesignToken[], seen = new Set<string>()): boolean {
  const t = tokens.find((x) => x.name === name);
  if (!t || seen.has(name)) return false;
  if (t.provenance === 'todo-brand') return true;
  seen.add(name);
  const m = t.value.match(/^\{([^}]+)\}$/);
  return m ? chainHasTodo(m[1], tokens, seen) : false;
}
