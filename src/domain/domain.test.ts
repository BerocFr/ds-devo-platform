import { describe, expect, it } from 'vitest';
import { createSeed } from '../data/seed';
import { PATTERNS, generateJourney, insightTopics, suggestPattern } from './generator';
import { contrastRatio, dependents, isValidTokenValue, resolveToken, tokensToCssVars } from './tokens';
import { validateJourney } from './validation';

let n = 0;
const makeId = (p: string) => `${p}-t${++n}`;

describe('tokens', () => {
  const { tokens } = createSeed();

  it('resolves semantic tokens through references to brand values', () => {
    expect(resolveToken('color.action.accent', tokens)).toBe('#f8485e');
    expect(resolveToken('color.text.default', tokens)).toBe('#3c3c3a');
  });

  it('returns null for a circular or broken reference', () => {
    const broken = [...tokens, { id: 'x', name: 'a.b', type: 'color' as const, tier: 'semantic' as const, category: 'Color', value: '{a.b}', provenance: 'derived' as const }];
    expect(resolveToken('a.b', broken)).toBeNull();
    expect(resolveToken('does.not.exist', tokens)).toBeNull();
  });

  it('exposes every resolvable token as a CSS custom property', () => {
    const vars = tokensToCssVars(tokens);
    expect(vars['--ds-color-action-primary']).toBe('#ea0925');
    expect(Object.keys(vars)).toHaveLength(tokens.length);
  });

  it('computes WCAG contrast: brand coral fails AA with white text, the derived action color passes', () => {
    expect(contrastRatio('#ffffff', '#f8485e')!).toBeCloseTo(3.45, 2);
    expect(contrastRatio('#ffffff', resolveToken('color.action.primary', tokens)!)!).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#3c3c3a', '#ffffff')!).toBeCloseTo(11.06, 1);
  });

  it('validates token values by type', () => {
    expect(isValidTokenValue('color', '#fff')).toBe(true);
    expect(isValidTokenValue('color', 'red-ish')).toBe(false);
    expect(isValidTokenValue('duration', '200ms')).toBe(true);
    expect(isValidTokenValue('duration', 'fast')).toBe(false);
    expect(isValidTokenValue('dimension', '{space.md}')).toBe(true);
  });

  it('lists semantic dependents of a primitive', () => {
    expect(dependents('color.coral.500', tokens).map((t) => t.name)).toEqual(expect.arrayContaining(['color.action.accent', 'color.focus.ring']));
  });

  it('marks status colors as TODO-BRAND instead of inventing them', () => {
    expect(tokens.find((t) => t.name === 'color.status.error')?.provenance).toBe('todo-brand');
  });
});

describe('validation of the seeded registration journey', () => {
  const data = createSeed();
  const journey = data.journeys.find((j) => j.id === 'jr-signup')!;

  it('has no error and keeps the alternative paths', () => {
    const r = validateJourney(journey, data.components, data.tokens);
    expect(r.counts.error).toBe(0);
    expect(r.passes).toBe(true);
    expect(journey.edges.filter((e) => e.kind === 'alternative').length).toBeGreaterThanOrEqual(5);
  });

  it('flags a dead end, an empty screen and a missing variant', () => {
    const j = structuredClone(journey);
    j.nodes.push({ id: 'x', kind: 'screen', title: 'Orphan', description: '', position: { x: 0, y: 0 }, components: [], insightIds: [], decisions: [] });
    j.nodes.find((x) => x.id === 'n-welcome')!.components[0].variantId = 'nope';
    const codes = validateJourney(j, data.components, data.tokens).issues.map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(['J3', 'J4', 'S1', 'S4', 'T1']));
  });

  it('flags a decision with one branch, a vague button label and two primary buttons', () => {
    const j = structuredClone(journey);
    j.edges = j.edges.filter((e) => e.id !== 'e-5');
    const form = j.nodes.find((x) => x.id === 'n-form')!;
    form.components.find((c) => c.id === 'ci-form-submit')!.props.label = 'Submit';
    form.components.push({ id: 'extra', componentId: 'cmp-button', variantId: 'primary', props: { label: 'Save draft' } });
    const codes = validateJourney(j, data.components, data.tokens).issues.map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(['J5', 'C1', 'S2']));
  });

  it('warns when a deprecated component is used', () => {
    const j = structuredClone(journey);
    j.nodes.find((x) => x.id === 'n-welcome')!.components.unshift({ id: 'old', componentId: 'cmp-nav', variantId: 'default', props: { title: 'Devoteam' } });
    const issue = validateJourney(j, data.components, data.tokens).issues.find((i) => i.code === 'S5');
    expect(issue?.severity).toBe('warning');
  });

  it('flags a connection whose trigger component was removed', () => {
    const j = structuredClone(journey);
    j.nodes.find((x) => x.id === 'n-form')!.components = j.nodes.find((x) => x.id === 'n-form')!.components.filter((c) => c.id !== 'ci-form-submit');
    expect(validateJourney(j, data.components, data.tokens).issues.some((i) => i.code === 'J8')).toBe(true);
  });
});

