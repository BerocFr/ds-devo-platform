import { createSeed } from './seed';
import { SITE_PAGES, findPage, siteLink } from './devoteamSite';
import { PHOTOS, getPhoto } from './photos';
import { mergeSeed } from '../store/store';

const seed = createSeed();
const byId = new Map(seed.components.map((c) => [c.id, c]));

describe('devoteam.com rebuild', () => {
  it('is made of patterns only, each existing in the library with resolvable parts', () => {
    for (const page of SITE_PAGES) {
      for (const s of page.sections) {
        const def = byId.get(s.componentId);
        expect(def, `${page.id}: ${s.componentId}`).toBeDefined();
        expect(def!.category, `${page.id}: ${s.componentId}`).toBe('Patterns');
        for (const part of def!.composedOf ?? []) expect(byId.has(part), `${def!.id} part ${part}`).toBe(true);
        if (s.variantId) expect(def!.variants.map((v) => v.id)).toContain(s.variantId);
      }
    }
  });

  it('opens every page with the site header and closes it with the site footer', () => {
    for (const page of SITE_PAGES) {
      expect(page.sections[0].componentId, page.id).toBe('pat-site-header');
      expect(page.sections.at(-1)!.componentId, page.id).toBe('pat-site-footer');
    }
  });

  it('keeps the home storytelling of the live site in order', () => {
    const order = findPage('home')!.sections.map((s) => s.componentId);
    expect(order).toEqual(['pat-site-header', 'pat-hero-media', 'pat-impact', 'pat-intro', 'pat-feature-duo', 'pat-expertise', 'pat-partner-showcase', 'pat-case-teaser', 'pat-story-split', 'pat-logos', 'pat-closing', 'pat-site-footer']);
  });

  it('resolves every internal link key to a page', () => {
    const keys: string[] = [];
    for (const page of SITE_PAGES)
      for (const s of page.sections) {
        const p = s.props;
        for (const k of ['ctaTo', 'cta2To']) if (p[k]) keys.push(p[k]);
        // Field that holds the link, per pattern and prop.
        const LINK_FIELD: Record<string, Record<string, number>> = {
          'pat-site-header': { services: 1, items: 1 },
          'pat-page-hero': { crumbs: 1 },
          'pat-feature-duo': { items: 4 },
          'pat-case-teaser': { items: 4 },
          'pat-signposts': { items: 3 },
          'pat-partner-showcase': { items: 2 },
        };
        for (const [k, idx] of Object.entries(LINK_FIELD[s.componentId] ?? {}))
          for (const row of (p[k] ?? '').split(';')) {
            const link = row.split('|').map((x) => x.trim())[idx];
            if (link) keys.push(link);
          }
        if (s.componentId === 'pat-site-footer')
          for (const g of p.groups.split('||')) for (const l of g.split('|')[1].split(',')) keys.push(l.split('>')[1].trim());
        if (s.componentId === 'pat-expertise') for (const l of p.items.split(',')) keys.push(l.trim());
      }
    const broken = [...new Set(keys)].filter((k) => !siteLink(k));
    expect(broken).toEqual([]);
  });

  it('uses only photos that exist in the royalty-free set, each with alt text', () => {
    expect(PHOTOS.length).toBeGreaterThan(20);
    for (const p of PHOTOS) {
      expect(p.alt.length).toBeGreaterThan(8);
      expect(p.url).toMatch(/^https:\/\/images\.pexels\.com\/photos\/\d+\//);
    }
    const used = JSON.stringify(SITE_PAGES).match(/pexels-\d+/g) ?? [];
    for (const id of new Set(used)) expect(getPhoto(id), id).toBeDefined();
  });

  it('carries the bench-03 motion tokens as derived, never as brand', () => {
    const motion = seed.tokens.filter((t) => t.name.startsWith('motion.expressive.'));
    expect(motion.length).toBeGreaterThanOrEqual(6);
    for (const t of motion) expect(t.provenance).toBe('derived');
  });
});

describe('mergeSeed', () => {
  it('adds catalog items a saved workspace does not have, once, without overwriting', () => {
    const old = { ...seed, catalogVersion: undefined, components: seed.components.filter((c) => !c.id.startsWith('pat-site')).map((c) => (c.id === 'cmp-button' ? { ...c, name: 'My button' } : c)) };
    const merged = mergeSeed(old, seed);
    expect(merged.components.find((c) => c.id === 'pat-site-header')).toBeDefined();
    expect(merged.components.find((c) => c.id === 'cmp-button')!.name).toBe('My button');
    expect(merged.catalogVersion).toBe(seed.catalogVersion);
    const pruned = { ...merged, components: merged.components.filter((c) => c.id !== 'pat-site-header') };
    expect(mergeSeed(pruned, seed).components.find((c) => c.id === 'pat-site-header')).toBeUndefined();
  });
});
