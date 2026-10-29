import { beforeEach, describe, expect, it } from 'vitest';
import { createSeed } from '../data/seed';
import { MemoryRepository } from './repository';
import { setRepository, usePlatform } from './store';

const J = 'jr-signup';
const get = () => usePlatform.getState();
const journey = () => get().data.journeys.find((j) => j.id === J)!;

beforeEach(() => {
  setRepository(new MemoryRepository());
  usePlatform.setState({ data: createSeed(), history: {}, toasts: [] });
});

describe('journey editing', () => {
  it('adds a screen, drops a component on it and connects it', () => {
    const id = get().addNode(J, 'screen', { x: 10, y: 10 });
    const inst = get().addInstance(J, id, 'cmp-button');
    expect(journey().nodes.find((n) => n.id === id)!.components[0].id).toBe(inst);
    const e = get().addEdge(J, { source: 'n-welcome', target: id, label: 'Continue', kind: 'main' });
    expect(e).toBeTruthy();
    expect(get().addEdge(J, { source: 'n-welcome', target: id, label: 'Again', kind: 'main' })).toBeNull();
  });

  it('undoes and redoes graph changes', () => {
    const before = journey().nodes.length;
    get().addNode(J, 'decision', { x: 0, y: 0 });
    expect(journey().nodes.length).toBe(before + 1);
    get().undo(J);
    expect(journey().nodes.length).toBe(before);
    get().redo(J);
    expect(journey().nodes.length).toBe(before + 1);
  });

  it('deleting a step removes its connections', () => {
    get().deleteNodes(J, ['n-verify']);
    expect(journey().edges.some((e) => e.source === 'n-verify' || e.target === 'n-verify')).toBe(false);
  });

  it('removing a trigger component keeps the connection but clears its trigger', () => {
    get().removeInstance(J, 'n-form', 'ci-form-submit');
    const e = journey().edges.find((x) => x.id === 'e-3')!;
    expect(e.triggerInstanceId).toBeUndefined();
  });

  it('links an insight and records a traced decision', () => {
    get().toggleNodeInsight(J, 'n-verify', 'in-expired');
    get().addDecision(J, 'n-verify', 'Offer a new code', ['in-expired']);
    const n = journey().nodes.find((x) => x.id === 'n-verify')!;
    expect(n.insightIds).toContain('in-expired');
    expect(n.decisions.at(-1)).toMatchObject({ text: 'Offer a new code', insightIds: ['in-expired'] });
  });
});

describe('library safety', () => {
  it('refuses to delete a token that components depend on', () => {
    const tok = get().data.tokens.find((t) => t.name === 'color.action.primary')!;
    const r = get().deleteToken(tok.id);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Button/);
  });

  it('renaming a token updates references and component dependencies', () => {
    const tok = get().data.tokens.find((t) => t.name === 'color.coral.500')!;
    get().updateToken(tok.id, { name: 'color.brand.coral' });
    expect(get().data.tokens.find((t) => t.name === 'color.action.accent')!.value).toBe('{color.brand.coral}');
  });

  it('refuses to delete a component used in a journey', () => {
    expect(get().deleteComponent('cmp-button').ok).toBe(false);
  });

  it('deleting an insight unlinks it from every step', () => {
    get().deleteInsight('in-long-form');
    expect(get().data.journeys.flatMap((j) => j.nodes).some((n) => n.insightIds.includes('in-long-form'))).toBe(false);
  });
});

describe('persistence', () => {
  it('saves through the repository', () => {
    const repo = new MemoryRepository();
    setRepository(repo);
    get().updateWorkspace({ name: 'Devoteam France' });
    get().saveNow();
    expect(repo.load()!.workspace.name).toBe('Devoteam France');
    expect(get().saveStatus).toBe('saved');
  });
});
