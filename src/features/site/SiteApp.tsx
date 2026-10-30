import { ArrowLeft, Eye, EyeOff, Info } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePlatform } from '../../store/store';
import { createSeed } from '../../data/seed';
import { DsScope, InstanceRender } from '../../ds/Renderer';
import { SAMPLE_NOTES, SITE_PAGES, findPage, siteLink, toInstances, type SitePage } from '../../data/devoteamSite';
import { PHOTOS } from '../../data/photos';
import type { ComponentDef } from '../../domain/types';
import './site.css';

// The devoteam.com rebuild, rendered from the live workspace: tokens and pattern definitions
// come from the store, so a token edited in the Design System shows here too. Each page is a
// list of pattern instances (src/data/devoteamSite.ts). Motion follows bench-03 and turns off
// entirely when the visitor asks for reduced motion.

const SEED_COMPONENTS = createSeed().components;

function useReducedMotion() {
  const q = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const [reduced, setReduced] = useState(() => q?.matches ?? true);
  useEffect(() => {
    if (!q) return;
    const on = () => setReduced(q.matches);
    q.addEventListener?.('change', on);
    return () => q.removeEventListener?.('change', on);
  }, [q]);
  return reduced;
}

/** Adds .is-in to [data-reveal] elements when they enter the view (once). */
function useReveal(root: React.RefObject<HTMLElement | null>, enabled: boolean, key: string) {
  useEffect(() => {
    const el = root.current;
    if (!el || !enabled) return;
    const targets = Array.from(el.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach((t) => t.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.01 },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [root, enabled, key]);
}

export function SiteApp({ pageId }: { pageId?: string }) {
  const tokens = usePlatform((s) => s.data.tokens);
  const stored = usePlatform((s) => s.data.components);
  const reduced = useReducedMotion();
  const [showPatterns, setShowPatterns] = useState(false);
  const [notice, setNotice] = useState('');
  const mainRef = useRef<HTMLElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  const page = findPage(pageId);
  const about = pageId === 'about-prototype';
  const current = page ?? findPage('home')!;

  const defs = useMemo(() => {
    const map = new Map<string, ComponentDef>();
    for (const c of SEED_COMPONENTS) map.set(c.id, c);
    for (const c of stored) map.set(c.id, c); // the workspace wins
    return map;
  }, [stored]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.title = about ? 'About this prototype: devoteam.com rebuild' : `${current.name}: devoteam.com rebuild`;
    if (first.current) {
      first.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
  }, [pageId, about, current.name]);

  useReveal(rootRef, !reduced, `${pageId ?? 'home'}-${showPatterns}`);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const instances = about ? [] : toInstances(current);
  const kindOf = (id: string) => defs.get(id)?.kind ?? '';
  const head = instances.filter((i) => kindOf(i.componentId) === 'pSiteHeader');
  const foot = instances.filter((i) => kindOf(i.componentId) === 'pSiteFooter');
  const body = instances.filter((i) => !head.includes(i) && !foot.includes(i));
  const chrome = toInstances(findPage('home')!);
  const shellHead = about ? chrome.filter((i) => kindOf(i.componentId) === 'pSiteHeader') : head;
  const shellFoot = about ? chrome.filter((i) => kindOf(i.componentId) === 'pSiteFooter') : foot;

  const ctx = {
    mode: 'interactive' as const,
    linkFor: siteLink,
    current: pageId || 'home',
    onAction: () => setNotice('This is a prototype: nothing was sent or saved.'),
  };

  const render = (list: typeof instances) =>
    list.map((inst) => {
      const def = defs.get(inst.componentId);
      if (!def) return null;
      return (
        <div key={inst.id} className="site-block ds-full" data-pattern={def.name}>
          {showPatterns ? (
            <a className="site-patterntag" href={`#/components/${def.id}`}>
              Pattern: {def.name}
            </a>
          ) : null}
          <InstanceRender def={def} inst={inst} ctx={ctx} />
        </div>
      );
    });

  return (
    <div ref={rootRef} className={`site-root ${reduced ? '' : 'motion-on'} ${showPatterns ? 'show-patterns' : ''}`}>
      <a href="#site-main" className="site-skip" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>
        Skip to content
      </a>
      <div className="site-proto" role="region" aria-label="Prototype notice">
        <span className="site-proto-text">
          <Info size={14} aria-hidden /> Prototype: devoteam.com rebuilt with the DS-Devo patterns. Not the official site.
        </span>
        <span className="site-proto-actions">
          <button type="button" aria-pressed={showPatterns} onClick={() => setShowPatterns(!showPatterns)}>
            {showPatterns ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />} {showPatterns ? 'Hide patterns' : 'Show patterns'}
          </button>
          <a href="#/site/about-prototype">About this prototype</a>
          <a href="#/overview">
            <ArrowLeft size={14} aria-hidden /> Atelier
          </a>
        </span>
      </div>
      <DsScope tokens={tokens} className="site-scope">
        <div className="ds-screen wide site-screen">
          {render(shellHead)}
          <main id="site-main" ref={mainRef} tabIndex={-1} className="site-main" key={pageId ?? 'home'}>
            {about ? <AboutPrototype defs={defs} /> : page ? render(body) : <NotFound />}
          </main>
          {render(shellFoot)}
        </div>
      </DsScope>
      <div className="site-notice" role="status" aria-live="polite">
        {notice ? <span>{notice}</span> : null}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <section className="ds-sec tone-light">
      <h1 className="ds-mega small">This page is not part of the prototype</h1>
      <p>
        <a className="ds-arrowlink" href="#/site">
          Go to the home page
        </a>
      </p>
    </section>
  );
}

function AboutPrototype({ defs }: { defs: Map<string, ComponentDef> }) {
  const rebuilt = SITE_PAGES.filter((p) => p.source);
  const others = SITE_PAGES.filter((p) => !p.source);
  const patternIds = [...new Set(SITE_PAGES.flatMap((p) => p.sections.map((s) => s.componentId)))];
  return (
    <div className="site-about">
      <section className="ds-sec tone-subtle">
        <span className="ds-kicker">About this prototype</span>
        <h1 className="ds-mega small">devoteam.com, rebuilt from patterns</h1>
        <p className="ds-lead">
          Every block of the live site became a pattern of the library, and every page here is a list of those patterns. The storytelling and the order of the live pages are kept; a UI pass fixes what the
          live pages leave open.
        </p>
        <ul className="site-facts">
          <li>
            <strong>{SITE_PAGES.length}</strong> pages
          </li>
          <li>
            <strong>{patternIds.length}</strong> patterns reused
          </li>
          <li>
            <strong>{PHOTOS.length}</strong> royalty-free photos (Pexels)
          </li>
          <li>
            Icons: <strong>Lucide</strong>
          </li>
        </ul>
      </section>

      <section className="ds-sec tone-light">
        <h2 className="ds-display">Pages rebuilt from the live site</h2>
        {rebuilt.map((p) => (
          <PageNotes key={p.id} page={p} defs={defs} />
        ))}
        <h2 className="ds-display">Pages added to close the journeys</h2>
        {others.map((p) => (
          <PageNotes key={p.id} page={p} defs={defs} compact />
        ))}
      </section>

      <section className="ds-sec tone-ink">
        <h2 className="ds-display">Identity: AI leader, same DNA</h2>
        <p className="ds-measure">
          From the owner&apos;s benchmark of 11 agency sites (DS-Devo bench-04): one neutral canvas with one accent, oversized type, numbered sections, results shown next to the work. Kept from the
          Devoteam DNA: coral, Montserrat, mint. Changed: a deep night canvas (#141414, proposed) for the hero, AI sections and footer; coral used as a signal on it (5.33:1), never as a surface; mint
          reserved for evidence; Montserrat 600 set large and tight on a fluid scale; a mono face for indexes and data; the signal lattice, a grid where coral pulses travel and some nodes light up in
          mint, as the AI motif. The lattice has a pause control and stays still under reduced motion.
        </p>
      </section>

      <section className="ds-sec tone-mint">
        <h2 className="ds-display">Motion</h2>
        <p className="ds-measure">
          From the benchmark of 26 agency sites seen on Awwwards (DS-Devo bench-03): scroll reveals that fade and rise 16px in 600ms, the page headline revealed word by word once, staggered grids (50ms,
          six items at most), photos revealed by a clip and a crossfade between pages. A moving partner row with a pause button exists in the library for campaign pages only; these corporate pages keep it static. Rejected: scroll-jacking, cursor followers, autoplay without
          pause. With reduced motion requested, nothing moves.
        </p>
      </section>

      <section className="ds-sec tone-light">
        <h2 className="ds-display">Sample content</h2>
        <ul className="ds-bullets">
          {SAMPLE_NOTES.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <h2 className="ds-h">Photo credits</h2>
        <p className="ds-muted ds-measure">Photos from Pexels, free to use. Loaded from the Pexels servers when the page is viewed; brand art replaces any photo that cannot load.</p>
        <ul className="site-credits">
          {PHOTOS.map((p) => (
            <li key={p.id}>
              <a href={p.page} target="_blank" rel="noopener noreferrer">
                {p.alt}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              {p.credit ? <span className="ds-muted"> by {p.credit}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function PageNotes({ page, defs, compact }: { page: SitePage; defs: Map<string, ComponentDef>; compact?: boolean }) {
  return (
    <article className="site-pagenote">
      <div className="ds-row space">
        <h3 className="ds-h">
          <a href={siteLink(page.id)}>{page.name}</a>
        </h3>
        {page.source ? (
          <a className="ds-muted" href={page.source} target="_blank" rel="noopener noreferrer">
            Live page<span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
      </div>
      {!compact ? (
        <ol className="site-sections">
          {page.sections.map((s, i) => {
            const d = defs.get(s.componentId);
            return (
              <li key={i}>
                <a href={`#/components/${s.componentId}`}>{d?.name ?? s.componentId}</a>
              </li>
            );
          })}
        </ol>
      ) : null}
      <ul className="site-changes">
        {page.changes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </article>
  );
}
