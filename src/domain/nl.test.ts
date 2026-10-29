import { describe, expect, it } from 'vitest';
import { createSeed } from '../data/seed';
import { planToJourney } from './claudePlanner';
import { generateJourney } from './generator';
import { planFromText, rankPatterns } from './nlPlanner';
import { validateJourney } from './validation';

let n = 0;
const makeId = (p: string) => `${p}-n${++n}`;
const data = createSeed();

const cases: [string, string][] = [
  ['Un candidat cherche un poste de data engineer au Portugal et postule avec son CV', 'job-application'],
  ['A CISO wants to talk to a cybersecurity expert', 'expert-contact'],
  ['Inscription à un webinar sur l’IA, avec le cas où l’événement est complet', 'event-registration'],
  ['A visitor downloads our AWS cloud whitepaper and reads it online', 'gated-download'],
  ['Un investisseur cherche le rapport annuel 2025', 'investor-docs'],
  ['A leader takes the AI maturity self-assessment and books a call', 'ai-assessment'],
  ['Trouver le bureau Devoteam le plus proche à Lyon', 'office-finder'],
  ['A prospect browses success stories filtered by industry', 'browse-cases'],
  ['A new client user creates an account on the portal', 'signup'],
];

describe('natural-language planner', () => {
  it.each(cases)('"%s" maps to %s', (text, pattern) => {
    expect(rankPatterns(text)[0].pattern.id).toBe(pattern);
  });

  it('extracts subject, partner, country and role, and reuses the matching use case', () => {
    const p = planFromText('Un candidat cherche un poste de data engineer au Portugal et postule avec son CV', data, makeId);
    expect(p.vars).toMatchObject({ topic: 'data', country: 'Portugal', role: 'Data Engineer' });
    expect(p.isNewUseCase).toBe(false);
    expect(p.useCase.id).toBe('uc-search-apply-job');
    expect(p.insightIds.length).toBeGreaterThan(0);
  });

  it('creates a new use case when none fits and honours "without errors"', () => {
    const p = planFromText('A partner manager registers for the AWS GenAI Day in Madrid, happy path only', data, makeId);
    expect(p.patternId).toBe('event-registration');
    expect(p.vars.partner).toBe('AWS');
    expect(p.vars.event).toBe('GenAI Day Madrid');
    expect(p.includeErrorPaths).toBe(false);
  });

  it('every drafted journey uses only library components and has no validation error', () => {
    for (const [text] of cases) {
      const p = planFromText(text, data, makeId);
      const r = generateJourney({ name: p.name, patternId: p.patternId, useCase: p.useCase, insights: data.insights.filter((i) => p.insightIds.includes(i.id)), includeErrorPaths: p.includeErrorPaths, vars: p.vars }, data.components, makeId);
      const ids = new Set(data.components.map((c) => c.id));
      expect(r.journey.nodes.flatMap((x) => x.components).every((c) => ids.has(c.componentId))).toBe(true);
      expect(validateJourney(r.journey, data.components, data.tokens).counts.error).toBe(0);
      expect(JSON.stringify(r.journey)).not.toMatch(/\{(topic|Topic|partner|country|role|event)\}/);
    }
  });
});

describe('Claude plan sanitising', () => {
  it('drops unknown components and links, maps triggers, adds missing start and lays out', () => {
    const r = planToJourney(
      {
        name: 'Postuler',
        useCase: { existingId: 'uc-search-apply-job' },
        pages: [
          { key: 'p1', kind: 'screen', title: 'Offres', sections: [{ key: 's1', componentId: 'pat-jobs', props: { title: 'Trouvez votre poste' } }, { componentId: 'cmp-does-not-exist' }], insightIds: ['in-site-9', 'in-fake'] },
          { key: 'p2', kind: 'decision', title: 'CV valide ?', question: 'Le CV est-il conforme ?' },
          { key: 'p3', kind: 'outcome', title: 'Candidature envoyée', tone: 'success' },
          { key: 'p4', kind: 'screen', title: 'Erreur', sections: [{ key: 'e1', componentId: 'cmp-button', props: { label: 'Renvoyer' } }] },
        ],
        links: [
          { from: 'p1', to: 'p2', label: 'Postuler', trigger: 's1', kind: 'main' },
          { from: 'p2', to: 'p3', label: 'Oui', condition: 'CV conforme', kind: 'main' },
          { from: 'p2', to: 'p4', label: 'Non', condition: 'CV refusé', kind: 'alternative' },
          { from: 'p4', to: 'p2', label: 'Renvoyer', trigger: 'e1', kind: 'alternative' },
          { from: 'p9', to: 'p1', label: 'ghost' },
        ],
      },
      data,
      makeId,
    );
    expect(r.isNewUseCase).toBe(false);
    expect(r.dropped.length).toBe(2);
    const start = r.journey.nodes.find((x) => x.kind === 'start');
    expect(start).toBeTruthy();
    const p1 = r.journey.nodes.find((x) => x.title === 'Offres')!;
    expect(p1.components).toHaveLength(1);
    expect(p1.insightIds).toEqual(['in-site-9']);
    expect(r.journey.edges.find((e) => e.label === 'Postuler')!.triggerInstanceId).toBe(p1.components[0].id);
    expect(p1.components[0].interaction?.kind).toBeTruthy();
    const err = r.journey.nodes.find((x) => x.title === 'Erreur')!;
    expect(err.position.y).toBeGreaterThan(p1.position.y);
    expect(validateJourney(r.journey, data.components, data.tokens).counts.error).toBe(0);
  });
});
