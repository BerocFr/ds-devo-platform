import {
  BadgeCheck,
  BarChart3,
  BrainCircuit,
  Briefcase,
  Building2,
  ChevronDown,
  Cloud,
  Code2,
  Coins,
  Compass,
  CornerDownRight,
  Fingerprint,
  Globe,
  GraduationCap,
  KeyRound,
  Layers,
  Leaf,
  Link2,
  LockKeyhole,
  MapPin,
  MonitorSmartphone,
  Pause,
  Play,
  Radar,
  Search,
  Server,
  ShieldCheck,
  Siren,
  Sparkles,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { Fragment, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { ComponentDef, ComponentInstance } from '../domain/types';
import { getPhoto, photoUrl } from '../data/photos';
import { heroVisual } from '../data/heroVisuals';
import { SignalField } from './SignalField';
import './site-patterns.css';

// Patterns used to rebuild devoteam.com. Identity (bench-05, owner reference: the Rowalo Webflow
// template, over the bench-04 direction): light canvases with black sections, coral as the
// signal (the "+" of every label, icons, the cinematic duotone of heroes), Montserrat 500 set very
// large and tight, centred section heads, generous 24px cards that step down in a stagger, pill
// actions with a corner arrow, a duotone photo hero. Mint stays for evidence (figures).
// Content is carried by text props: rows separated by ";", fields by "|". Every pattern takes an
// optional `tone` prop (night, paper, mist, evidence) to change its canvas.
// Links are keys ("contact", "cybersecurity") that the host resolves with ctx.linkFor:
// on the site they become real links, in the platform they trigger the journey action.
// Motion hooks: elements carry data-reveal and --i (stagger index); the site host turns
// them on only when reduced motion is not requested. Nothing is hidden without the host.

export interface SiteCtx {
  mode: 'thumb' | 'preview' | 'interactive';
  onAction?: (id: string) => void;
  /** Resolves a link key to an href. Undefined: the element acts as a journey trigger. */
  linkFor?: (key: string) => string | undefined;
  /** Key of the page being shown, for aria-current in navigation. */
  current?: string;
}

const s = (v: unknown) => String(v ?? '').trim();
const rows = (v: unknown) =>
  s(v)
    .split(';')
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => r.split('|').map((x) => x.trim()));
const list = (v: unknown, sep = ',') =>
  s(v)
    .split(sep)
    .map((x) => x.trim())
    .filter(Boolean);
const pad = (n: number, w = 2) => String(n).padStart(w, '0');

const TONES = new Set(['night', 'paper', 'mist', 'evidence']);
const tone = (p: ComponentInstance['props'], fallback: string) => `t-${TONES.has(s(p.tone)) ? s(p.tone) : fallback}`;

const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  layers: Layers,
  code: Code2,
  server: Server,
  shield: ShieldCheck,
  chart: BarChart3,
  monitor: MonitorSmartphone,
  graduation: GraduationCap,
  compass: Compass,
  leaf: Leaf,
  coins: Coins,
  link: Link2,
  lock: LockKeyhole,
  cloud: Cloud,
  brain: BrainCircuit,
  users: Users,
  globe: Globe,
  briefcase: Briefcase,
  siren: Siren,
  fingerprint: Fingerprint,
  radar: Radar,
  key: KeyRound,
  building: Building2,
  workflow: Workflow,
};

/** Icon per service name. Lucide (DS-Devo D-M2), decorative. */
const SERVICE_ICON: [RegExp, string][] = [
  [/artificial|\bai\b/i, 'sparkles'],
  [/architecture/i, 'layers'],
  [/development|app/i, 'code'],
  [/managed/i, 'server'],
  [/cyber|security/i, 'shield'],
  [/data/i, 'chart'],
  [/workplace/i, 'monitor'],
  [/training/i, 'graduation'],
  [/strategy|consult/i, 'compass'],
  [/sustainab/i, 'leaf'],
  [/cloud/i, 'cloud'],
  [/service management|servicenow/i, 'workflow'],
];
const iconFor = (name: string) => ICONS[SERVICE_ICON.find(([re]) => re.test(name))?.[1] ?? 'sparkles'];

function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const C = ICONS[name] ?? Sparkles;
  return <C size={size} aria-hidden strokeWidth={1.5} />;
}

/** Photo from the royalty-free set; falls back to token-built art when it cannot load. */
export function Photo({ id, width = 1200, className = '', eager = false }: { id: string; width?: number; className?: string; eager?: boolean }) {
  const p = getPhoto(id);
  const [failed, setFailed] = useState(false);
  if (!p || failed) return <div className={`ds-photo is-fallback ${className}`} aria-hidden />;
  return (
    <div className={`ds-photo ${className}`}>
      <img src={photoUrl(p, width)} alt={p.alt} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />
    </div>
  );
}

function useLink(ctx: SiteCtx, inst: ComponentInstance) {
  return (to: string | undefined) => {
    const href = to ? ctx.linkFor?.(to) : undefined;
    return { href, external: !!href && /^https?:/.test(href), act: ctx.mode === 'interactive' ? () => ctx.onAction?.(inst.id) : undefined };
  };
}

