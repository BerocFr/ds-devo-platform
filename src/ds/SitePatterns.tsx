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
import { Fragment, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { ComponentDef, ComponentInstance } from '../domain/types';
import { getPhoto, photoUrl } from '../data/photos';
import './site-patterns.css';

// Patterns used to rebuild devoteam.com, plus the richer versions of five earlier patterns
// (expertise grid, key figures, partner band, expert team, office directory).
// Content is carried by text props: rows separated by ";", fields by "|".
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

/** Icon per service name, so the expertise grid reads without photos. Lucide, decorative. */
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
  return <C size={size} aria-hidden strokeWidth={1.75} />;
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

function Kicker({ children }: { children: ReactNode }) {
  return <span className="ds-kicker">{children}</span>;
}

/** Headline split into words for the once-per-page line reveal; reads as one string. */
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

    case 'pHeroMedia': {
      const cover = inst.variantId === 'cover';
      return (
        <section className={`ds-sec ds-hero2 ${cover ? 'cover' : 'split'}`}>
          {cover ? <Photo id={s(p.image)} width={thumbW ?? 2000} className="bg" eager /> : null}
          <div className="ds-hero2-text">
            {s(p.kicker) ? <Kicker>{s(p.kicker)}</Kicker> : null}
            <RevealTitle text={s(p.title)} className="ds-mega" />
            {s(p.lead) ? (
              <p className="ds-lead" data-reveal style={st(3)}>
                {s(p.lead)}
              </p>
            ) : null}
            <div className="ds-row" data-reveal style={st(4)}>
              {s(p.cta) ? (
                <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn primary">
                  {s(p.cta)} <ArrowRight size={16} aria-hidden />
                </L>
              ) : null}
              {s(p.cta2) ? (
                <L to={s(p.cta2To)} ctx={ctx} inst={inst} className={`ds-btn ${cover ? 'ghost-inverse' : 'secondary'}`}>
                  {s(p.cta2)}
                </L>
              ) : null}
            </div>
          </div>
          {!cover ? (
            <div className="ds-hero2-media" data-reveal="clip">
              <Photo id={s(p.image)} width={thumbW ?? 1400} eager />
            </div>
          ) : null}
        </section>
      );
    }

    case 'pPageHero': {
      const crumbs = rows(p.crumbs);
      return (
        <section className="ds-sec ds-pagehero">
          <div className="ds-pagehero-text">
            {crumbs.length ? (
              <nav aria-label="Breadcrumb" className="ds-crumbs2">
                <ol>
                  {crumbs.map(([label, to], i) => (
                    <li key={label}>
                      {i < crumbs.length - 1 && to ? (
                        <L to={to} ctx={ctx} inst={inst} className="ds-crumb">
                          {label}
                        </L>
                      ) : (
                        <span aria-current="page">{label}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}
            {s(p.kicker) ? <Kicker>{s(p.kicker)}</Kicker> : null}
            <RevealTitle text={s(p.title)} className="ds-mega small" />
            {s(p.lead) ? (
              <p className="ds-lead" data-reveal style={st(2)}>
                {s(p.lead)}
              </p>
            ) : null}
            {s(p.cta) ? (
              <div data-reveal style={st(3)}>
                <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn primary">
                  {s(p.cta)} <ArrowRight size={16} aria-hidden />
                </L>
              </div>
            ) : null}
          </div>
          {s(p.image) ? (
            <div className="ds-pagehero-media" data-reveal="clip">
              <Photo id={s(p.image)} width={thumbW ?? 1400} eager />
            </div>
          ) : null}
        </section>
      );
    }

    case 'pFeatureDuo':
      return (
        <section className="ds-sec tone-light">
          {s(p.title) ? (
            <h2 className="ds-display" data-reveal>
              {s(p.title)}
            </h2>
          ) : null}
          <div className="ds-duo">
            {rows(p.items).map(([tag, title, body, image, to, linkLabel], i) => (
              <article key={title} className="ds-feature" data-reveal style={st(i)}>
                <Photo id={image} width={thumbW ?? 1000} className="zoom" />
                <div className="ds-feature-body">
                  {tag ? <span className="ds-topic">{tag}</span> : null}
                  <h3 className="ds-h">{title}</h3>
                  {body ? <p className="ds-muted">{body}</p> : null}
                  <L to={to} ctx={ctx} inst={inst} className="ds-arrowlink">
                    {linkLabel || `Read about ${title}`} <ArrowRight size={16} aria-hidden />
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
        <section className="ds-sec tone-light">
          <div className="ds-sechead">
            <Kicker>{s(p.kicker) || 'Expertise'}</Kicker>
            <h2 className="ds-display" data-reveal>
              {s(p.title)}
            </h2>
            {s(p.lead) ? (
              <p className="ds-muted ds-measure" data-reveal>
                {s(p.lead)}
              </p>
            ) : null}
          </div>
          <ul className="ds-services">
            {items.map((x, i) => {
              const I = iconFor(x);
              return (
                <li key={x} data-reveal style={st(i)}>
                  <L to={x} ctx={ctx} inst={inst} className="ds-service">
                    <span className="ic">
                      <I size={22} aria-hidden strokeWidth={1.75} />
                    </span>
                    <span className="t">{x}</span>
                    <ArrowUpRight size={18} aria-hidden className="go" />
                  </L>
                </li>
              );
            })}
          </ul>
        </section>
      );
    }

    case 'pPartnerShowcase':
      return (
        <section className="ds-sec tone-subtle">
          <div className="ds-sechead">
            <Kicker>{s(p.kicker) || 'Partners'}</Kicker>
            <h2 className="ds-display" data-reveal>
              {s(p.title)}
            </h2>
            {s(p.lead) ? (
              <p className="ds-muted ds-measure" data-reveal>
                {s(p.lead)}
              </p>
            ) : null}
          </div>
          <div className="ds-partners">
            {rows(p.items).map(([name, body, to], i) => (
              <L key={name} to={to} ctx={ctx} inst={inst} className="ds-partner">
                <span className="ds-wordmark" data-reveal style={st(i)}>
                  {name}
                </span>
                <span className="ds-muted">{body}</span>
                <ArrowUpRight size={18} aria-hidden className="go" />
              </L>
            ))}
          </div>
        </section>
      );

    case 'pCaseTeaser':
      return (
        <section className="ds-sec tone-light">
          <div className="ds-row space ds-sechead-row">
            <div className="ds-sechead">
              <Kicker>{s(p.kicker) || 'Success stories'}</Kicker>
              <h2 className="ds-display" data-reveal>
                {s(p.title)}
              </h2>
            </div>
            {s(p.cta) ? (
              <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn secondary">
                {s(p.cta)} <ArrowRight size={16} aria-hidden />
              </L>
            ) : null}
          </div>
          <div className="ds-cases2">
            {rows(p.items).map(([tag, client, result, image, to], i) => (
              <L key={client} to={to || s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-case2">
                <span data-reveal style={st(i)} className="ds-case2-in">
                  <Photo id={image} width={thumbW ?? 900} className="zoom" />
                  <span className="ds-topic">{tag}</span>
                  <span className="ds-case2-client">{client}</span>
                  <span className="ds-case2-result">{result}</span>
                </span>
              </L>
            ))}
          </div>
        </section>
      );

    case 'pStorySplit': {
      const figures = rows(p.figures);
      return (
        <section className={`ds-sec tone-light ds-story ${inst.variantId === 'media-right' ? 'flip' : ''}`}>
          <div className="ds-story-media" data-reveal="clip">
            <Photo id={s(p.image)} width={thumbW ?? 1200} />
          </div>
          <div className="ds-stack ds-story-text">
            {s(p.kicker) ? <Kicker>{s(p.kicker)}</Kicker> : null}
            <h2 className="ds-display" data-reveal>
              {s(p.title)}
            </h2>
            {s(p.body) ? (
              <p className="ds-measure" data-reveal>
                {s(p.body)}
              </p>
            ) : null}
            {figures.length ? (
              <dl className="ds-figures">
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
                <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-arrowlink">
                  {s(p.cta)} <ArrowRight size={16} aria-hidden />
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
      return (
        <section className="ds-sec ds-closing">
          <Photo id={s(p.image)} width={thumbW ?? 2000} className="bg" />
          <div className="ds-closing-in">
            <h2 className="ds-mega" data-reveal>
              {s(p.title)}
            </h2>
            {s(p.cta) ? (
              <div data-reveal style={st(1)}>
                <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn primary">
                  {s(p.cta)} <ArrowRight size={16} aria-hidden />
                </L>
              </div>
            ) : null}
          </div>
        </section>
      );

    case 'pChallenges':
      return (
        <section className="ds-sec tone-subtle">
          <div className="ds-sechead">
            {s(p.kicker) ? <Kicker>{s(p.kicker)}</Kicker> : null}
            <h2 className="ds-display" data-reveal>
              {s(p.title)}
            </h2>
            {s(p.lead) ? <p className="ds-muted ds-measure">{s(p.lead)}</p> : null}
          </div>
          <div className="ds-challenges">
            {rows(p.items).map(([icon, title, body], i) => (
              <article key={title} className="ds-challenge" data-reveal style={st(i)}>
                <span className="ic">
                  <Icon name={icon} />
                </span>
                <h3 className="ds-card-title">{title}</h3>
                <p className="ds-muted">{body}</p>
              </article>
            ))}
          </div>
        </section>
      );

    case 'pFeatureRows':
      return (
        <section className="ds-sec tone-light ds-rows">
          {s(p.title) ? (
            <div className="ds-sechead">
              {s(p.kicker) ? <Kicker>{s(p.kicker)}</Kicker> : null}
              <h2 className="ds-display" data-reveal>
                {s(p.title)}
              </h2>
            </div>
          ) : null}
          {rows(p.items).map(([kicker, title, body, bullets, partners, image], i) => (
            <article key={title} className={`ds-row2 ${i % 2 ? 'flip' : ''}`}>
              <div className="ds-row2-media" data-reveal="clip">
                <Photo id={image} width={thumbW ?? 1100} />
              </div>
              <div className="ds-stack">
                {kicker ? <Kicker>{kicker}</Kicker> : null}
                <h3 className="ds-h big" data-reveal>
                  {title}
                </h3>
                {body ? <p className="ds-measure">{body}</p> : null}
                {list(bullets).length ? (
                  <ul className="ds-bullets">
                    {list(bullets).map((b, j) => (
                      <li key={b} data-reveal style={st(j)}>
                        {b}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {list(partners).length ? (
                  <p className="ds-withpartners">
                    <span className="ds-muted">With</span>
                    {list(partners).map((x) => (
                      <span key={x} className="ds-pill static">
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

    case 'pSpotlightBand': {
      const items = rows(p.items);
      return (
        <section className="ds-sec tone-ink ds-spot">
          <div className="ds-stack">
            {s(p.kicker) ? <Kicker>{s(p.kicker)}</Kicker> : null}
            <h2 className="ds-mega small" data-reveal>
              {s(p.title)}
            </h2>
            {s(p.subtitle) ? <p className="ds-lead">{s(p.subtitle)}</p> : null}
            {s(p.body) ? <p className="ds-measure ds-onink">{s(p.body)}</p> : null}
            {s(p.cta) ? (
              <div>
                <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn primary">
                  {s(p.cta)} <ArrowRight size={16} aria-hidden />
                </L>
              </div>
            ) : null}
          </div>
          {items.length ? (
            <ol className="ds-levels" aria-label={s(p.itemsLabel) || 'Levels'}>
              {items.map(([label, text], i) => (
                <li key={label} data-reveal style={st(i)}>
                  <span className="n" aria-hidden>
                    {i + 1}
                  </span>
                  <span>
                    <strong>{label}</strong>
                    <span className="ds-onink">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      );
    }

    case 'pIntroStatement':
      return (
        <section className="ds-sec tone-light ds-intro">
          {s(p.kicker) ? <Kicker>{s(p.kicker)}</Kicker> : null}
          <p className="ds-statement" data-reveal>
            {s(p.lead)}
          </p>
          {s(p.body) ? (
            <p className="ds-measure ds-muted" data-reveal style={st(1)}>
              {s(p.body)}
            </p>
          ) : null}
        </section>
      );

    case 'pSignposts':
      return (
        <section className="ds-sec tone-mint">
          {s(p.title) ? (
            <h2 className="ds-display" data-reveal>
              {s(p.title)}
            </h2>
          ) : null}
          <div className="ds-signposts">
            {rows(p.items).map(([title, body, cta, to, image], i) => (
              <article key={title} className="ds-signpost" data-reveal style={st(i)}>
                {image ? <Photo id={image} width={thumbW ?? 900} className="zoom" /> : null}
                <div className="ds-stack">
                  <h3 className="ds-h">{title}</h3>
                  {body ? <p>{body}</p> : null}
                  <div>
                    <L to={to} ctx={ctx} inst={inst} className="ds-btn primary">
                      {cta} <ArrowRight size={16} aria-hidden />
                    </L>
                  </div>
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
        <section className="ds-sec tone-ink">
          {s(p.title) ? (
            <h2 className="ds-display" data-reveal>
              {s(p.title)}
            </h2>
          ) : null}
          {s(p.lead) ? <p className="ds-lead ds-measure">{s(p.lead)}</p> : null}
          <dl className="ds-bigstats">
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
        <section className="ds-sec tone-mint">
          <div className="ds-sechead">
            <Kicker>{s(p.kicker) || 'People'}</Kicker>
            <h2 className="ds-display" data-reveal>
              {s(p.title)}
            </h2>
            {s(p.lead) ? <p className="ds-measure">{s(p.lead)}</p> : null}
          </div>
          <ul className="ds-people">
            {people.map(([nm, role], i) => {
              const first = nm.split(' ')[0];
              return (
                <li key={nm} className="ds-person2" data-reveal style={st(i)}>
                  <span className="ds-avatar2" aria-hidden>
                    {nm
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase()}
                  </span>
                  <span className="ds-stack tight">
                    <strong className="ds-card-title">{nm}</strong>
                    <span className="ds-muted">{role}</span>
                    <L to={s(p.ctaTo) || 'contact'} ctx={ctx} inst={inst} className="ds-arrowlink sm">
                      Contact {first} <ArrowRight size={14} aria-hidden />
                    </L>
                  </span>
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

  // Close menus after navigation.
  useEffect(() => {
    setOpen(false);
    setSub(false);
  }, [ctx.current]);

  const cur = (to?: string) => (to && ctx.current === to ? 'page' : undefined);

  return (
    <header className={`ds-siteheader ${open ? 'is-open' : ''}`} ref={ref}>
      <L to="home" ctx={ctx} inst={inst} className="ds-brandmark" label={`${s(p.brand) || 'devoteam'}, home`}>
        <span aria-hidden className="dot" />
        {s(p.brand) || 'devoteam'}
      </L>
      <button type="button" className="ds-menubtn" aria-expanded={open} aria-controls={menuId} tabIndex={ti} onClick={() => setOpen(!open)}>
        {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
        Menu
      </button>
      <nav aria-label="Main" id={menuId} className="ds-mainnav">
        <ul>
          {services.length ? (
            <li className="has-sub">
              <button type="button" aria-expanded={sub} aria-controls={subId} tabIndex={ti} onClick={() => setSub(!sub)}>
                {s(p.servicesLabel) || 'Services'} <ChevronDown size={16} aria-hidden style={{ transform: sub ? 'rotate(180deg)' : undefined }} />
              </button>
              <ul id={subId} className="ds-subnav" hidden={!sub}>
                {services.map(([label, to]) => (
                  <li key={label}>
                    <L to={to || label} ctx={ctx} inst={inst} className="ds-subnav-link">
                      <span className="ic">{(() => { const I = iconFor(label); return <I size={18} aria-hidden strokeWidth={1.75} />; })()}</span>
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
        <div className="ds-headeractions">
          {s(p.locale) ? (
            <span className="ds-localechip">
              <Globe size={16} aria-hidden /> {s(p.locale)}
            </span>
          ) : null}
          {s(p.cta) ? (
            <L to={s(p.ctaTo)} ctx={ctx} inst={inst} className="ds-btn primary sm">
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
      <a className="ds-navlink" href={href} aria-current={current}>
        {children}
      </a>
    );
  return (
    <L to={to} ctx={ctx} inst={inst} className="ds-navlink">
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
    <footer className="ds-sec tone-ink ds-sitefooter">
      <div className="ds-sitefooter-top">
        <div className="ds-stack">
          <span className="ds-brandmark inverse">
            <span aria-hidden className="dot" />
            {s(p.brand) || 'devoteam'}
          </span>
          {s(p.tagline) ? <p className="ds-onink ds-measure">{s(p.tagline)}</p> : null}
        </div>
        <div className="ds-sitefooter-cols">
          {groups.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <h2 className="ds-footer-h">{g.title}</h2>
              <ul>
                {g.links.map(([label, to]) => (
                  <li key={label}>
                    <L to={to || label} ctx={ctx} inst={inst} className="ds-footer-link">
                      {label}
                    </L>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="ds-sitefooter-legal">
        <span>{s(p.legal)}</span>
        <ul>
          {list(p.legalLinks).map((l) => {
            const [label, to] = l.split('>').map((x) => x.trim());
            return (
              <li key={label}>
                <L to={to || label} ctx={ctx} inst={inst} className="ds-footer-link">
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
    <section className={`ds-sec tone-subtle ds-logoband2 ${marquee ? 'marquee' : ''} ${paused ? 'is-paused' : ''}`}>
      <div className="ds-row space">
        <h2 className="ds-h">{s(p.title)}</h2>
        {marquee ? (
          <button type="button" className="ds-pill" tabIndex={ti} aria-pressed={paused} onClick={() => setPaused(!paused)} data-marquee-toggle>
            {paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
            {paused ? 'Play the partner list' : 'Pause the partner list'}
          </button>
        ) : null}
      </div>
      <div className="ds-logotrack">
        <ul aria-label={s(p.listLabel) || 'Partners'}>
          {items.map((x) => (
            <li key={x}>
              <span className="ds-wordmark">{x}</span>
              {s(p.badge) ? <span className="ds-badge-l">{s(p.badge)}</span> : null}
            </li>
          ))}
        </ul>
        {marquee ? (
          <ul aria-hidden className="dup">
            {items.map((x) => (
              <li key={x}>
                <span className="ds-wordmark">{x}</span>
                {s(p.badge) ? <span className="ds-badge-l">{s(p.badge)}</span> : null}
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
    <section className="ds-sec tone-light">
      {s(p.title) ? <h2 className="ds-display">{s(p.title)}</h2> : null}
      <div className="ds-search ds-office-search" role="search">
        <label className="ds-label" htmlFor={id}>
          Find an office by city or country
        </label>
        <div className="ds-search-row">
          <Search size={18} aria-hidden />
          <input id={id} className="ds-input" type="search" placeholder="for example: Lisbon" value={q} onChange={(e) => setQ(e.target.value)} readOnly={ctx.mode !== 'interactive'} tabIndex={ti} />
        </div>
        <span className="ds-hint" role="status">
          {shown.length === 0
            ? `No office matches "${q}". Try a country name.`
            : `${shown.length} ${shown.length === 1 ? 'office' : 'offices'} in ${countries.length} ${countries.length === 1 ? 'country' : 'countries'}${q ? '' : ` (${total} in total)`}`}
        </span>
      </div>
      <div className="ds-offices">
        {countries.map((c) => (
          <div key={c} className="ds-country">
            <h3 className="ds-h">{c}</h3>
            <ul>
              {shown
                .filter((o) => o[0] === c)
                .map(([, city, badge, address]) => (
                  <li key={`${city}${address}`} className="ds-office2">
                    <div className="ds-row space">
                      <strong className="ds-card-title">{city}</strong>
                      {badge ? <span className="ds-topic">{badge}</span> : null}
                    </div>
                    <address>{address}</address>
                    <a
                      className="ds-arrowlink sm"
                      href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(address ?? city)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      tabIndex={ti}
                    >
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
