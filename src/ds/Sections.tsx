import { ArrowRight, ArrowUpRight, Calendar, Check, ChevronDown, Clock, Copy, FileText, Globe, Link2, Mail, MapPin, Phone, Play, Search, Upload, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { ComponentDef, ComponentInstance } from '../domain/types';
import './sections.css';

// Renderers for the atoms and section patterns added after the devoteam.com analysis.
// Every value reads --ds-* tokens through sections.css; copy is sample content, editable per instance.

type Ctx = { mode: 'thumb' | 'preview' | 'interactive'; onAction?: (id: string) => void };

const list = (v: unknown, sep = ',') =>
  String(v ?? '')
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
const pairs = (v: unknown) => list(v, ';').map((p) => p.split(':').map((x) => x.trim()) as [string, string?]);

/** Brand art built from tokens only: coral disc, mint field, ink lines. Decorative. */
export function Art({ seed = 1, label }: { seed?: number; label?: string }) {
  return <div className={`ds-art a${seed % 4}`} aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label} />;
}

function Kicker({ children }: { children: ReactNode }) {
  return <span className="ds-kicker">{children}</span>;
}

function Btn({ children, kind = 'primary', ctx, inst, icon = true }: { children: ReactNode; kind?: string; ctx: Ctx; inst: ComponentInstance; icon?: boolean }) {
  return (
    <button type="button" className={`ds-btn ${kind}`} tabIndex={ctx.mode === 'thumb' ? -1 : undefined} onClick={ctx.mode === 'interactive' ? () => ctx.onAction?.(inst.id) : undefined}>
      {children}
      {icon ? <ArrowRight size={16} aria-hidden /> : null}
    </button>
  );
}

function Field({ label, type = 'text', hint, ctx, id }: { label: string; type?: string; hint?: string; ctx: Ctx; id: string }) {
  return (
    <div className="ds-field">
      <label className="ds-label" htmlFor={id}>
        {label}
      </label>
      {hint ? <span className="ds-hint">{hint}</span> : null}
      <input id={id} className="ds-input" type={type} readOnly={ctx.mode !== 'interactive'} tabIndex={ctx.mode === 'thumb' ? -1 : undefined} autoComplete="off" />
    </div>
  );
}

function Consent({ ctx, id, text = 'I agree that Devoteam uses my details to answer this request. ' }: { ctx: Ctx; id: string; text?: string }) {
  return (
    <label className="ds-check" htmlFor={id}>
      <input id={id} type="checkbox" tabIndex={ctx.mode === 'thumb' ? -1 : undefined} disabled={ctx.mode === 'thumb'} />
      <span>
        {text}
        <span className="ds-u">Privacy notice</span>
      </span>
    </label>
  );
}

function Chips({ items, ctx, label }: { items: string[]; ctx: Ctx; label: string }) {
  const [on, setOn] = useState<string[]>([items[0]].filter(Boolean));
  return (
    <div className="ds-tags" role="group" aria-label={label}>
      {items.map((t) => (
        <button key={t} type="button" className="ds-tag" tabIndex={ctx.mode === 'thumb' ? -1 : undefined} aria-pressed={on.includes(t)} onClick={() => setOn(on.includes(t) ? on.filter((x) => x !== t) : [...on, t])}>
          {t}
        </button>
      ))}
    </div>
  );
}

function SearchBar({ label, placeholder, count, ctx, id }: { label: string; placeholder?: string; count?: string; ctx: Ctx; id: string }) {
  return (
    <div className="ds-search" role="search">
      <label className="ds-label" htmlFor={id}>
        {label}
      </label>
      <div className="ds-search-row">
        <Search size={18} aria-hidden />
        <input id={id} className="ds-input" type="search" placeholder={placeholder} readOnly={ctx.mode !== 'interactive'} tabIndex={ctx.mode === 'thumb' ? -1 : undefined} />
      </div>
      {count ? (
        <span className="ds-hint" role="status">
          {count}
        </span>
      ) : null}
    </div>
  );
}