/** A link on the site, a journey trigger in the platform. Same look either way. */
function L({ to, ctx, inst, className, children, label }: { to?: string; ctx: SiteCtx; inst: ComponentInstance; className?: string; children: ReactNode; label?: string }) {
  const { href, external, act } = useLink(ctx, inst)(to);
  if (href)
    return (
      <a className={className} href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} aria-label={label}>
        {children}
        {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
      </a>
    );
  return (
    <button type="button" className={className} tabIndex={ctx.mode === 'thumb' ? -1 : undefined} onClick={act} aria-label={label}>
      {children}
    </button>
  );
}

/** Section label: a coral plus and a short uppercase label. */
/** Animates the number inside a figure such as "2,400+" once it scrolls into view.
 *  Assistive tech reads the final value; reduced motion shows it at once. */
function CountUp({ value }: { value: string }) {
  const m = /^(\D*)([\d,.]+)(.*)$/.exec(value);
  const ref = useRef<HTMLSpanElement>(null);
  const target = m ? Number(m[2].replace(/,/g, '')) : 0;
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!m || !el || target < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') return;
    setShown(0);
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const t0 = performance.now();
        const tick = (t: number) => {
          const k = Math.min(1, (t - t0) / 1400);
          if (k < 1) {
            setShown(Math.round(target * (1 - Math.pow(1 - k, 3))));
            raf = requestAnimationFrame(tick);
          } else setShown(null);
        };
        raf = requestAnimationFrame(tick);
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  if (!m) return <>{value}</>;
  const digits = shown === null ? m[2] : shown.toLocaleString('en-US');
  return (
    <span ref={ref} className="ds-count">
      <span className="sr-only">{value}</span>
      <span aria-hidden="true">
        {m[1]}
        {digits}
        {m[3]}
      </span>
    </span>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="ds-plus">
      <span className="p" aria-hidden>
        +
      </span>
      {children}
    </span>
  );
}

/** Corner arrow placed before an action label. Decorative. */
function Go() {
  return (
    <span className="ds-go" aria-hidden>
      <CornerDownRight size={18} strokeWidth={2} />
    </span>
  );
}

/** Headline split into words for the once-per-page reveal; one accessible name. */
function RevealTitle({ text, as: Tag = 'h1', className = '' }: { text: string; as?: 'h1' | 'h2'; className?: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <Tag className={`${className} ds-wordreveal`} data-reveal="words" aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="w" aria-hidden>
            <span style={{ '--i': Math.min(i, 12) } as CSSProperties}>{w}</span>
          </span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Tag>
  );
}

const st = (i: number) => ({ '--i': Math.min(i, 6) }) as CSSProperties;

