import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  Briefcase,
  Building2,
  ChevronDown,
  Cloud,
  Code2,
  Coins,
  Compass,
  Fingerprint,
  Globe,
  GraduationCap,
  KeyRound,
  Layers,
  Leaf,
  Link2,
  LockKeyhole,
  MapPin,
  Menu,
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
  X,
  type LucideIcon,
} from 'lucide-react';
import { Fragment, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import type { ComponentDef, ComponentInstance } from '../domain/types';
import { getPhoto, photoUrl } from '../data/photos';
import { SignalField } from './SignalField';
import './site-patterns.css';

// Patterns used to rebuild devoteam.com, in the "AI leader, same DNA" identity (bench-04):
// night canvas for the hero, AI sections and footer; paper and mist for reading; mint only for
// evidence (figures, quotes); coral as a signal, never a surface; Montserrat set large and tight;
// a mono face for indexes and data; the signal lattice as the AI motif.
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
const pad = (n: number) => String(n).padStart(2, '0');

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

/** Mono section index: number (when given) and label. */
function Index({ n, children }: { n?: string; children: ReactNode }) {
  return (
    <span className="ds-index">
      {n ? <span className="n">{n}</span> : null}
      <span>{children}</span>
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

function Arrow({ up = false }: { up?: boolean }) {
  return <span className="ds-arrowdisc">{up ? <ArrowUpRight size={18} aria-hidden /> : <ArrowRight size={18} aria-hidden />}</span>;
}

/** Head of a section: index, title and optional intro, with an optional action on the right. */
function SecHead({ p, fallbackKicker, ctx, inst, title }: { p: ComponentInstance['props']; fallbackKicker: string; ctx: SiteCtx; inst: ComponentInstance; title?: string }) {
  const t = title ?? s(p.title);
  return (
    <div className="ds-sechead2">
      <div className="ds-sechead2-text">
        <Index n={s(p.index) || undefined}>{s(p.kicker) || fallbackKicker}</Index>
        {t ? (
          <h2 className="ds-dm" data-reveal>
            {t}
          </h2>
        ) : null}
        {s(p.lead) ? (
          <p className="ds-lead2" data-reveal style={st(1)}>
            {s(p.lead)}
          </p>
        ) : null}
      </div>
      {s(p.cta) ? (
        <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn2 secondary">
          {s(p.cta)} <Arrow />
        </L>
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
      if (inst.variantId === 'signal' || inst.variantId === 'default') return <HeroSignal p={p} ctx={ctx} inst={inst} />;
      return (
        <section className={`ds-sec2 ${tone(p, 'night')} ds-hero3 ${inst.variantId === 'cover' ? 'cover' : 'split'}`}>
          {inst.variantId === 'cover' ? <Photo id={s(p.image)} width={thumbW ?? 2000} className="bg" eager /> : null}
          <div className="ds-hero3-text">
            {s(p.kicker) ? <Index>{s(p.kicker)}</Index> : null}
            <RevealTitle text={s(p.title)} className="ds-dl" />
            {s(p.lead) ? (
              <p className="ds-lead2" data-reveal style={st(3)}>
                {s(p.lead)}
              </p>
            ) : null}
            <div className="ds-row2" data-reveal style={st(4)}>
              {s(p.cta) ? (
                <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn2 primary">
                  {s(p.cta)} <Arrow />
                </L>
              ) : null}
              {s(p.cta2) ? (
                <L to={s(p.cta2To)} ctx={ctx} inst={inst} className="ds-btn2 secondary">
                  {s(p.cta2)}
                </L>
              ) : null}
            </div>
          </div>
          {inst.variantId !== 'cover' ? (
            <div className="ds-hero3-media" data-reveal="clip">
              <Photo id={s(p.image)} width={thumbW ?? 1400} eager />
            </div>
          ) : null}
        </section>
      );

    case 'pPageHero': {
      const crumbs = rows(p.crumbs);
      return (
        <section className={`ds-sec2 ${tone(p, 'night')} ds-pagehero2 ${s(p.image) ? 'has-media' : ''}`}>
          {!s(p.image) ? <SignalField still={ctx.mode !== 'interactive'} density={0.5} className="soft" /> : null}
          <div className="ds-pagehero2-text">
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
            {s(p.kicker) ? <Index>{s(p.kicker)}</Index> : null}
            <RevealTitle text={s(p.title)} className="ds-dl" />
            {s(p.lead) ? (
              <p className="ds-lead2" data-reveal style={st(2)}>
                {s(p.lead)}
              </p>
            ) : null}
            {s(p.cta) ? (
              <div data-reveal style={st(3)}>
                <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn2 primary">
                  {s(p.cta)} <Arrow />
                </L>
              </div>
            ) : null}
          </div>
          {s(p.image) ? (
            <div className="ds-pagehero2-media" data-reveal="clip">
              <Photo id={s(p.image)} width={thumbW ?? 1400} eager />
            </div>
          ) : null}
        </section>
      );
    }

    case 'pFeatureDuo':
      return (
        <section className={`ds-sec2 ${tone(p, 'paper')}`}>
          <SecHead p={p} fallbackKicker="Spotlight" ctx={ctx} inst={inst} />
          <div className="ds-duo2">
            {rows(p.items).map(([tag, title, body, image, to, linkLabel], i) => (
              <article key={title} className="ds-feature2" data-reveal style={st(i)}>
                <Photo id={image} width={thumbW ?? 1100} className="zoom" />
                <div className="ds-feature2-body">
                  {tag ? <span className="ds-tag2">{tag}</span> : null}
                  <h3 className="ds-ds">{title}</h3>
                  {body ? <p className="ds-soft">{body}</p> : null}
                  <L to={to} ctx={ctx} inst={inst} className="ds-arrowlink2">
                    {linkLabel || `Read about ${title}`} <Arrow />
                  </L>
                </div>
              </article>
            ))}
          </div>
        </section>
      );

    case 'pExpertiseGrid': {
      const items = list(p.items);
      return (
        <section className={`ds-sec2 ${tone(p, 'paper')}`}>
          <SecHead p={p} fallbackKicker="Expertise" ctx={ctx} inst={inst} />
          <ol className="ds-indexlist">
            {items.map((x, i) => {
              const I = iconFor(x);
              return (
                <li key={x} data-reveal style={st(i)}>
                  <L to={x} ctx={ctx} inst={inst} className="ds-indexrow">
                    <span className="n" aria-hidden>
                      {pad(i + 1)}
                    </span>
                    <span className="t">{x}</span>
                    <span className="ic" aria-hidden>
                      <I size={22} strokeWidth={1.5} />
                    </span>
                    <Arrow up />
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
        <section className={`ds-sec2 ${tone(p, 'night')}`}>
          <SecHead p={p} fallbackKicker="Partners" ctx={ctx} inst={inst} />
          <div className="ds-bento">
            {rows(p.items).map(([name, body, to], i) => (
              <L key={name} to={to} ctx={ctx} inst={inst} className={`ds-bento-cell ${i === 0 ? 'wide' : ''}`}>
                <span className="ds-wordmark2" data-reveal style={st(i)}>
                  {name}
                </span>
                <span className="ds-soft">{body}</span>
                <Arrow up />
              </L>
            ))}
          </div>
        </section>
      );

    case 'pCaseTeaser':
      return (
        <section className={`ds-sec2 ${tone(p, 'mist')}`}>
          <SecHead p={p} fallbackKicker="Success stories" ctx={ctx} inst={inst} />
          <div className="ds-cases3">
            {rows(p.items).map(([tag, client, result, image, to], i) => (
              <L key={client} to={to || s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-case3">
                <span data-reveal style={st(i)} className="ds-case3-in">
                  <Photo id={image} width={thumbW ?? 900} className="zoom" />
                  <span className="ds-case3-meta">
                    <span className="ds-tag2">{tag}</span>
                    <span className="ds-mono-s">{client}</span>
                  </span>
                  <span className="ds-case3-result">{result}</span>
                </span>
              </L>
            ))}
          </div>
        </section>
      );

    case 'pStorySplit': {
      const figures = rows(p.figures);
      return (
        <section className={`ds-sec2 ${tone(p, 'paper')} ds-story2 ${inst.variantId === 'media-right' ? 'flip' : ''}`}>
          <div className="ds-story2-media" data-reveal="clip">
            <Photo id={s(p.image)} width={thumbW ?? 1200} />
          </div>
          <div className="ds-story2-text">
            {s(p.kicker) ? <Index n={s(p.index) || undefined}>{s(p.kicker)}</Index> : null}
            <h2 className="ds-dm" data-reveal>
              {s(p.title)}
            </h2>
            {s(p.body) ? (
              <p className="ds-lead2" data-reveal>
                {s(p.body)}
              </p>
            ) : null}
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
            {s(p.cta) ? (
              <div>
                <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-arrowlink2">
                  {s(p.cta)} <Arrow />
                </L>
              </div>
            ) : null}
          </div>
        </section>
      );
    }

    case 'pLogoBand':
      return <LogoBand p={p} marquee={inst.variantId === 'marquee'} ti={ti} />;

    case 'pClosingStatement':
      return <Closing p={p} ctx={ctx} inst={inst} thumbW={thumbW} />;

    case 'pChallenges':
      return (
        <section className={`ds-sec2 ${tone(p, 'paper')}`}>
          <SecHead p={p} fallbackKicker="Challenges" ctx={ctx} inst={inst} />
          <div className="ds-challenges2">
            {rows(p.items).map(([icon, title, body], i) => (
              <article key={title} className="ds-challenge2" data-reveal style={st(i)}>
                <span className="top">
                  <span className="ds-mono-s">{pad(i + 1)}</span>
                  <Icon name={icon} size={26} />
                </span>
                <h3 className="ds-ds">{title}</h3>
                <p className="ds-soft">{body}</p>
              </article>
            ))}
          </div>
        </section>
      );

    case 'pFeatureRows':
      return (
        <section className={`ds-sec2 ${tone(p, 'paper')} ds-rows2`}>
          {s(p.title) ? <SecHead p={p} fallbackKicker="Offer" ctx={ctx} inst={inst} /> : null}
          {rows(p.items).map(([kicker, title, body, bullets, partners, image], i) => (
            <article key={title} className={`ds-row3 ${i % 2 ? 'flip' : ''}`}>
              <div className="ds-row3-media" data-reveal="clip">
                <Photo id={image} width={thumbW ?? 1100} />
              </div>
              <div className="ds-row3-text">
                <Index n={pad(i + 1)}>{kicker}</Index>
                <h3 className="ds-ds big" data-reveal>
                  {title}
                </h3>
                {body ? <p className="ds-soft">{body}</p> : null}
                {list(bullets).length ? (
                  <ul className="ds-points">
                    {list(bullets).map((b, j) => (
                      <li key={b} data-reveal style={st(j)}>
                        {b}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {list(partners).length ? (
                  <p className="ds-withpartners2">
                    <span className="ds-mono-s">With</span>
                    {list(partners).map((x) => (
                      <span key={x} className="ds-tag2">
                        {x}
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      );

    case 'pSpotlightBand':
      return <Spotlight p={p} ctx={ctx} inst={inst} />;

    case 'pIntroStatement':
      return (
        <section className={`ds-sec2 ${tone(p, 'paper')} ds-intro2`}>
          {s(p.kicker) ? <Index n={s(p.index) || undefined}>{s(p.kicker)}</Index> : null}
          <p className="ds-statement2" data-reveal>
            {s(p.lead)}
          </p>
          {s(p.body) ? (
            <p className="ds-lead2 ds-soft" data-reveal style={st(1)}>
              {s(p.body)}
            </p>
          ) : null}
        </section>
      );

    case 'pSignposts':
      return (
        <section className={`ds-sec2 ${tone(p, 'mist')}`}>
          {s(p.title) ? <SecHead p={p} fallbackKicker="Next" ctx={ctx} inst={inst} /> : null}
          <div className="ds-signposts2">
            {rows(p.items).map(([title, body, cta, to, image], i) => (
              <L key={title} to={to} ctx={ctx} inst={inst} className="ds-signpost2">
                <span data-reveal style={st(i)} className="ds-signpost2-in">
                  {image ? <Photo id={image} width={thumbW ?? 900} className="zoom" /> : null}
                  <span className="ds-signpost2-body">
                    <span className="ds-ds">{title}</span>
                    {body ? <span className="ds-soft">{body}</span> : null}
                    <span className="ds-arrowlink2 as-text">
                      {cta} <Arrow />
                    </span>
                  </span>
                </span>
              </L>
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
        <section className={`ds-sec2 ${tone(p, 'evidence')} ds-stats2`}>
          <div className="ds-stats2-head">
            <Index n={s(p.index) || undefined}>{s(p.kicker) || 'In figures'}</Index>
            {s(p.title) ? (
              <h2 className="ds-dm" data-reveal>
                {s(p.title)}
              </h2>
            ) : null}
            {s(p.lead) ? <p className="ds-lead2">{s(p.lead)}</p> : null}
          </div>
          <dl className="ds-bigfig">
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
        <section className={`ds-sec2 ${tone(p, 'paper')}`}>
          <SecHead p={p} fallbackKicker="People" ctx={ctx} inst={inst} />
          <ul className="ds-people2">
            {people.map(([nm, role], i) => {
              const first = nm.split(' ')[0];
              return (
                <li key={nm} className="ds-person3" data-reveal style={st(i)}>
                  <span className="ds-avatar3" aria-hidden>
                    {nm
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase()}
                  </span>
                  <span className="ds-person3-text">
                    <strong className="ds-person3-name">{nm}</strong>
                    <span className="ds-soft">{role}</span>
                  </span>
                  <L to={s(p.ctaTo) || 'contact'} ctx={ctx} inst={inst} className="ds-arrowlink2 sm">
                    Contact {first} <Arrow />
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

function MotionToggle({ paused, setPaused, ctx }: { paused: boolean; setPaused: (v: boolean) => void; ctx: SiteCtx }) {
  if (ctx.mode !== 'interactive') return null;
  return (
    <button type="button" className="ds-motiontoggle" aria-pressed={paused} onClick={() => setPaused(!paused)} data-motion-toggle>
      {paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
      {paused ? 'Play the animation' : 'Pause the animation'}
    </button>
  );
}

function HeroSignal({ p, ctx, inst }: { p: ComponentInstance['props']; ctx: SiteCtx; inst: ComponentInstance }) {
  const [paused, setPaused] = useState(false);
  const [q, setQ] = useState('');
  const id = useId();
  const { href, act } = useLink(ctx, inst)(s(p.ctaTo));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (href) window.location.hash = href.replace(/^#/, '');
    else act?.();
  };
  return (
    <section className={`ds-sec2 ${tone(p, 'night')} ds-herosig`}>
      <SignalField paused={paused} still={ctx.mode !== 'interactive'} />
      <div className="ds-herosig-in">
        {s(p.kicker) ? <Index>{s(p.kicker)}</Index> : null}
        <RevealTitle text={s(p.title)} className="ds-dxl" />
        {s(p.lead) ? (
          <p className="ds-lead2" data-reveal style={st(3)}>
            {s(p.lead)}
          </p>
        ) : null}
        <form className="ds-ask" onSubmit={submit} data-reveal style={st(4)} role="search" aria-label={s(p.askLabel) || 'Ask about AI'}>
          <label className="sr-only" htmlFor={id}>
            {s(p.askLabel) || 'Describe your AI question'}
          </label>
          <span className="spark" aria-hidden>
            <Sparkles size={18} strokeWidth={1.75} />
          </span>
          <input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder={s(p.ask) || 'Ask how AI could change your business'} tabIndex={ctx.mode === 'thumb' ? -1 : undefined} readOnly={ctx.mode !== 'interactive'} autoComplete="off" />
          <button type="submit" className="ds-btn2 primary" tabIndex={ctx.mode === 'thumb' ? -1 : undefined}>
            {s(p.cta) || 'Start'} <Arrow />
          </button>
        </form>
        {s(p.cta2) ? (
          <div className="ds-row2" data-reveal style={st(5)}>
            <L to={s(p.cta2To)} ctx={ctx} inst={inst} className="ds-arrowlink2">
              {s(p.cta2)} <Arrow />
            </L>
          </div>
        ) : null}
      </div>
      <MotionToggle paused={paused} setPaused={setPaused} ctx={ctx} />
    </section>
  );
}

function Closing({ p, ctx, inst, thumbW }: { p: ComponentInstance['props']; ctx: SiteCtx; inst: ComponentInstance; thumbW?: number }) {
  const [paused, setPaused] = useState(false);
  const photo = s(p.image) && s(p.media) === 'photo';
  return (
    <section className={`ds-sec2 ${tone(p, 'night')} ds-closing2`}>
      {photo ? <Photo id={s(p.image)} width={thumbW ?? 2000} className="bg" /> : <SignalField paused={paused} still={ctx.mode !== 'interactive'} density={0.7} />}
      <div className="ds-closing2-in">
        <h2 className="ds-dl" data-reveal>
          {s(p.title)}
        </h2>
        {s(p.cta) ? (
          <div data-reveal style={st(1)}>
            <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn2 primary">
              {s(p.cta)} <Arrow />
            </L>
          </div>
        ) : null}
      </div>
      {!photo ? <MotionToggle paused={paused} setPaused={setPaused} ctx={ctx} /> : null}
    </section>
  );
}

function Spotlight({ p, ctx, inst }: { p: ComponentInstance['props']; ctx: SiteCtx; inst: ComponentInstance }) {
  const items = rows(p.items);
  return (
    <section className={`ds-sec2 ${tone(p, 'night')} ds-spot2`}>
      <div className="ds-spot2-text">
        {s(p.kicker) ? <Index n={s(p.index) || undefined}>{s(p.kicker)}</Index> : null}
        <h2 className="ds-dl" data-reveal>
          {s(p.title)}
        </h2>
        {s(p.subtitle) ? <p className="ds-lead2 strong">{s(p.subtitle)}</p> : null}
        {s(p.body) ? <p className="ds-soft">{s(p.body)}</p> : null}
        {s(p.cta) ? (
          <div>
            <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn2 primary">
              {s(p.cta)} <Arrow />
            </L>
          </div>
        ) : null}
      </div>
      {items.length ? (
        <ol className="ds-steps2" aria-label={s(p.itemsLabel) || 'Steps'}>
          {items.map(([label, text], i) => (
            <li key={label} data-reveal style={st(i)}>
              <span className="n" aria-hidden>
                {pad(i + 1)}
              </span>
              <span className="b">
                <strong>{label}</strong>
                <span className="ds-soft">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function SiteHeader({ p, ctx, inst }: { p: ComponentInstance['props']; ctx: SiteCtx; inst: ComponentInstance }) {
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState(false);
  const subId = useId();
  const menuId = useId();
  const ref = useRef<HTMLElement>(null);
  const items = rows(p.items);
  const services = rows(p.services);
  const ti = ctx.mode === 'thumb' ? -1 : undefined;

  useEffect(() => {
    if (!sub && !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSub(false);
        setOpen(false);
      }
    };
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setSub(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDoc);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [sub, open]);

  useEffect(() => {
    setOpen(false);
    setSub(false);
  }, [ctx.current]);

  const cur = (to?: string) => (to && ctx.current === to ? 'page' : undefined);

  return (
    <header className={`ds-siteheader2 ${tone(p, 'night')} ${open ? 'is-open' : ''}`} ref={ref}>
      <L to="home" ctx={ctx} inst={inst} className="ds-brandmark2" label={`${s(p.brand) || 'devoteam'}, home`}>
        {s(p.brand) || 'devoteam'}
        <span aria-hidden className="dot" />
      </L>
      <button type="button" className="ds-menubtn2" aria-expanded={open} aria-controls={menuId} tabIndex={ti} onClick={() => setOpen(!open)}>
        {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
        Menu
      </button>
      <nav aria-label="Main" id={menuId} className="ds-mainnav2">
        <ul>
          {services.length ? (
            <li className="has-sub">
              <button type="button" aria-expanded={sub} aria-controls={subId} tabIndex={ti} onClick={() => setSub(!sub)}>
                {s(p.servicesLabel) || 'Services'} <ChevronDown size={16} aria-hidden style={{ transform: sub ? 'rotate(180deg)' : undefined }} />
              </button>
              <ul id={subId} className="ds-subnav2" hidden={!sub}>
                {services.map(([label, to], i) => (
                  <li key={label}>
                    <L to={to || label} ctx={ctx} inst={inst} className="ds-subnav2-link">
                      <span className="ds-mono-s">{pad(i + 1)}</span>
                      {label}
                    </L>
                  </li>
                ))}
              </ul>
            </li>
          ) : null}
          {items.map(([label, to]) => (
            <li key={label}>
              <NavLink to={to} ctx={ctx} inst={inst} current={cur(to)}>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="ds-headeractions2">
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
      </nav>
    </header>
  );
}

function NavLink({ to, ctx, inst, current, children }: { to: string; ctx: SiteCtx; inst: ComponentInstance; current?: 'page'; children: ReactNode }) {
  const href = ctx.linkFor?.(to);
  if (href)
    return (
      <a className="ds-navlink2" href={href} aria-current={current}>
        {children}
      </a>
    );
  return (
    <L to={to} ctx={ctx} inst={inst} className="ds-navlink2">
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
        {s(p.tagline) ? <p className="ds-statement2 small">{s(p.tagline)}</p> : null}
        <div className="ds-sitefooter2-cols">
          {groups.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <h2 className="ds-mono-s">{g.title}</h2>
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
    <section className={`ds-sec2 ${tone(p, 'night')} ds-logoband3 ${marquee ? 'marquee' : ''} ${paused ? 'is-paused' : ''}`}>
      <div className="ds-logoband3-head">
        <Index n={s(p.index) || undefined}>{s(p.title)}</Index>
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
              <span className="ds-wordmark2">{x}</span>
              {s(p.badge) ? <span className="ds-mono-s">{s(p.badge)}</span> : null}
            </li>
          ))}
        </ul>
        {marquee ? (
          <ul aria-hidden className="dup">
            {items.map((x) => (
              <li key={x}>
                <span className="ds-wordmark2">{x}</span>
                {s(p.badge) ? <span className="ds-mono-s">{s(p.badge)}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
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
        <span className="ds-mono-s" role="status">
          {shown.length === 0
            ? `No office matches "${q}". Try a country name.`
            : `${shown.length} ${shown.length === 1 ? 'office' : 'offices'} in ${countries.length} ${countries.length === 1 ? 'country' : 'countries'}${q ? '' : ` (${total} in total)`}`}
        </span>
      </div>
      <div className="ds-offices2">
        {countries.map((c) => (
          <div key={c} className="ds-country2">
            <h3 className="ds-ds">{c}</h3>
            <ul>
              {shown
                .filter((o) => o[0] === c)
                .map(([, city, badge, address]) => (
                  <li key={`${city}${address}`} className="ds-office3">
                    <span className="head">
                      <strong>{city}</strong>
                      {badge ? <span className="ds-tag2">{badge}</span> : null}
                    </span>
                    <address>{address}</address>
                    <a className="ds-arrowlink2 sm" href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(address ?? city)}`} target="_blank" rel="noopener noreferrer" tabIndex={ti}>
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