const JOBS = [
  ['Cloud Architect, Google Cloud', 'Paris, France', 'Google Cloud', 'Permanent', 'Hybrid', '3 October 2026'],
  ['Security Consultant, Microsoft', 'Brussels, Belgium', 'Cybersecurity', 'Permanent', 'On site', '1 October 2026'],
  ['Data Engineer', 'Lisbon, Portugal', 'Data and AI', 'Permanent', 'Remote', '28 September 2026'],
];
const EVENTS = [
  ['Cloud Summit Paris', '18', 'Nov', '18 November 2026, 2pm to 5pm CET', 'In person', 'Paris, France'],
  ['Securing generative AI', '26', 'Nov', '26 November 2026, 11am to 12pm CET', 'Online', 'English'],
  ['ServiceNow user day', '3', 'Dec', '3 December 2026, 9am to 1pm CET', 'Hybrid', 'Madrid, Spain'],
];
const CASES = [
  ['Telecom operator', 'AWS migration of 400 applications in 18 months', 'Cloud'],
  ['European bank', 'Fraud false positives down by a third with AI', 'AI'],
  ['Retail group', 'Zero-downtime move of the core platform', 'Cloud'],
];

export function renderSiteKind(def: ComponentDef, inst: ComponentInstance, ctx: Ctx): ReactNode {
  const p = inst.props;
  const ti = ctx.mode === 'thumb' ? -1 : undefined;
  const id = (s: string) => `${inst.id}-${s}`;
  switch (def.kind) {
    /* ---------- atoms ---------- */
    case 'localeSwitcher':
      return <LocaleSwitcher current={String(p.current)} options={list(p.options, ';')} ti={ti} />;
    case 'personCard':
      return (
        <article className="ds-person">
          <div className="ds-avatar" aria-hidden>
            {String(p.name ?? '')
              .split(' ')
              .map((w) => w[0])
              .join('')}
          </div>
          <div>
            <h3 className="ds-card-title">{String(p.name)}</h3>
            <p className="ds-muted">{String(p.role)}</p>
          </div>
          <button type="button" className="ds-link" tabIndex={ti} onClick={ctx.mode === 'interactive' ? () => ctx.onAction?.(inst.id) : undefined}>
            {String(p.cta)}
          </button>
        </article>
      );
    case 'articleCard':
      return (
        <article className="ds-article">
          <Art seed={String(p.title).length} />
          <div className="ds-meta">
            <span className="ds-topic">{String(p.topic)}</span>
            <time>{String(p.date)}</time>
            <span>{String(p.readTime)}</span>
          </div>
          <h3 className="ds-card-title">{String(p.title)}</h3>
        </article>
      );
    case 'logoWall':
      return (
        <div className="ds-logos">
          <span className="ds-muted">{String(p.label)}</span>
          <ul aria-label={String(p.label)}>
            {list(p.items).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      );
    case 'pagination': {
      const cur = Number(p.current) || 1;
      const tot = Number(p.total) || 1;
      return (
        <nav className="ds-pages" aria-label="Pagination">
          <button type="button" className="ds-link" tabIndex={ti} disabled={cur <= 1}>
            Previous
          </button>
          {Array.from({ length: Math.min(tot, 6) }, (_, i) => (
            <span key={i} aria-current={i + 1 === cur ? 'page' : undefined} className={i + 1 === cur ? 'on' : ''}>
              {i + 1}
            </span>
          ))}
          <button type="button" className="ds-link" tabIndex={ti} onClick={ctx.mode === 'interactive' ? () => ctx.onAction?.(inst.id) : undefined}>
            Next
          </button>
        </nav>
      );
    }
    case 'searchField':
      return <SearchBar label={String(p.label)} placeholder={String(p.placeholder)} count={String(p.count)} ctx={ctx} id={id('q')} />;
    case 'videoEmbed':
      return (
        <figure className="ds-video">
          <div className="ds-video-frame">
            <Art seed={3} />
            <button type="button" className="ds-play" tabIndex={ti} aria-label={`Play ${String(p.title)}`}>
              <Play size={22} aria-hidden />
            </button>
          </div>
          <figcaption>
            <strong>{String(p.title)}</strong>
            <span className="ds-muted">
              {String(p.duration)}, captions in English and French
            </span>
          </figcaption>
        </figure>
      );
    case 'consentBanner':
      return (
        <section className="ds-consent" aria-label="Cookie preferences">
          <p>{String(p.text)}</p>
          <div className="ds-row">
            <button type="button" className="ds-btn secondary sm" tabIndex={ti}>
              Reject optional cookies
            </button>
            <button type="button" className="ds-btn secondary sm" tabIndex={ti}>
              Accept all cookies
            </button>
            <button type="button" className="ds-link" tabIndex={ti}>
              Choose
            </button>
          </div>
        </section>
      );
    case 'eventCard':
      return <EventCard e={[String(p.title), String(p.day), String(p.month), String(p.date), String(p.format), String(p.place)]} past={inst.variantId === 'past'} ctx={ctx} inst={inst} />;
    case 'jobCard':
      return <JobCard j={[String(p.title), String(p.location), String(p.practice), String(p.contract), String(p.remote), String(p.posted).replace(/^Posted /, '')]} ctx={ctx} inst={inst} />;
    case 'fileUpload': {
      const err = String(p.error ?? '');
      return (
        <div className="ds-field">
          <label className="ds-label" htmlFor={id('f')}>
            {String(p.label)}
          </label>
          <span className="ds-hint" id={id('fh')}>
            {String(p.hint)}
          </span>
          {err ? <span className="ds-error">{err}</span> : null}
          <div className={`ds-drop ${err ? 'err' : ''}`}>
            <Upload size={20} aria-hidden />
            <span>
              <button type="button" className="ds-btn secondary sm" tabIndex={ti}>
                Choose file
              </button>{' '}
              <span className="ds-muted">or drop it here</span>
            </span>
            <input id={id('f')} type="file" className="sr-only" tabIndex={-1} aria-describedby={id('fh')} />
          </div>
          {p.file ? (
            <ul className="ds-files">
              <li>
                <FileText size={16} aria-hidden />
                <span>{String(p.file)}</span>
                <Check size={16} aria-hidden className="ok" />
                <button type="button" className="ds-icon-btn" tabIndex={ti} aria-label={`Remove ${String(p.file).split(',')[0]}`}>
                  <X size={14} />
                </button>
              </li>
            </ul>
          ) : null}
        </div>
      );
    }
    case 'officeCard':
      return <OfficeCard o={[String(p.city), String(p.address), String(p.phone), String(p.email), String(p.hq ?? '')]} ti={ti} />;
    case 'shareLinks':
      return <ShareLinks channels={list(p.channels)} ti={ti} />;
    case 'toc': {
      const items = list(p.items);
      const cur = Number(p.current) || 1;
      return (
        <nav className="ds-toc" aria-label="Contents">
          <span className="ds-label">Contents</span>
          <ol>
            {items.map((it, i) => (
              <li key={it} aria-current={i + 1 === cur ? 'page' : undefined}>
                {it}
              </li>
            ))}
          </ol>
        </nav>
      );
    }
    case 'documentList':
      return (
        <ul className="ds-docs">
          {list(p.items).map((d, i) => (
            <li key={d}>
              <FileText size={20} aria-hidden />
              <span>
                <span className="ds-u strong">
                  {d} (PDF, {(2.1 + i * 1.3).toFixed(2)}MB)
                </span>
                <span className="ds-muted">Published {i === 0 ? '24 July 2026' : i === 1 ? '27 February 2026' : '18 June 2025'}</span>
              </span>
            </li>
          ))}
        </ul>
      );

    /* ---------- patterns ---------- */
    case 'pExpertiseGrid':
      return (
        <section className="ds-sec tone-light">
          <Kicker>Expertise</Kicker>
          <h2 className="ds-display">{String(p.title)}</h2>
          <div className="ds-grid three">
            {list(p.items).map((x, i) => (
              <button key={x} type="button" className="ds-tile" tabIndex={ti} onClick={ctx.mode === 'interactive' ? () => ctx.onAction?.(inst.id) : undefined}>
                <Art seed={i} />
                <span className="ds-tile-t">{x}</span>
                <ArrowUpRight size={20} aria-hidden />
              </button>
            ))}
          </div>
        </section>
      );
    case 'pStatsBand':
      return (
        <section className="ds-sec tone-ink">
          <div className="ds-grid four">
            {pairs(p.items).map(([v, l]) => (
              <div key={v} className="ds-bigstat">
                <span className="v">{v}</span>
                <span className="l">{l}</span>
              </div>
            ))}
          </div>
        </section>
      );
    case 'pLogoBand':
      return (
        <section className="ds-sec tone-subtle ds-logoband">
          <h2 className="ds-h">{String(p.title)}</h2>
          <ul aria-label="Partners">
            {['Google Cloud', 'AWS', 'Microsoft', 'ServiceNow', 'Salesforce', 'SAP'].map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
      );
    case 'pCaseGrid':
      return (
        <section className="ds-sec tone-light">
          <Kicker>Proof</Kicker>
          <h2 className="ds-display">{String(p.title)}</h2>
          <SearchBar label="Search success stories" placeholder="for example: migration" count="18 success stories" ctx={ctx} id={id('q')} />
          <Chips items={list(p.filters)} ctx={ctx} label="Filter by expertise or industry" />
          <div className="ds-grid three">
            {CASES.map(([client, result, tag], i) => (
              <button key={client} type="button" className="ds-case" tabIndex={ti} onClick={ctx.mode === 'interactive' ? () => ctx.onAction?.(inst.id) : undefined}>
                <Art seed={i + 1} />
                <span className="ds-topic">{tag}</span>
                <span className="ds-card-title">{client}</span>
                <span className="ds-case-r">{result}</span>
              </button>
            ))}
          </div>
        </section>
      );
    case 'pExpertTeam':
      return (
        <section className="ds-sec tone-mint">
          <Kicker>People</Kicker>
          <h2 className="ds-display">{String(p.title)}</h2>
          <div className="ds-grid three">
            {pairs(p.names).map(([nm, role]) => (
              <article key={nm} className="ds-person">
                <div className="ds-avatar" aria-hidden>
                  {nm
                    .split(' ')
                    .map((w) => w[0])
                    .join('')}
                </div>
                <h3 className="ds-card-title">{nm}</h3>
                <p className="ds-muted">{role}</p>
                <button type="button" className="ds-link" tabIndex={ti} onClick={ctx.mode === 'interactive' ? () => ctx.onAction?.(inst.id) : undefined}>
                  Contact {nm.split(' ')[0]}
                </button>
              </article>
            ))}
          </div>
        </section>
      );
    case 'pQuoteBand':
      return (
        <section className="ds-sec tone-accent">
          <figure className="ds-bigquote">
            <blockquote>{String(p.quote)}</blockquote>
            <figcaption>{String(p.author)}</figcaption>
          </figure>
        </section>
      );
    case 'pFaq':
      return (
        <section className="ds-sec tone-light ds-split">
          <div>
            <Kicker>FAQ</Kicker>
            <h2 className="ds-display">{String(p.title)}</h2>
            <p className="ds-muted">Not answered here? An expert replies within two working days.</p>
          </div>
          <Accordion items={list(p.items)} ti={ti} />
        </section>
      );
    case 'pContact':
      return (
        <section className="ds-sec tone-mint ds-split">
          <div className="ds-stack">
            <Kicker>Contact</Kicker>
            <h2 className="ds-display">{String(p.title)}</h2>
            <p>{String(p.promise)}</p>
            <ul className="ds-ticks">
              <li>
                <Check size={16} aria-hidden /> A named expert, not a call centre
              </li>
              <li>
                <Check size={16} aria-hidden /> Your data is only used to answer you
              </li>
            </ul>
          </div>
          <form className="ds-formcard" onSubmit={(e) => e.preventDefault()}>
            <Field label="Full name" ctx={ctx} id={id('n')} />
            <Field label="Work email" type="email" ctx={ctx} id={id('e')} />
            <div className="ds-field">
              <label className="ds-label" htmlFor={id('t')}>
                Topic
              </label>
              <select id={id('t')} className="ds-select" tabIndex={ti} disabled={ctx.mode === 'thumb'}>
                <option>Cloud</option>
                <option>Data and AI</option>
                <option>Cybersecurity</option>
                <option>Other</option>
              </select>
            </div>
            <div className="ds-field">
              <label className="ds-label" htmlFor={id('m')}>
                Your project in a few lines
              </label>
              <textarea id={id('m')} className="ds-textarea" readOnly={ctx.mode !== 'interactive'} tabIndex={ti} />
            </div>
            <Consent ctx={ctx} id={id('c')} />
            <Btn ctx={ctx} inst={inst}>
              {String(p.cta)}
            </Btn>
          </form>
        </section>
      );
    case 'pEventList':
      return (
        <section className="ds-sec tone-light">
          <Kicker>Events</Kicker>
          <h2 className="ds-display">{String(p.title)}</h2>
          <Chips items={['All formats', 'Online', 'In person', 'France', 'Belgium', 'Spain']} ctx={ctx} label="Filter events" />
          <div className="ds-stack">
            {EVENTS.map((e) => (
              <EventCard key={e[0]} e={e} past={false} ctx={ctx} inst={inst} />
            ))}
          </div>
        </section>
      );
    case 'pEventDetail':
      return (
        <section className="ds-sec tone-light ds-split">
          <div className="ds-stack">
            <Kicker>In person, Paris</Kicker>
            <h2 className="ds-display">{String(p.title)}</h2>
            <p className="ds-iconline">
              <Calendar size={18} aria-hidden /> <time dateTime="2026-11-18T14:00+01:00">18 November 2026, 2pm to 5pm CET</time>
            </p>
            <p className="ds-iconline">
              <MapPin size={18} aria-hidden /> Paris, France. Talks in French, slides in English.
            </p>
            <ol className="ds-agenda">
              <li>
                <time>2pm</time> Where cloud budgets go in 2027
              </li>
              <li>
                <time>3pm</time> Client panel: migrations that did not stop the business
              </li>
              <li>
                <time>4:15pm</time> Workshops and drinks
              </li>
            </ol>
          </div>
          <form className="ds-formcard" onSubmit={(e) => e.preventDefault()}>
            <Field label="Full name" ctx={ctx} id={id('n')} />
            <Field label="Work email" type="email" ctx={ctx} id={id('e')} />
            <Field label="Company" ctx={ctx} id={id('co')} />
            <Consent ctx={ctx} id={id('c')} text="Send me the replay and related events. " />
            <Btn ctx={ctx} inst={inst}>
              {String(p.cta)}
            </Btn>
          </form>
        </section>
      );
    case 'pJobBoard':
      return (
        <section className="ds-sec tone-light">
          <Kicker>Careers</Kicker>
          <h2 className="ds-display">{String(p.title)}</h2>
          <div className="ds-jobboard">
            <aside className="ds-filters" aria-label="Filters">
              <fieldset>
                <legend className="ds-label">Country</legend>
                {['France', 'Belgium', 'Portugal', 'Spain'].map((c) => (
                  <label key={c} className="ds-check">
                    <input type="checkbox" defaultChecked={c === String(p.country ?? 'France')} tabIndex={ti} disabled={ctx.mode === 'thumb'} /> {c}
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend className="ds-label">Practice</legend>
                {['Cloud', 'Data and AI', 'Cybersecurity'].map((c) => (
                  <label key={c} className="ds-check">
                    <input type="checkbox" tabIndex={ti} disabled={ctx.mode === 'thumb'} /> {c}
                  </label>
                ))}
              </fieldset>
            </aside>
            <div className="ds-stack">
              <SearchBar label="Search jobs" placeholder="for example: architect" count={`24 jobs in ${String(p.country ?? 'France')}`} ctx={ctx} id={id('q')} />
              {JOBS.map((j) => (
                <JobCard key={j[0]} j={j} ctx={ctx} inst={inst} />
              ))}
            </div>
          </div>
        </section>
      );
    case 'pJobDetail':
      return (
        <section className="ds-sec tone-light ds-split wide-left">
          <div className="ds-stack">
            <Kicker>Google Cloud practice</Kicker>
            <h2 className="ds-display">{String(p.title)}</h2>
            <ul className="ds-chips-meta">
              <li>
                <MapPin size={14} aria-hidden /> Paris, France
              </li>
              <li>Permanent</li>
              <li>Hybrid</li>
              <li>
                <time>Posted 3 October 2026</time>
              </li>
            </ul>
            <h3 className="ds-h">Your missions</h3>
            <p>Design landing zones and migration plans with clients, then lead the engineers who build them.</p>
            <h3 className="ds-h">Your profile</h3>
            <p>Five years of cloud architecture, Google Cloud certified or on the way, at ease in French and English.</p>
            <ShareLinks channels={['LinkedIn', 'Email']} ti={ti} />
          </div>
          <aside className="ds-formcard sticky">
            <strong>Interested?</strong>
            <p className="ds-muted">It takes about four minutes. Have your CV ready.</p>
            <Btn ctx={ctx} inst={inst}>
              {String(p.cta)}
            </Btn>
          </aside>
        </section>
      );
    case 'pApplication':
      return (
        <section className="ds-sec tone-subtle">
          <div className="ds-narrow ds-stack">
            <div className="ds-progress">
              <span>Step 2 of 3</span>
              <div className="ds-progress-steps" aria-hidden>
                <span className="on" />
                <span className="on" />
                <span />
              </div>
            </div>
            <h2 className="ds-display">{String(p.title)}</h2>
            <form className="ds-formcard" onSubmit={(e) => e.preventDefault()}>
              <Field label="Full name" ctx={ctx} id={id('n')} />
              <Field label="Email" type="email" ctx={ctx} id={id('e')} />
              <div className="ds-field">
                <label className="ds-label" htmlFor={id('f')}>
                  Your CV (required)
                </label>
                <span className="ds-hint">PDF, DOC or DOCX, 5MB maximum</span>
                <div className="ds-drop">
                  <Upload size={20} aria-hidden />
                  <span>
                    <button type="button" className="ds-btn secondary sm" tabIndex={ti}>
                      Choose file
                    </button>{' '}
                    <span className="ds-muted">or drop it here</span>
                  </span>
                  <input id={id('f')} type="file" className="sr-only" tabIndex={-1} />
                </div>
              </div>
              <Consent ctx={ctx} id={id('c')} text="Keep my application for other roles for 2 years. " />
              <Btn ctx={ctx} inst={inst}>
                {String(p.cta)}
              </Btn>
            </form>
          </div>
        </section>
      );
    case 'pNewsletter':
      return (
        <section className="ds-sec tone-ink ds-split">
          <div className="ds-stack">
            <Kicker>Newsletter</Kicker>
            <h2 className="ds-h big">{String(p.title)}</h2>
            <p>One email a month. Unsubscribe in one click.</p>
          </div>
          <form className="ds-inline-form" onSubmit={(e) => e.preventDefault()}>
            <Field label="Work email" type="email" ctx={ctx} id={id('e')} />
            <Consent ctx={ctx} id={id('c')} text="Send me the newsletter. " />
            <Btn ctx={ctx} inst={inst} kind="primary">
              {String(p.cta)}
            </Btn>
          </form>
        </section>
      );
    case 'pArticleGrid':
      return (
        <section className="ds-sec tone-light">
          <div className="ds-row space">
            <div>
              <Kicker>Expert view, {String(p.topic)}</Kicker>
              <h2 className="ds-display">{String(p.title)}</h2>
            </div>
            <button type="button" className="ds-link" tabIndex={ti} onClick={ctx.mode === 'interactive' ? () => ctx.onAction?.(inst.id) : undefined}>
              All insights
            </button>
          </div>
          <div className="ds-grid three">
            {['What generative AI changes for IT operations', 'Five questions before a sovereign cloud', 'Zero trust without the jargon'].map((tt, i) => (
              <article key={tt} className="ds-article">
                <Art seed={i + 2} />
                <div className="ds-meta">
                  <span className="ds-topic">{['AI', 'Cloud', 'Security'][i]}</span>
                  <time>{['14 October 2026', '2 October 2026', '22 September 2026'][i]}</time>
                </div>
                <h3 className="ds-card-title">{tt}</h3>
              </article>
            ))}
          </div>
        </section>
      );
    case 'pOfficeDirectory':
      return (
        <section className="ds-sec tone-light">
          <h2 className="ds-display">{String(p.title)}</h2>
          <SearchBar label="Find an office by city or country" placeholder="for example: Lisbon" count="42 offices in 22 countries" ctx={ctx} id={id('q')} />
          <h3 className="ds-h">France</h3>
          <div className="ds-grid three">
            <OfficeCard o={['Levallois-Perret', '12 rue Exemple, 92300 Levallois-Perret', '+33 1 23 45 67 89', 'contact.fr@example.com', 'Headquarters']} ti={ti} />
            <OfficeCard o={['Lyon', '8 place Exemple, 69002 Lyon', '+33 4 12 34 56 78', 'lyon@example.com', '']} ti={ti} />
            <OfficeCard o={['Toulouse', '3 allée Exemple, 31000 Toulouse', '+33 5 12 34 56 78', 'toulouse@example.com', '']} ti={ti} />
          </div>
        </section>
      );
    case 'pDocumentLibrary':
      return (
        <section className="ds-sec tone-light ds-narrow-sec">
          <h2 className="ds-display">{String(p.title)}</h2>
          <div className="ds-field" style={{ maxWidth: 200 }}>
            <label className="ds-label" htmlFor={id('y')}>
              Year
            </label>
            <select id={id('y')} className="ds-select" tabIndex={ti} disabled={ctx.mode === 'thumb'}>
              <option>2026</option>
              <option>2025</option>
              <option>2024</option>
            </select>
          </div>
          <ul className="ds-docs">
            {['Half-year results 2026', 'Annual report 2025', 'General meeting 2025'].map((d, i) => (
              <li key={d}>
                <FileText size={20} aria-hidden />
                <span>
                  <span className="ds-u strong">
                    {d} (PDF, {(2.1 + i * 1.3).toFixed(2)}MB)
                  </span>
                  <span className="ds-muted">Published {['24 July 2026', '27 February 2026', '18 June 2025'][i]}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      );
    case 'pLongRead':
      return (
        <section className="ds-sec tone-light ds-longread">
          <nav className="ds-toc" aria-label="Contents">
            <span className="ds-label">Contents</span>
            <ol>
              {['Why back up differently', String(p.chapter), 'Anonymising test data', 'Next steps'].map((c, i) => (
                <li key={c} aria-current={i === 1 ? 'page' : undefined}>
                  {c}
                </li>
              ))}
            </ol>
          </nav>
          <article className="ds-stack">
            <Kicker>{String(p.title)}</Kicker>
            <h2 className="ds-display">{String(p.chapter)}</h2>
            <p>Archive volumes grow faster than budgets. This chapter compares three storage tiers and the retention rules that keep costs flat.</p>
            <p>Each option is scored on cost per terabyte, restore time and compliance with sector regulation.</p>
            <ShareLinks channels={['LinkedIn', 'X', 'Email']} ti={ti} />
            <div className="ds-row space">
              <span className="ds-link">Previous: Why back up differently</span>
              <button type="button" className="ds-link" tabIndex={ti} onClick={ctx.mode === 'interactive' ? () => ctx.onAction?.(inst.id) : undefined}>
                Next: Anonymising test data
              </button>
            </div>
          </article>
        </section>
      );
    case 'pGatedDownload':
      return (
        <section className="ds-sec tone-mint ds-split">
          <div className="ds-stack">
            <Kicker>Whitepaper, 24 pages</Kicker>
            <h2 className="ds-display">{String(p.title)}</h2>
            <ul className="ds-ticks">
              <li>
                <Check size={16} aria-hidden /> The six levers of cloud cost control
              </li>
              <li>
                <Check size={16} aria-hidden /> A maturity grid to place your teams
              </li>
              <li>
                <Check size={16} aria-hidden /> Three client cases with numbers
              </li>
            </ul>
          </div>
          <form className="ds-formcard" onSubmit={(e) => e.preventDefault()}>
            <div className="ds-cover" aria-hidden>
              <Art seed={2} />
              <span>{String(p.title)}</span>
            </div>
            <Field label="Work email" type="email" ctx={ctx} id={id('e')} />
            <Field label="Company" ctx={ctx} id={id('co')} />
            <Consent ctx={ctx} id={id('c')} text="Send me related content. Optional. " />
            <Btn ctx={ctx} inst={inst}>
              {String(p.cta)}
            </Btn>
          </form>
        </section>
      );
    case 'pOfferings':
      return <Offerings tabs={list(p.tabs)} items={list(p.items)} ti={ti} ctx={ctx} inst={inst} />;
    case 'pAssessment': {
      const cur = Number(p.current) || 1;
      const tot = Number(p.total) || 10;
      return (
        <section className="ds-sec tone-accent">
          <div className="ds-narrow ds-stack">
            <div className="ds-progress">
              <span>
                Question {cur} of {tot}
              </span>
              <div className="ds-progress-bar" aria-hidden>
                <span style={{ width: `${(cur / tot) * 100}%` }} />
              </div>
            </div>
            <fieldset className="ds-question">
              <legend className="ds-display">{String(p.question)}</legend>
              {list(p.answers).map((a, i) => (
                <label key={a} className="ds-answer">
                  <input type="radio" name={id('a')} defaultChecked={i === 1} tabIndex={ti} disabled={ctx.mode === 'thumb'} />
                  <span>{a}</span>
                </label>
              ))}
            </fieldset>
            <Btn ctx={ctx} inst={inst}>
              Next question
            </Btn>
          </div>
        </section>
      );
    }
    default:
      return null;
  }
}

function EventCard({ e, past, ctx, inst }: { e: string[]; past: boolean; ctx: Ctx; inst: ComponentInstance }) {
  const [title, day, month, date, format, place] = e;
  return (
    <article className={`ds-event ${past ? 'past' : ''}`}>
      <div className="ds-datebox" aria-hidden>
        <span className="d">{day}</span>
        <span className="m">{month}</span>
      </div>
      <div className="ds-stack tight">
        <div className="ds-meta">
          <span className="ds-topic">{past ? 'Past event' : format}</span>
          <span className="ds-iconline">
            <MapPin size={14} aria-hidden /> {place}
          </span>
        </div>
        <h3 className="ds-card-title">{title}</h3>
        <p className="ds-iconline ds-muted">
          <Clock size={14} aria-hidden /> <time>{date}</time>
        </p>
      </div>
      <button type="button" className={`ds-btn ${past ? 'secondary' : 'primary'} sm`} tabIndex={ctx.mode === 'thumb' ? -1 : undefined} onClick={ctx.mode === 'interactive' ? () => ctx.onAction?.(inst.id) : undefined} aria-label={past ? `Watch the replay of ${title}` : `Register for ${title}`}>
        {past ? 'Watch the replay' : 'Register'}
      </button>
    </article>
  );
}

function JobCard({ j, ctx, inst }: { j: string[]; ctx: Ctx; inst: ComponentInstance }) {
  const [title, loc, practice, contract, remote, posted] = j;
  return (
    <article className="ds-job">
      <div className="ds-stack tight">
        <button type="button" className="ds-job-title" tabIndex={ctx.mode === 'thumb' ? -1 : undefined} onClick={ctx.mode === 'interactive' ? () => ctx.onAction?.(inst.id) : undefined}>
          {title}
        </button>
        <ul className="ds-chips-meta">
          <li>
            <MapPin size={14} aria-hidden /> {loc}
          </li>
          <li>{practice}</li>
          <li>{contract}</li>
          <li>{remote}</li>
        </ul>
      </div>
      <time className="ds-muted">Posted {posted}</time>
    </article>
  );
}

function OfficeCard({ o, ti }: { o: string[]; ti?: number }) {
  const [city, address, phone, email, badge] = o;
  return (
    <article className="ds-office">
      <div className="ds-row space">
        <h3 className="ds-card-title">{city}</h3>
        {badge ? <span className="ds-topic">{badge}</span> : null}
      </div>
      <address>{address}</address>
      <span className="ds-iconline">
        <Phone size={14} aria-hidden /> <span className="ds-u">{phone}</span>
      </span>
      <span className="ds-iconline">
        <Mail size={14} aria-hidden /> <span className="ds-u">{email}</span>
      </span>
      <button type="button" className="ds-link" tabIndex={ti}>
        View {city} office on map
      </button>
    </article>
  );
}

function ShareLinks({ channels, ti }: { channels: string[]; ti?: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="ds-share">
      <span className="ds-label">Share</span>
      {channels.map((c) => (
        <button key={c} type="button" className="ds-pill" tabIndex={ti}>
          {c === 'Email' ? <Mail size={14} aria-hidden /> : <Link2 size={14} aria-hidden />}
          {c === 'Email' ? 'Share by email' : `Share on ${c}`}
        </button>
      ))}
      <button type="button" className="ds-pill" tabIndex={ti} onClick={() => setCopied(true)}>
        <Copy size={14} aria-hidden /> {copied ? 'Link copied' : 'Copy link'}
      </button>
    </div>
  );
}

function LocaleSwitcher({ current, options, ti }: { current: string; options: string[]; ti?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ds-locale">
      <button type="button" className="ds-pill" aria-expanded={open} tabIndex={ti} onClick={() => setOpen(!open)}>
        <Globe size={14} aria-hidden /> {current} <ChevronDown size={14} aria-hidden />
      </button>
      {open ? (
        <ul>
          {options.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Accordion({ items, ti }: { items: string[]; ti?: number }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="ds-accordion">
      {items.map((q, i) => (
        <div key={q}>
          <button type="button" aria-expanded={open === i} tabIndex={ti} onClick={() => setOpen(open === i ? -1 : i)}>
            {q}
            <ChevronDown size={18} aria-hidden style={{ transform: open === i ? 'rotate(180deg)' : undefined }} />
          </button>
          {open === i ? <p>A short, plain answer, with a link to the detail where it helps.</p> : null}
        </div>
      ))}
    </div>
  );
}

function Offerings({ tabs, items, ti, ctx, inst }: { tabs: string[]; items: string[]; ti?: number; ctx: Ctx; inst: ComponentInstance }) {
  const [sel, setSel] = useState(0);
  return (
    <section className="ds-sec tone-light">
      <Kicker>Partner expertise</Kicker>
      <h2 className="ds-display">What we build on {tabs[sel]}</h2>
      <div className="ds-tabs pill" role="tablist">
        {tabs.map((tb, i) => (
          <button key={tb} type="button" role="tab" aria-selected={i === sel} tabIndex={ti ?? (i === sel ? 0 : -1)} onClick={() => setSel(i)}>
            {tb}
          </button>
        ))}
      </div>
      <div className="ds-grid three">
        {items.map((it) => (
          <button key={it} type="button" className="ds-offer" tabIndex={ti} onClick={ctx.mode === 'interactive' ? () => ctx.onAction?.(inst.id) : undefined}>
            <span className="ds-card-title">{it}</span>
            <span className="ds-muted">Certified team, delivery playbook and client references on {tabs[sel]}.</span>
          </button>
        ))}
      </div>
    </section>
  );
}