/** Centred head of a section: label, title, optional intro and action. */
function SecHead({ p, fallback, ctx, inst, align = 'center' }: { p: ComponentInstance['props']; fallback: string; ctx: SiteCtx; inst: ComponentInstance; align?: 'center' | 'start' }) {
  return (
    <div className={`ds-head ${align}`}>
      <Label>{s(p.kicker) || fallback}</Label>
      {s(p.title) ? (
        <h2 className={align === 'start' ? 'ds-dxl2' : 'ds-dm'} data-reveal>
          {s(p.title)}
        </h2>
      ) : null}
      {s(p.lead) ? (
        <p className="ds-lead2" data-reveal style={st(1)}>
          {s(p.lead)}
        </p>
      ) : null}
      {s(p.cta) && align === 'center' ? (
        <div data-reveal style={st(2)}>
          <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn2 primary">
            <Go /> {s(p.cta)}
          </L>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function renderSitePattern(def: ComponentDef, inst: ComponentInstance, ctx: SiteCtx): ReactNode | undefined {
  const p = inst.props;
  const ti = ctx.mode === 'thumb' ? -1 : undefined;
  const thumbW = ctx.mode === 'thumb' ? 480 : undefined;
  switch (def.kind) {
    case 'pSiteHeader':
      return <SiteHeader p={p} ctx={ctx} inst={inst} />;

    case 'pSiteFooter':
      return <SiteFooter p={p} ctx={ctx} inst={inst} />;

    case 'pHeroMedia':
      if (inst.variantId === 'lattice') return <HeroLattice p={p} ctx={ctx} inst={inst} />;
      return <HeroCinema p={p} ctx={ctx} inst={inst} thumbW={thumbW} />;

    case 'pPageHero': {
      const crumbs = rows(p.crumbs);
      return (
        <section className={`ds-sec2 t-night ds-cinema page`}>
          <Duotone image={s(p.image)} visual={s(p.visual) || 'fluted-2'} width={thumbW ?? 2000} />
          <div className="ds-cinema-in">
            {crumbs.length ? (
              <nav aria-label="Breadcrumb" className="ds-crumbs3">
                <ol>
                  {crumbs.map(([label, to], i) => (
                    <li key={label}>
                      {i < crumbs.length - 1 && to ? (
                        <L to={to} ctx={ctx} inst={inst} className="ds-crumb2">
                          {label}
                        </L>
                      ) : (
                        <span aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{label}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}
            {s(p.kicker) ? <Badge text={s(p.kicker)} /> : null}
            <RevealTitle text={s(p.title)} className="ds-dl" />
            {s(p.lead) ? (
              <p className="ds-lead2" data-reveal style={st(2)}>
                {s(p.lead)}
              </p>
            ) : null}
            {s(p.cta) ? (
              <div data-reveal style={st(3)}>
                <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn2 primary">
                  <Go /> {s(p.cta)}
                </L>
              </div>
            ) : null}
          </div>
        </section>
      );
    }

    case 'pFeatureDuo': {
      const items = rows(p.items);
      const mid = s(p.statement);
      return (
        <section className={`ds-sec2 ${tone(p, 'paper')}`}>
          <SecHead p={{ ...p, cta: '' }} fallback="Spotlight" ctx={ctx} inst={inst} />
          <div className={`ds-cards3 ${mid ? 'with-mid' : ''}`}>
            {items.map(([tag, title, body, image, to, linkLabel], i) => (
              <Fragment key={title}>
                {mid && i === 1 ? (
                  <div className="ds-midcard" data-reveal style={st(1)}>
                    <span className="ds-small">#{pad(1, 1)}</span>
                    <p className="ds-ds">{mid}</p>
                    {s(p.cta) ? (
                      <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn2 primary wide">
                        <Go /> {s(p.cta)}
                      </L>
                    ) : null}
                  </div>
                ) : null}
                <article className="ds-blogcard" data-reveal style={st(i)}>
                  <Photo id={image} width={thumbW ?? 1000} className="zoom" />
                  <div className="ds-blogcard-body">
                    {tag ? <span className="ds-small">{tag}</span> : null}
                    <h3 className="ds-cardtitle">{title}</h3>
                    {body ? <p className="ds-soft">{body}</p> : null}
                    <L to={to} ctx={ctx} inst={inst} className="ds-textlink">
                      <Go /> {linkLabel || `Read about ${title}`}
                    </L>
                  </div>
                </article>
              </Fragment>
            ))}
          </div>
        </section>
      );
    }

    case 'pExpertiseGrid': {
      const items = list(p.items);
      return (
        <section className={`ds-sec2 ${tone(p, 'night')}`}>
          <SecHead p={p} fallback="Expertise" ctx={ctx} inst={inst} />
          <ol className="ds-indexlist">
            {items.map((x, i) => {
              const I = iconFor(x);
              return (
                <li key={x} data-reveal style={st(i)}>
                  <L to={x} ctx={ctx} inst={inst} className="ds-indexrow">
                    <span className="ic" aria-hidden>
                      <I size={24} strokeWidth={1.5} />
                    </span>
                    <span className="t">{x}</span>
                    <span className="n" aria-hidden>
                      [{pad(i + 1)}]
                    </span>
                  </L>
                </li>
              );
            })}
          </ol>
        </section>
      );
    }

    case 'pPartnerShowcase':
      return (
        <section className={`ds-sec2 ${tone(p, 'mist')}`}>
          <SecHead p={p} fallback="Partners" ctx={ctx} inst={inst} />
          <div className="ds-stagger">
            {rows(p.items).map(([name, body, to], i) => (
              <L key={name} to={to} ctx={ctx} inst={inst} className="ds-stepcard">
                <span data-reveal style={st(i)} className="ds-stepcard-in">
                  <Label>Partner {pad(i + 1, 3)}</Label>
                  <span className="ds-wordmark3">{name}</span>
                  <span className="ds-soft">{body}</span>
                </span>
              </L>
            ))}
          </div>
        </section>
      );

    case 'pCaseTeaser':
      return (
        <section className={`ds-sec2 ${tone(p, 'paper')}`}>
          <SecHead p={{ ...p, cta: '' }} fallback="Success stories" ctx={ctx} inst={inst} align="start" />
          <div className="ds-projects">
            {rows(p.items).map(([tag, client, result, image, to], i) => (
              <article key={client} className="ds-project" data-reveal style={st(i)}>
                <div className="ds-project-text">
                  <h3 className="ds-project-title">
                    <span className="c">{client}.</span> {result}
                  </h3>
                  <L to={to || s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-textlink under">
                    <Go /> Read the story
                  </L>
                  <div className="ds-project-tags">
                    <span className="ds-chip">{tag}</span>
                    <span className="ds-chip">Success story</span>
                    <span className="ds-chip dark">2026</span>
                  </div>
                </div>
                <Photo id={image} width={thumbW ?? 1200} className="zoom" />
              </article>
            ))}
          </div>
          {s(p.cta) ? (
            <div>
              <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn2 primary">
                <Go /> {s(p.cta)}
              </L>
            </div>
          ) : null}
        </section>
      );

    case 'pStorySplit': {
      const figures = rows(p.figures);
      const imgs = list(p.images).length ? list(p.images) : [s(p.image)];
      return (
        <section className={`ds-sec2 ${tone(p, 'paper')} ds-about`}>
          <div className="ds-head center">
            {s(p.kicker) ? <Label>{s(p.kicker)}</Label> : null}
            <h2 className="ds-dm wide" data-reveal>
              {s(p.title)}
            </h2>
            {s(p.cta) ? (
              <div data-reveal style={st(1)}>
                <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn2 primary">
                  <Go /> {s(p.cta)}
                </L>
              </div>
            ) : null}
          </div>
          <div className="ds-collage" aria-hidden={imgs.length > 1 ? undefined : true}>
            {imgs.slice(0, 3).map((id, i) => (
              <div key={id + i} className={`ds-collage-${i}`} data-reveal style={st(i)}>
                <Photo id={id} width={thumbW ?? 900} />
              </div>
            ))}
          </div>
          <div className="ds-about-foot">
            {s(p.body) ? <p className="ds-lead2">{s(p.body)}</p> : <span />}
            {figures.length ? (
              <dl className="ds-evidence">
                {figures.map(([v, l], i) => (
                  <div key={l} data-reveal style={st(i)}>
                    <dt>{l}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </section>
      );
    }

    case 'pLogoBand':
      return <LogoBand p={p} marquee={inst.variantId === 'marquee'} ti={ti} />;

    case 'pClosingStatement':
      return (
        <section className={`ds-sec2 ${tone(p, 'paper')} ds-ctawall`}>
          <div className="ds-ctawall-tiles" aria-hidden>
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className={`tile t${i}`} />
            ))}
          </div>
          <div className="ds-ctacard t-night">
            <Duotone image={s(p.media) === 'photo' ? s(p.image) : ''} visual={s(p.media) === 'photo' ? undefined : s(p.visual) || 'fluted-6'} width={thumbW ?? 1600} />
            <div className="ds-ctacard-in">
              <Label>{s(p.kicker) || 'Where AI becomes impact'}</Label>
              <h2 className="ds-dm" data-reveal>
                {s(p.title)}
              </h2>
              {s(p.cta) ? (
                <div data-reveal style={st(1)}>
                  <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn2 primary">
                    <Go /> {s(p.cta)}
                  </L>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      );

    case 'pChallenges':
      return (
        <section className={`ds-sec2 ${tone(p, 'mist')}`}>
          <SecHead p={p} fallback="Challenges" ctx={ctx} inst={inst} />
          <div className="ds-stagger three">
            {rows(p.items).map(([icon, title, body], i) => (
              <article key={title} className="ds-stepcard static" data-reveal style={st(i)}>
                <span className="ds-stepcard-in">
                  <Label>Challenge {pad(i + 1, 3)}</Label>
                  <span className="ds-ds">{title}</span>
                  <span className="ds-bigicon" aria-hidden>
                    <Icon name={icon} size={56} />
                  </span>
                  <span className="ds-soft">{body}</span>
                </span>
              </article>
            ))}
          </div>
        </section>
      );

    case 'pFeatureRows':
      return (
        <section className={`ds-sec2 ${tone(p, 'night')}`}>
          {s(p.title) ? <SecHead p={p} fallback="Offer" ctx={ctx} inst={inst} /> : null}
          <div className="ds-servicerows">
            {rows(p.items).map(([kicker, title, body, bullets, partners, image], i) => (
              <article key={title} className="ds-servicerow">
                <div className="ds-servicerow-media" data-reveal="clip">
                  <Photo id={image} width={thumbW ?? 1000} />
                </div>
                <div className="ds-servicerow-main">
                  <span className="ds-servicerow-top">
                    <span className="ds-small">{kicker}</span>
                    <span className="n">[{pad(i + 1)}]</span>
                  </span>
                  <div className="ds-servicerow-text">
                    <h3 className="ds-ds" data-reveal>
                      {title}
                    </h3>
                    {body ? <p className="ds-soft">{body}</p> : null}
                    {list(partners).length ? (
                      <p className="ds-withpartners2">
                        {list(partners).map((x) => (
                          <span key={x} className="ds-chip">
                            {x}
                          </span>
                        ))}
                      </p>
                    ) : null}
                  </div>
                </div>
                {list(bullets).length ? (
                  <ul className="ds-pluslist">
                    {list(bullets).map((b, j) => (
                      <li key={b} data-reveal style={st(j)}>
                        <span className="p" aria-hidden>
                          +
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      );

    case 'pSpotlightBand': {
      const items = rows(p.items);
      return (
        <section className={`ds-sec2 ${tone(p, 'paper')}`}>
          <SecHead p={{ ...p, lead: s(p.subtitle), cta: '' }} fallback="Method" ctx={ctx} inst={inst} />
          {s(p.body) ? <p className="ds-lead2 center-text">{s(p.body)}</p> : null}
          {items.length ? (
            <ol className="ds-compare" aria-label={s(p.itemsLabel) || 'Steps'}>
              {items.map(([label, text], i) => (
                <li key={label} data-reveal style={st(i)}>
                  <BadgeCheck size={22} aria-hidden className="ok" />
                  <span className="b">
                    <strong>{label}</strong>
                    <span className="ds-soft">{text}</span>
                  </span>
                  <span className="n" aria-hidden>
                    {pad(i + 1)}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
          {s(p.cta) ? (
            <div className="center-row">
              <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn2 primary">
                <Go /> {s(p.cta)}
              </L>
            </div>
          ) : null}
        </section>
      );
    }

    case 'pImpactIntro': {
      const figs = rows(p.figures);
      const title = s(p.title);
      const accent = s(p.accent);
      const at = accent ? title.indexOf(accent) : -1;
      if (inst.variantId !== 'card')
        return (
          <section className={`ds-sec2 ${tone(p, 'paper')} ds-kpis`}>
            <div className="ds-kpis-label">
              <Label>{title}</Label>
            </div>
            <div className="ds-kpis-main">
              {s(p.body) ? (
                <p className="ds-kpis-statement" data-reveal>
                  {s(p.body)}
                </p>
              ) : null}
              <dl className="ds-kpis-grid">
                {figs.map(([v, bold, rest], i) => (
                  <div key={v + i} data-reveal style={st(i)}>
                    <dt>
                      {bold ? <strong>{bold}</strong> : null}
                      {bold && rest ? ' ' : null}
                      {rest}
                    </dt>
                    <dd><CountUp value={v} /></dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        );
      return (
        <section className={`ds-sec2 ${tone(p, 'mist')} ds-impact ${s(p.overlap) === 'no' ? '' : 'overlap'}`}>
          <dl className="ds-impact-card">
            {figs.map(([v, bold, rest], i) => (
              <div key={v + i} data-reveal style={st(i)}>
                <dt>
                  {bold ? <strong>{bold}</strong> : null}
                  {bold && rest ? ' ' : null}
                  {rest}
                </dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="ds-impact-intro">
            <h2 className="ds-dm" data-reveal>
              {at >= 0 ? (
                <>
                  {title.slice(0, at)}
                  <span className="accent">{accent}</span>
                  {title.slice(at + accent.length)}
                </>
              ) : (
                title
              )}
            </h2>
            {s(p.body) ? (
              <p className="ds-lead2" data-reveal style={st(1)}>
                {s(p.body)}
              </p>
            ) : null}
          </div>
        </section>
      );
    }

    case 'pIntroStatement':
      return (
        <section className={`ds-sec2 ${tone(p, 'paper')}`}>
          <div className="ds-head center">
            {s(p.kicker) ? <Label>{s(p.kicker)}</Label> : null}
            <p className="ds-dm wide" data-reveal>
              {s(p.lead)}
            </p>
            {s(p.body) ? (
              <p className="ds-lead2" data-reveal style={st(1)}>
                {s(p.body)}
              </p>
            ) : null}
          </div>
        </section>
      );

    case 'pSignposts':
      return (
        <section className={`ds-sec2 ${tone(p, 'mist')}`}>
          {s(p.title) ? <SecHead p={p} fallback="Next" ctx={ctx} inst={inst} /> : null}
          <div className="ds-signposts3">
            {rows(p.items).map(([title, body, cta, to, image], i) => (
              <article key={title} className="ds-blogcard" data-reveal style={st(i)}>
                {image ? <Photo id={image} width={thumbW ?? 1000} className="zoom" /> : null}
                <div className="ds-blogcard-body">
                  <h3 className="ds-cardtitle">{title}</h3>
                  {body ? <p className="ds-soft">{body}</p> : null}
                  <L to={to} ctx={ctx} inst={inst} className="ds-btn2 primary">
                    <Go /> {cta}
                  </L>
                </div>
              </article>
            ))}
          </div>
        </section>
      );

    case 'pStatsBand': {
      const items = s(p.items).includes('|')
        ? rows(p.items)
        : s(p.items)
            .split(';')
            .map((x) => x.split(':').map((y) => y.trim()))
            .filter((x) => x[0]);
      return (
        <section className={`ds-sec2 ${tone(p, 'paper')}`}>
          <SecHead p={p} fallback="In figures" ctx={ctx} inst={inst} />
          <dl className="ds-evidence big">
            {items.map(([v, l], i) => (
              <div key={`${v}${l}`} data-reveal style={st(i)}>
                <dt>{l}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      );
    }

    case 'pExpertTeam': {
      const people = s(p.names)
        .split(';')
        .map((x) => x.split(':').map((y) => y.trim()))
        .filter((x) => x[0]);
      return (
        <section className={`ds-sec2 ${tone(p, 'mist')}`}>
          <SecHead p={p} fallback="People" ctx={ctx} inst={inst} />
          <ul className="ds-people3">
            {people.map(([nm, role], i) => {
              const first = nm.split(' ')[0];
              return (
                <li key={nm} className="ds-personcard" data-reveal style={st(i)}>
                  <span className="ds-avatar3" aria-hidden>
                    {nm
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase()}
                  </span>
                  <strong className="ds-cardtitle">{nm}</strong>
                  <span className="ds-soft">{role}</span>
                  <L to={s(p.ctaTo) || 'contact'} ctx={ctx} inst={inst} className="ds-textlink under">
                    <Go /> Contact {first}
                  </L>
                </li>
              );
            })}
          </ul>
        </section>
      );
    }

    case 'pOfficeDirectory':
      return <OfficeDirectory p={p} ti={ti} ctx={ctx} />;

    default:
      return undefined;
  }
}

/* ------------------------------------------------------------------ */

/** Hero background: a generated fluted-glass visual (default), or a stock photo in duotone. */
function Duotone({ image, width, visual }: { image: string; width: number; visual?: string }) {
  const src = heroVisual(visual || (image ? undefined : 'fluted-1'), width < 900);
  return (
    <div className={`ds-duotone ${src ? 'has-visual' : ''}`} aria-hidden>
      {src ? <img className="ds-visual" src={src} alt="" loading="eager" decoding="async" /> : image ? <Photo id={image} width={width} eager /> : null}
      <span className="glow" />
    </div>
  );
}

/** Hero badge: a signal dot in a soft halo, the line, and a hairline gradient border. */
function Badge({ text }: { text: string }) {
  return (
    <span className="ds-badge2" data-reveal>
      <span className="sig" aria-hidden>
        <span />
      </span>
      {text}
    </span>
  );
}

function HeroCinema({ p, ctx, inst, thumbW }: { p: ComponentInstance['props']; ctx: SiteCtx; inst: ComponentInstance; thumbW?: number }) {
  const people = list(p.proofPeople).length ? list(p.proofPeople) : ['pexels-27086922', 'pexels-37148308', 'pexels-12396627'];
  return (
    <section className={`ds-sec2 t-night ds-cinema home`}>
      <Duotone image={s(p.image)} visual={s(p.visual) || 'fluted-1'} width={thumbW ?? 2200} />
      <div className="ds-cinema-grid">
        <div className="ds-cinema-in">
          {s(p.kicker) ? <Badge text={s(p.kicker)} /> : null}
          <RevealTitle text={s(p.title)} className="ds-dxl" />
          {s(p.lead) ? (
            <p className="ds-lead2" data-reveal style={st(3)}>
              {s(p.lead)}
            </p>
          ) : null}
          <div className="ds-cinema-actions" data-reveal style={st(4)}>
            <span className="ds-row2">
              {s(p.cta) ? (
                <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn2 primary">
                  <Go /> {s(p.cta)}
                </L>
              ) : null}
              {s(p.cta2) ? (
                <L to={s(p.cta2To)} ctx={ctx} inst={inst} className="ds-btn2 ghost">
                  {s(p.cta2)}
                </L>
              ) : null}
            </span>
            {s(p.proof) ? (
              <span className="ds-proof">
                <span className="faces" aria-hidden>
                  {people.slice(0, 3).map((id) => (
                    <Photo key={id} id={id} width={120} className="face" />
                  ))}
                </span>
                {s(p.proof)}
              </span>
            ) : null}
          </div>
        </div>
        {s(p.cardTitle) ? (
          <L to={s(p.cardTo)} ctx={ctx} inst={inst} className="ds-heroCard">
            <span data-reveal style={st(5)} className="ds-heroCard-in">
              <Photo id={s(p.cardImage)} width={thumbW ?? 800} className="zoom" />
              <span className="ds-heroCard-label">
                <span className="k">
                  <span className="dot" aria-hidden />
                  {s(p.cardKicker) || 'Featured story'}
                </span>
                <span className="t">{s(p.cardTitle)}</span>
                <span className="go" aria-hidden>
                  <CornerDownRight size={18} />
                </span>
              </span>
            </span>
          </L>
        ) : null}
      </div>
    </section>
  );
}

/** Earlier "signal lattice" hero, kept as a variant (owner decision OD-I2 pending). */
function HeroLattice({ p, ctx, inst }: { p: ComponentInstance['props']; ctx: SiteCtx; inst: ComponentInstance }) {
  const [paused, setPaused] = useState(false);
  return (
    <section className={`ds-sec2 t-night ds-cinema home lattice`}>
      <SignalField paused={paused} still={ctx.mode !== 'interactive'} />
      <div className="ds-cinema-in">
        {s(p.kicker) ? <span className="ds-glasspill">{s(p.kicker)}</span> : null}
        <RevealTitle text={s(p.title)} className="ds-dxl" />
        {s(p.lead) ? <p className="ds-lead2">{s(p.lead)}</p> : null}
        {s(p.cta) ? (
          <div>
            <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn2 primary big">
              <Go /> {s(p.cta)}
            </L>
          </div>
        ) : null}
      </div>
      {ctx.mode === 'interactive' ? (
        <button type="button" className="ds-motiontoggle" aria-pressed={paused} onClick={() => setPaused(!paused)} data-motion-toggle>
          {paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
          {paused ? 'Play the animation' : 'Pause the animation'}
        </button>
      ) : null}
    </section>
  );
}

function SiteHeader({ p, ctx, inst }: { p: ComponentInstance['props']; ctx: SiteCtx; inst: ComponentInstance }) {
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState(false);
  const [vars, setVars] = useState('');
  const panelId = useId();
  const subId = useId();
  const ref = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const burger = useRef<HTMLButtonElement>(null);
  const items = rows(p.items);
  const services = rows(p.services);
  const ti = ctx.mode === 'thumb' ? -1 : undefined;
  const interactive = ctx.mode === 'interactive';
  // Desktop: inline navigation with a services dropdown. Phone and tablet: the burger panel.
  const [drop, setDrop] = useState(false);
  const dropId = useId();
  useEffect(() => {
    if (!drop) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrop(false);
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setDrop(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDoc);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [drop]);
  useEffect(() => setDrop(false), [ctx.current]);

  const openMenu = () => {
    // The panel is rendered in a portal (outside the container-query scope, so position:
    // fixed covers the viewport); it takes the workspace tokens with it.
    setVars((ref.current?.closest('.ds-scope') as HTMLElement | null)?.style.cssText ?? '');
    setOpen(true);
  };
  const close = (focusBack = true) => {
    setOpen(false);
    setSub(false);
    if (focusBack) requestAnimationFrame(() => burger.current?.focus());
  };

  // Escape closes; Tab stays inside the open panel; the page behind does not scroll.
  useEffect(() => {
    if (!open) return;
    const root = panel.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'Tab' && root) {
        const f = Array.from(root.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')).filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => root?.querySelector<HTMLElement>('.ds-menu-main a, .ds-menu-main button')?.focus());
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close after navigation.
  useEffect(() => {
    setOpen(false);
    setSub(false);
  }, [ctx.current]);

  const cur = (to?: string) => (to && ctx.current === to ? 'page' : undefined);
  const visual = heroVisual('fluted-4');
  const brand = s(p.brand) || 'devoteam';

  const menu = (
    <div className="ds-scope ds-menu-root" style={styleFrom(vars)}>
      <div className={`ds-menu ${sub ? 'sub-open' : ''}`} id={panelId} ref={panel} role="dialog" aria-modal="true" aria-label="Menu">
        {visual ? <img className="ds-menu-visual" src={visual} alt="" aria-hidden /> : null}
        <div className="ds-bar in-menu">
          <L to="home" ctx={ctx} inst={inst} className="ds-brandmark2" label={`${brand}, home`}>
            {brand}
            <span aria-hidden className="dot" />
          </L>
          <button type="button" className="ds-burger is-x" aria-expanded="true" aria-controls={panelId} onClick={() => close()}>
            <span className="lines" aria-hidden>
              <span />
              <span />
            </span>
            <span className="label">Close</span>
          </button>
        </div>
        <nav aria-label="Main" className="ds-menu-nav">
          <ul className="ds-menu-main">
            {services.length ? (
              <li style={st(0)}>
                <button type="button" className="ds-menu-link" aria-expanded={sub} aria-controls={subId} onClick={() => setSub(!sub)}>
                  <span className="n" aria-hidden>
                    01
                  </span>
                  {s(p.servicesLabel) || 'Services'}
                  <ChevronDown size={28} aria-hidden className="chev" />
                </button>
              </li>
            ) : null}
            {items.map(([label, to], i) => (
              <li key={label} style={st(i + 1)}>
                <NavLink to={to} ctx={ctx} inst={inst} current={cur(to)} className="ds-menu-link">
                  <span className="n" aria-hidden>
                    {pad(i + 2)}
                  </span>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
          {services.length ? (
            <ul id={subId} className="ds-menu-sub" hidden={!sub} aria-label={s(p.servicesLabel) || 'Services'}>
              {services.map(([label, to], i) => {
                const I = iconFor(label);
                return (
                  <li key={label} style={st(i)}>
                    <L to={to || label} ctx={ctx} inst={inst} className="ds-menu-sublink">
                      <span className="ic" aria-hidden>
                        <I size={20} strokeWidth={1.5} />
                      </span>
                      {label}
                    </L>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </nav>
        <div className="ds-menu-foot">
          {s(p.locale) ? (
            <span className="ds-localechip2">
              <Globe size={15} aria-hidden /> {s(p.locale)}
            </span>
          ) : null}
          {s(p.cta) ? (
            <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn2 primary sm">
              {s(p.cta)}
            </L>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <header className={`ds-siteheader3 ${tone(p, 'night')}`} ref={ref}>
      <div className="ds-bar">
        <L to="home" ctx={ctx} inst={inst} className="ds-brandmark2" label={`${brand}, home`}>
          {brand}
          <span aria-hidden className="dot" />
        </L>
        <nav aria-label="Main" className="ds-inline-nav">
          <ul>
            {services.length ? (
              <li className="has-drop">
                <button type="button" className="ds-inlink" aria-expanded={drop} aria-controls={dropId} tabIndex={ti} onClick={() => setDrop(!drop)}>
                  {s(p.servicesLabel) || 'Services'} <ChevronDown size={14} aria-hidden className="chev" />
                </button>
                <ul id={dropId} className="ds-navdrop" hidden={!drop}>
                  {services.map(([label, to], i) => {
                    const I = iconFor(label);
                    return (
                      <li key={label} style={st(i)}>
                        <L to={to || label} ctx={ctx} inst={inst} className="ds-navdrop-link">
                          <span className="ic" aria-hidden>
                            <I size={18} strokeWidth={1.5} />
                          </span>
                          {label}
                        </L>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ) : null}
            {items.map(([label, to]) => (
              <li key={label}>
                <NavLink to={to} ctx={ctx} inst={inst} current={cur(to)} className="ds-inlink">
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ds-bar-actions">
          {s(p.locale) ? (
            <span className="ds-localechip2 ds-bar-locale">
              <Globe size={14} aria-hidden /> {s(p.locale)}
            </span>
          ) : null}
          {s(p.cta) ? (
            <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn2 ghost sm ds-bar-cta">
              {s(p.cta)}
            </L>
          ) : null}
          <button ref={burger} type="button" className="ds-burger" aria-expanded={open} aria-controls={panelId} tabIndex={ti} onClick={interactive ? openMenu : undefined}>
            <span className="lines" aria-hidden>
              <span />
              <span />
            </span>
            <span className="label">Menu</span>
          </button>
        </div>
      </div>
      {open && typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
    </header>
  );
}

/** Turns a copied inline style string (the workspace tokens) back into a style object. */
function styleFrom(css: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of css.split(';')) {
    const i = decl.indexOf(':');
    if (i > 0) out[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
  }
  return out as CSSProperties;
}

function NavLink({ to, ctx, inst, current, children, className = 'ds-navlink2' }: { to: string; ctx: SiteCtx; inst: ComponentInstance; current?: 'page'; children: ReactNode; className?: string }) {
  const href = ctx.linkFor?.(to);
  if (href)
    return (
      <a className={className} href={href} aria-current={current}>
        {children}
      </a>
    );
  return (
    <L to={to} ctx={ctx} inst={inst} className={className}>
      {children}
    </L>
  );
}

function SiteFooter({ p, ctx, inst }: { p: ComponentInstance['props']; ctx: SiteCtx; inst: ComponentInstance }) {
  const groups = s(p.groups)
    .split('||')
    .map((g) => g.trim())
    .filter(Boolean)
    .map((g) => {
      const [title, links = ''] = g.split('|');
      return { title: title.trim(), links: list(links).map((l) => l.split('>').map((x) => x.trim())) };
    });
  return (
    <footer className={`ds-sec2 ${tone(p, 'night')} ds-sitefooter2`}>
      <div className="ds-sitefooter2-top">
        {s(p.tagline) ? <p className="ds-ds">{s(p.tagline)}</p> : null}
        <div className="ds-sitefooter2-cols">
          {groups.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <h2 className="ds-plus">
                <span className="p" aria-hidden>
                  +
                </span>
                {g.title}
              </h2>
              <ul>
                {g.links.map(([label, to]) => (
                  <li key={label}>
                    <L to={to || label} ctx={ctx} inst={inst} className="ds-footer-link2">
                      {label}
                    </L>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <p className="ds-giantmark" aria-hidden>
        {s(p.brand) || 'devoteam'}
        <span className="dot" />
      </p>
      <div className="ds-sitefooter2-legal">
        <span>{s(p.legal)}</span>
        <ul>
          {list(p.legalLinks).map((l) => {
            const [label, to] = l.split('>').map((x) => x.trim());
            return (
              <li key={label}>
                <L to={to || label} ctx={ctx} inst={inst} className="ds-footer-link2">
                  {label}
                </L>
              </li>
            );
          })}
        </ul>
      </div>
    </footer>
  );
}

function LogoBand({ p, marquee, ti }: { p: ComponentInstance['props']; marquee: boolean; ti?: number }) {
  const items = list(p.items).length ? list(p.items) : ['Google Cloud', 'AWS', 'Microsoft', 'ServiceNow', 'Salesforce', 'SAP'];
  const [paused, setPaused] = useState(false);
  return (
    <section className={`ds-sec2 ${tone(p, 'paper')} ds-logos4 ${marquee ? 'marquee' : ''} ${paused ? 'is-paused' : ''}`}>
      <div className="ds-logos4-card">
        <div className="ds-logos4-text">
          <p className="ds-cardtitle big">{s(p.title)}</p>
          {marquee ? (
            <button type="button" className="ds-motiontoggle static" tabIndex={ti} aria-pressed={paused} onClick={() => setPaused(!paused)} data-marquee-toggle>
              {paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
              {paused ? 'Play the partner list' : 'Pause the partner list'}
            </button>
          ) : null}
        </div>
        <div className="ds-logotrack">
          <ul aria-label={s(p.listLabel) || 'Partners'}>
            {items.map((x) => (
              <li key={x}>
                <span className="ds-wordmark3 sm">{x}</span>
                {s(p.badge) ? <span className="ds-small">{s(p.badge)}</span> : null}
              </li>
            ))}
          </ul>
          {marquee ? (
            <ul aria-hidden className="dup">
              {items.map((x) => (
                <li key={x}>
                  <span className="ds-wordmark3 sm">{x}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}

const DEFAULT_OFFICES = 'France|Levallois-Perret|Headquarters|73 rue Anatole France, 92300 Levallois-Perret; Portugal|Lisbon||Av. Dom João II 43, 1990-084 Lisbon; Spain|Madrid||C/ Alcalá 44, 28014 Madrid';

function OfficeDirectory({ p, ti, ctx }: { p: ComponentInstance['props']; ti?: number; ctx: SiteCtx }) {
  const [q, setQ] = useState('');
  const id = useId();
  const offices = rows(s(p.offices) || DEFAULT_OFFICES);
  const norm = (x: string) => x.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const shown = useMemo(() => offices.filter((o) => !q || norm(`${o[0]} ${o[1]} ${o[3] ?? ''}`).includes(norm(q))), [offices, q]);
  const countries = [...new Set(shown.map((o) => o[0]))];
  const total = new Set(offices.map((o) => o[0])).size;
  return (
    <section className={`ds-sec2 ${tone(p, 'paper')}`}>
      {s(p.title) ? <h2 className="ds-dm">{s(p.title)}</h2> : null}
      <div className="ds-officesearch" role="search">
        <label className="ds-label2" htmlFor={id}>
          Find an office by city or country
        </label>
        <div className="ds-field2">
          <Search size={18} aria-hidden />
          <input id={id} type="search" placeholder="for example: Lisbon" value={q} onChange={(e) => setQ(e.target.value)} readOnly={ctx.mode !== 'interactive'} tabIndex={ti} />
        </div>
        <span className="ds-small" role="status">
          {shown.length === 0
            ? `No office matches "${q}". Try a country name.`
            : `${shown.length} ${shown.length === 1 ? 'office' : 'offices'} in ${countries.length} ${countries.length === 1 ? 'country' : 'countries'}${q ? '' : ` (${total} in total)`}`}
        </span>
      </div>
      <div className="ds-offices2">
        {countries.map((c) => (
          <div key={c} className="ds-country2">
            <h3 className="ds-cardtitle big">{c}</h3>
            <ul>
              {shown
                .filter((o) => o[0] === c)
                .map(([, city, badge, address]) => (
                  <li key={`${city}${address}`} className="ds-office3">
                    <span className="head">
                      <strong>{city}</strong>
                      {badge ? <span className="ds-chip dark">{badge}</span> : null}
                    </span>
                    <address>{address}</address>
                    <a className="ds-textlink" href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(address ?? city)}`} target="_blank" rel="noopener noreferrer" tabIndex={ti}>
                      <MapPin size={14} aria-hidden /> View {city} office on the map<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