describe('generator', () => {
  const data = createSeed();

  it('suggests a pattern from the use case wording', () => {
    expect(suggestPattern(data.useCases[0]).id).toBe('signup');
    expect(suggestPattern(data.useCases[1]).id).toBe('recover');
  });

  it('maps insights to topics', () => {
    expect(insightTopics(data.insights[0])).toContain('form-length');
    expect(insightTopics(data.insights.find((i) => i.id === 'in-expired')!)).toContain('expiry');
  });

  it.each(PATTERNS.map((p) => p.id))('pattern %s generates a journey with no validation error', (patternId) => {
    const r = generateJourney({ name: 'G', patternId, useCase: data.useCases[0], insights: data.insights, includeErrorPaths: true }, data.components, makeId);
    const report = validateJourney(r.journey, data.components, data.tokens);
    expect(report.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(r.journey.nodes.some((x) => x.kind === 'start')).toBe(true);
    expect(r.journey.nodes.some((x) => x.kind === 'outcome')).toBe(true);
  });

  it('uses only library components and skips deprecated ones', () => {
    const comps = data.components.map((c) => (c.id === 'cmp-site-header' ? { ...c, status: 'deprecated' as const } : c));
    const r = generateJourney({ name: 'G', patternId: 'expert-contact', useCase: null, insights: [], includeErrorPaths: true }, comps, makeId);
    const ids = new Set(comps.map((c) => c.id));
    expect(r.journey.nodes.flatMap((x) => x.components).every((i) => ids.has(i.componentId))).toBe(true);
    expect(r.skipped.length).toBeGreaterThan(0);
    expect(r.skipped.every((x) => x.componentId === 'cmp-site-header' && x.reason === 'deprecated in the library')).toBe(true);
  });

  it('traces design decisions only to selected insights', () => {
    const picked = data.insights.filter((i) => i.id === 'in-long-form');
    const r = generateJourney({ name: 'G', patternId: 'signup', useCase: data.useCases[0], insights: picked, includeErrorPaths: true }, data.components, makeId);
    const decisions = r.journey.nodes.flatMap((x) => x.decisions);
    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions.every((d) => d.insightIds.every((id) => id === 'in-long-form'))).toBe(true);
  });

  it('drops error-only steps when error paths are off', () => {
    const on = generateJourney({ name: 'G', patternId: 'signup', useCase: null, insights: [], includeErrorPaths: true }, data.components, makeId);
    const off = generateJourney({ name: 'G', patternId: 'signup', useCase: null, insights: [], includeErrorPaths: false }, data.components, makeId);
    expect(off.journey.nodes.length).toBeLessThan(on.journey.nodes.length);
    expect(off.journey.edges.every((e) => off.journey.nodes.some((x) => x.id === e.source) && off.journey.nodes.some((x) => x.id === e.target))).toBe(true);
  });
});
