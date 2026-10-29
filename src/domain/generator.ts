import type { ComponentDef, ComponentInstance, Insight, Journey, JourneyEdge, JourneyNode, NodeKind, OutcomeTone, UseCase } from './types';

// Rule-based journey generator. A pattern describes steps and branches in terms of catalog
// components; the generator resolves each one against the live component library, skips what
// is missing or deprecated, links the selected insights to the steps they concern, and lays the
// result out on the canvas. The interface (GenerateInput -> GenerateResult) is the seam where a
// model-backed generator can be plugged in later.

export type Topic = 'form-length' | 'progress' | 'errors' | 'code' | 'expiry' | 'next-step' | 'trust' | 'findability' | 'contact' | 'mobile' | 'jobs' | 'events' | 'content' | 'location' | 'investor' | 'assessment' | 'partner' | 'culture' | 'newsletter';

const TOPIC_KEYWORDS: Record<Topic, RegExp> = {
  'form-length': /\b(long|field|form|lengthy|too many)\b/i,
  progress: /\b(step|how long|progress|steps left|duration)\b/i,
  errors: /\b(error|mistake|invalid|wrong|validation)\b/i,
  code: /\b(code|otp|paste|digit)\b/i,
  expiry: /\b(expire|expired|dead end|resend|new code)\b/i,
  'next-step': /\b(dashboard|next|after sign|right after|direct link)\b/i,
  trust: /\b(trust|proof|reference|credib|case stud|result)\b/i,
  findability: /\b(find|search|filter|browse|lost)\b/i,
  contact: /\b(contact|reach|call|talk|expert|reply)\b/i,
  mobile: /\b(mobile|phone|small screen)\b/i,
  jobs: /\b(jobs?|careers?|apply|application|cv|recruit\w*|candidates?|roles?|emplois?|postes?|candidat\w*)\b/i,
  events: /\b(events?|webinars?|summit|replays?|registr\w*|conference|événements?|evenements?|inscri\w*)\b/i,
  content: /\b(whitepapers?|ebooks?|download\w*|gated|chapters?|livre blanc|télécharg\w*|telecharg\w*)\b/i,
  location: /\b(offices?|address|bureaux?|agences?|locations?|map)\b/i,
  investor: /\b(investors?|financial|annual report|press|journalists?|investisseurs?|rapport)\b/i,
  assessment: /\b(assess\w*|maturity|diagnostic|quiz|self-assessment|maturité)\b/i,
  partner: /\b(aws|amazon|microsoft|azure|google cloud|servicenow|partners?|partenaires?|hyperscaler)\b/i,
  culture: /\b(culture|testimonials?|team|teams|équipe|employer)\b/i,
  newsletter: /\b(newsletter|subscri\w*|abonn\w*|tech2tech)\b/i,
};

export function insightTopics(i: Pick<Insight, 'title' | 'detail'>): Topic[] {
  const text = `${i.title} ${i.detail}`;
  return (Object.keys(TOPIC_KEYWORDS) as Topic[]).filter((t) => TOPIC_KEYWORDS[t].test(text));
}

interface CSpec {
  key?: string;
  componentId: string;
  variantId?: string;
  props?: Record<string, string | number | boolean>;
  interaction?: ComponentInstance['interaction'];
}

interface StepSpec {
  key: string;
  kind: NodeKind;
  title: string;
  description: string;
  lane: 'main' | 'alt';
  question?: string;
  tone?: OutcomeTone;
  components?: CSpec[];
  topics?: Topic[];
  /** Design decisions this step embodies, added only when a selected insight supports them. */
  decisions?: { text: string; topic: Topic }[];
}

interface BranchSpec {
  from: string;
  to: string;
  label: string;
  condition?: string;
  kind?: 'main' | 'alternative';
  trigger?: string;
  /** Only generated when error paths are on. */
  errorPath?: boolean;
}

export interface JourneyPattern {
  id: string;
  name: string;
  summary: string;
  /** Where the pattern comes from (bench evidence). */
  basis: string;
  fits: RegExp;
  steps: StepSpec[];
  branches: BranchSpec[];
}

const btn = (key: string, label: string, variantId = 'primary', kind: 'navigate' | 'submit' | 'back' = 'navigate'): CSpec => ({
  key, componentId: 'cmp-button', variantId, props: { label, fullWidth: true, icon: 'none' }, interaction: { kind },
});
const h1 = (text: string): CSpec => ({ componentId: 'cmp-heading', variantId: 'h1', props: { text } });
const txt = (text: string, variantId = 'muted'): CSpec => ({ componentId: 'cmp-text', variantId, props: { text } });
const field = (label: string, type: string, hint = ''): CSpec => ({ componentId: 'cmp-form-field', variantId: 'default', props: { label, hint, type, required: true, error: '' } });
const progress = (current: number, total: number): CSpec => ({ componentId: 'cmp-progress', variantId: 'steps', props: { current, total } });
const alert = (text: string): CSpec => ({ componentId: 'cmp-alert', variantId: 'error', props: { text } });

// Section-based journey patterns, derived from the devoteam.com use cases. Copy uses {vars}.
const sec = (componentId: string, props: Record<string, string | number | boolean> = {}, key?: string, kind: 'navigate' | 'submit' | 'back' | 'none' = 'navigate'): CSpec => ({
  key, componentId, props, ...(key ? { interaction: { kind } } : {}),
});
const header = (key?: string): CSpec => sec('cmp-site-header', { brand: 'Devoteam', items: 'Expertise, Industries, Insights, Careers', cta: 'Contact us' }, key);
const footer: CSpec = sec('cmp-site-footer', { groups: 'Expertise, Company, Careers, Legal' });
const confirm = (title: string, body: string): CSpec => ({ componentId: 'cmp-confirmation', variantId: 'success', props: { title, body } });
const err = (text: string): CSpec => alert(text);
const v = (variantId: string, c: CSpec): CSpec => ({ ...c, variantId });

const SITE_PATTERNS: JourneyPattern[] = [
  {
    id: 'expert-contact',
    name: 'Talk to an expert',
    summary: 'Expertise page with offerings, named experts and proof, then a short contact form and a confirmation that names the reply delay.',
    basis: 'devoteam.com service pages name experts but offer no contact path (site review); Awwwards: always-visible contact action on 8 of 33 sites.',
    fits: /\b(contact|expert|talk|lead|quote|demand|parler|contacter|devis)\b/i,
    steps: [
      { key: 'start', kind: 'start', title: 'Searches for {topic} consulting', description: 'Arrives from search or a campaign.', lane: 'main' },
      { key: 'service', kind: 'screen', title: '{Topic} expertise page', description: 'Value, offerings, named experts, proof and one action.', lane: 'main', topics: ['trust', 'contact', 'partner'],
        components: [header('nav'), v('split', sec('cmp-hero', { title: '{Topic} that delivers, from strategy to run', body: 'Certified teams on {partner}, AWS and Microsoft, in 25 countries.', cta: 'Talk to a {topic} expert' }, 'hero')), sec('pat-offerings', { tabs: '{partner}, AWS, Microsoft', items: 'Assessment and roadmap, Migration factory, Landing zone, FinOps, Managed services, Security by design' }), sec('pat-team', { title: 'Meet the {topic} experts' }, 'team'), sec('pat-quote'), sec('pat-stats')],
        decisions: [{ text: 'Link every named expert to a contact path.', topic: 'contact' }, { text: 'Back the promise with figures and a client quote.', topic: 'trust' }] },
      { key: 'form', kind: 'screen', title: 'Contact form', description: 'Name, work email, topic, message, consent.', lane: 'main', topics: ['form-length', 'errors', 'contact'],
        components: [header(), sec('pat-contact', { title: 'Talk to a {topic} expert', cta: 'Send my request' }, 'send', 'submit')],
        decisions: [{ text: 'Keep the form to four fields and say who replies.', topic: 'form-length' }] },
      { key: 'valid', kind: 'decision', title: 'Request valid?', description: '', question: 'Are the required fields filled and the email well formed?', lane: 'main', topics: ['errors'] },
      { key: 'error', kind: 'screen', title: 'Form with errors', description: 'Summary and the error next to the field.', lane: 'alt', topics: ['errors'],
        components: [err('Check 1 field to send your request.'), { componentId: 'cmp-form-field', variantId: 'inline-error', props: { label: 'Work email', hint: '', type: 'email', required: true, error: 'Enter an email address in the format name@example.com' } }, btn('resend', 'Send my request', 'primary', 'submit')],
        decisions: [{ text: 'Explain the fix next to the field.', topic: 'errors' }] },
      { key: 'thanks', kind: 'screen', title: 'Request sent', description: 'Says who replies and when, then offers reading.', lane: 'main', topics: ['next-step'],
        components: [header(), confirm('Request sent', 'A {topic} expert replies within two working days.'), sec('pat-articles', { title: 'While you wait', topic: '{Topic}' }, 'read')] },
      { key: 'done', kind: 'outcome', title: 'Qualified lead', description: '', tone: 'success', lane: 'main' },
    ],
    branches: [
      { from: 'start', to: 'service', label: 'Opens page' },
      { from: 'service', to: 'form', label: 'Talk to an expert', trigger: 'hero' },
      { from: 'service', to: 'form', label: 'Contact an expert', kind: 'alternative', trigger: 'team' },
      { from: 'service', to: 'form', label: 'Contact us (header)', kind: 'alternative', trigger: 'nav' },
      { from: 'form', to: 'valid', label: 'Send my request', trigger: 'send' },
      { from: 'valid', to: 'thanks', label: 'Valid', condition: 'required fields filled and email well formed' },
      { from: 'valid', to: 'error', label: 'Invalid', condition: 'missing or malformed field', kind: 'alternative', errorPath: true },
      { from: 'error', to: 'valid', label: 'Corrects and resends', kind: 'alternative', trigger: 'resend', errorPath: true },
      { from: 'thanks', to: 'done', label: 'Reads an insight', trigger: 'read' },
    ],
  },
  {
    id: 'browse-cases',
    name: 'Explore success stories',
    summary: 'Filterable case index, an empty state for no results, a case page with figures and quote, then contact.',
    basis: 'devoteam.com story index runs to page 5+ with no sector filter (site review); Awwwards: filterable index on 6 sites, outcome-led cards on 5.',
    fits: /\b(case stud\w*|success stor\w*|references?|portfolio|proof|cas client|témoignages? client)\b/i,
    steps: [
      { key: 'start', kind: 'start', title: 'Opens success stories', description: '', lane: 'main' },
      { key: 'index', kind: 'screen', title: 'Success story index', description: 'Search, filter chips, outcome-led cards.', lane: 'main', topics: ['findability', 'trust'],
        components: [header(), sec('pat-cases', { title: '{Topic} success stories' }, 'card')],
        decisions: [{ text: 'Filter by expertise and industry, and announce the count.', topic: 'findability' }, { text: 'Lead every card with a measured result.', topic: 'trust' }] },
      { key: 'results', kind: 'decision', title: 'Any results?', description: '', question: 'Do the filters match at least one story?', lane: 'main' },
      { key: 'empty', kind: 'screen', title: 'No results', description: '', lane: 'alt', topics: ['findability'],
        components: [header(), { key: 'clear', componentId: 'cmp-empty', variantId: 'no-results', props: { title: 'No story matches these filters', cta: 'Clear filters' }, interaction: { kind: 'back' } }] },
      { key: 'case', kind: 'screen', title: 'Success story', description: 'Context, approach, results, contact.', lane: 'main', topics: ['trust', 'contact'],
        components: [header(), sec('cmp-breadcrumbs', { items: 'Home, Success stories, {Topic}' }), v('compact', sec('cmp-hero', { title: 'How a telecom operator moved 400 applications to {partner}', body: 'Context, approach and measured results.', cta: 'Talk to the team' })), sec('pat-stats', { items: '400: applications migrated; 18 months: from audit to run; 30%: lower run costs' }), sec('pat-quote'), v('brand', sec('cmp-cta-band', { title: 'A similar challenge?', cta: 'Talk to an expert' }, 'cta'))] },
      { key: 'done', kind: 'outcome', title: 'Goes to contact', description: '', tone: 'success', lane: 'main' },
    ],
    branches: [
      { from: 'start', to: 'index', label: 'Opens index' },
      { from: 'index', to: 'results', label: 'Applies filters' },
      { from: 'results', to: 'case', label: 'Has results', condition: 'one or more stories match' },
      { from: 'results', to: 'empty', label: 'No results', condition: 'no story matches', kind: 'alternative', errorPath: true },
      { from: 'empty', to: 'index', label: 'Clear filters', kind: 'alternative', trigger: 'clear', errorPath: true },
      { from: 'index', to: 'case', label: 'Opens a story', kind: 'alternative', trigger: 'card' },
      { from: 'case', to: 'done', label: 'Talk to an expert', trigger: 'cta' },
    ],
  },
  {
    id: 'job-application',
    name: 'Find a job and apply',
    summary: 'Job board with filters and count, a job offer with share links, an application with CV upload, file errors handled.',
    basis: 'devoteam.com: candidates land on offers from search, no job alert (site review); bench-02: job card, filters, file upload (GOV.UK, Carbon, Polaris).',
    fits: /\b(jobs?|careers?|apply|application|recruit\w*|candidat\w*|emplois?|postes?|cv|hiring)\b/i,
    steps: [
      { key: 'start', kind: 'start', title: 'Searches for {role} jobs', description: 'Often lands from search.', lane: 'main', topics: ['jobs'] },
      { key: 'board', kind: 'screen', title: 'Job board', description: 'Search, filters by country and practice, announced count.', lane: 'main', topics: ['jobs', 'findability'],
        components: [header(), sec('pat-jobs', { title: 'Find your next role in {country}', country: '{country}' }, 'job'), footer],
        decisions: [{ text: 'Filter by country and practice and announce the number of jobs.', topic: 'findability' }] },
      { key: 'offer', kind: 'screen', title: 'Job offer', description: 'Missions, profile, share, apply.', lane: 'main', topics: ['jobs', 'culture'],
        components: [header(), sec('cmp-breadcrumbs', { items: 'Careers, Jobs, {role}' }), sec('pat-job-detail', { title: '{role}, {partner}', cta: 'Apply for this role' }, 'apply'), sec('pat-team', { title: 'Who you will work with' })],
        decisions: [{ text: 'Show the team and the real missions on the offer page.', topic: 'culture' }] },
      { key: 'form', kind: 'screen', title: 'Application', description: 'Identity, CV upload, consent.', lane: 'main', topics: ['form-length', 'errors', 'jobs'],
        components: [sec('pat-apply', { title: 'Apply for {role}', cta: 'Send my application' }, 'send', 'submit')],
        decisions: [{ text: 'Ask only for identity and a CV; the rest comes in the interview.', topic: 'form-length' }] },
      { key: 'valid', kind: 'decision', title: 'Application valid?', description: '', question: 'Is the CV attached in an accepted format and size?', lane: 'main', topics: ['errors'] },
      { key: 'error', kind: 'screen', title: 'CV problem', description: 'One specific message per cause.', lane: 'alt', topics: ['errors'],
        components: [err('Check your CV to send your application.'), { componentId: 'cmp-file', variantId: 'default', props: { label: 'Your CV (required)', hint: 'PDF, DOC or DOCX, 5MB maximum', file: '', error: 'The selected file must be smaller than 5MB' } }, btn('retry', 'Send my application', 'primary', 'submit')],
        decisions: [{ text: 'Say exactly why the file was refused: type, size or empty.', topic: 'errors' }] },
      { key: 'thanks', kind: 'screen', title: 'Application sent', description: 'What happens next and when.', lane: 'main', topics: ['next-step', 'jobs'],
        components: [header(), confirm('Application sent', 'A recruiter reads every application and replies within ten working days.'), sec('pat-newsletter', { title: 'Get new {topic} jobs by email', cta: 'Create a job alert' }, 'alert', 'submit')],
        decisions: [{ text: 'Offer a job alert so no candidate leaves empty-handed.', topic: 'jobs' }] },
      { key: 'done', kind: 'outcome', title: 'Candidate in the pipeline', description: '', tone: 'success', lane: 'main' },
    ],
    branches: [
      { from: 'start', to: 'board', label: 'Opens careers' },
      { from: 'board', to: 'offer', label: 'Opens an offer', trigger: 'job' },
      { from: 'offer', to: 'form', label: 'Apply for this role', trigger: 'apply' },
      { from: 'form', to: 'valid', label: 'Send my application', trigger: 'send' },
      { from: 'valid', to: 'thanks', label: 'Valid', condition: 'CV attached, accepted type and size' },
      { from: 'valid', to: 'error', label: 'CV refused', condition: 'missing, wrong type, too big or empty', kind: 'alternative', errorPath: true },
      { from: 'error', to: 'valid', label: 'Attaches another file', kind: 'alternative', trigger: 'retry', errorPath: true },
      { from: 'thanks', to: 'done', label: 'Creates a job alert', trigger: 'alert' },
    ],
  },
  {
    id: 'event-registration',
    name: 'Register for an event',
    summary: 'Event listing filtered by format and country, event page with agenda and form, confirmation with share and replay.',
    basis: 'devoteam.com: events spread across country paths, replays exist (site review); bench-02: event card with time zone (USWDS, UMD, GOV.UK dates).',
    fits: /\b(events?|webinars?|summit|conference|meetup|replay|événements?|evenements?|webinaire|inscri\w*|register)\b/i,
    steps: [
      { key: 'start', kind: 'start', title: 'Sees a promoted event', description: '', lane: 'main', topics: ['events'] },
      { key: 'list', kind: 'screen', title: 'Events and webinars', description: 'Filters by format and country.', lane: 'main', topics: ['events', 'findability'],
        components: [header(), sec('pat-events', { title: 'Upcoming {topic} events' }, 'event')],
        decisions: [{ text: 'One events index with format and country filters.', topic: 'events' }] },
      { key: 'detail', kind: 'screen', title: '{event}', description: 'Time zone, agenda, registration.', lane: 'main', topics: ['events', 'form-length'],
        components: [header(), sec('pat-event-detail', { title: '{event}', cta: 'Register for {event}' }, 'register', 'submit'), sec('pat-team', { title: 'Speakers' })],
        decisions: [{ text: 'Show the time zone and name the event in the button.', topic: 'events' }] },
      { key: 'valid', kind: 'decision', title: 'Seat available and form valid?', description: '', question: 'Is the form valid and a seat still available?', lane: 'main' },
      { key: 'full', kind: 'screen', title: 'Event full', description: 'Offers the replay instead.', lane: 'alt', topics: ['events'],
        components: [header(), { componentId: 'cmp-alert', variantId: 'info', props: { text: 'This event is full. We will send you the replay.' } }, { componentId: 'cmp-event-card', variantId: 'past', props: { title: '{event}', day: '18', month: 'Nov', date: '18 November 2026, 2pm to 5pm CET', format: 'In person', place: '{country}', language: 'English' } }, btn('replay', 'Get the replay', 'primary', 'submit')],
        decisions: [{ text: 'Never leave a full event as a dead end: offer the replay.', topic: 'events' }] },
      { key: 'confirm', kind: 'screen', title: 'Registration confirmed', description: 'Calendar file, share, newsletter.', lane: 'main', topics: ['next-step', 'newsletter'],
        components: [header(), confirm('You are registered', 'Your ticket and a calendar file are on their way. Times are in CET.'), sec('cmp-share', { channels: 'LinkedIn, Email' }), sec('pat-newsletter', {}, 'sub', 'submit')] },
      { key: 'done', kind: 'outcome', title: 'Attendee registered', description: '', tone: 'success', lane: 'main' },
    ],
    branches: [
      { from: 'start', to: 'list', label: 'Opens events' },
      { from: 'list', to: 'detail', label: 'Register', trigger: 'event' },
      { from: 'detail', to: 'valid', label: 'Register for {event}', trigger: 'register' },
      { from: 'valid', to: 'confirm', label: 'Registered', condition: 'form valid and seats left' },
      { from: 'valid', to: 'full', label: 'Full', condition: 'no seat left', kind: 'alternative', errorPath: true },
      { from: 'full', to: 'done', label: 'Gets the replay', kind: 'alternative', trigger: 'replay', errorPath: true },
      { from: 'confirm', to: 'done', label: 'Subscribes', trigger: 'sub' },
    ],
  },
  {
    id: 'gated-download',
    name: 'Download a whitepaper',
    summary: 'Whitepaper landing with benefits and a short form, confirmation, then the chaptered reading experience.',
    basis: 'devoteam.com: whitepapers and chaptered ebooks (site review); bench-02: contents and chapter navigation (NHS, GOV.UK, USWDS).',
    fits: /\b(whitepapers?|ebooks?|download\w*|guide|report|livre blanc|télécharg\w*|telecharg\w*|gated)\b/i,
    steps: [
      { key: 'start', kind: 'start', title: 'Clicks a {topic} whitepaper ad', description: '', lane: 'main', topics: ['content'] },
      { key: 'landing', kind: 'screen', title: 'Whitepaper page', description: 'What you will learn and a three-field form.', lane: 'main', topics: ['content', 'form-length'],
        components: [header(), sec('pat-gated', { title: 'The {topic} playbook for 2027', cta: 'Get the whitepaper' }, 'get', 'submit'), sec('pat-logos')],
        decisions: [{ text: 'Ask for three fields only; marketing consent is optional.', topic: 'form-length' }] },
      { key: 'valid', kind: 'decision', title: 'Form valid?', description: '', question: 'Is the work email well formed?', lane: 'main', topics: ['errors'] },
      { key: 'error', kind: 'screen', title: 'Form with errors', description: '', lane: 'alt', topics: ['errors'],
        components: [err('Check 1 field to get the whitepaper.'), { componentId: 'cmp-form-field', variantId: 'inline-error', props: { label: 'Work email', hint: '', type: 'email', required: true, error: 'Enter an email address in the format name@example.com' } }, btn('again', 'Get the whitepaper', 'primary', 'submit')] },
      { key: 'read', kind: 'screen', title: 'Read online', description: 'Chapters with contents and share links.', lane: 'main', topics: ['content', 'next-step'],
        components: [header(), confirm('Your whitepaper is ready', 'Read it here or find the PDF in your inbox.'), sec('pat-longread', { title: 'The {topic} playbook for 2027', chapter: 'Where the budget goes' }, 'next')],
        decisions: [{ text: 'Let people read online in chapters, not only as a PDF.', topic: 'content' }] },
      { key: 'done', kind: 'outcome', title: 'Lead nurtured', description: '', tone: 'success', lane: 'main' },
    ],
    branches: [
      { from: 'start', to: 'landing', label: 'Opens page' },
      { from: 'landing', to: 'valid', label: 'Get the whitepaper', trigger: 'get' },
      { from: 'valid', to: 'read', label: 'Valid', condition: 'work email well formed' },
      { from: 'valid', to: 'error', label: 'Invalid', condition: 'email missing or malformed', kind: 'alternative', errorPath: true },
      { from: 'error', to: 'valid', label: 'Corrects', kind: 'alternative', trigger: 'again', errorPath: true },
      { from: 'read', to: 'done', label: 'Reads the next chapter', trigger: 'next' },
    ],
  },
  {
    id: 'ai-assessment',
    name: 'Self-assessment',
    summary: 'Home hero leading to a ten-question maturity assessment, a results page with experts and a contact form.',
    basis: 'devoteam.com home hero promotes a short AI maturity self-assessment (site review).',
    fits: /\b(assess\w*|maturity|maturité|diagnostic|quiz|readiness|score)\b/i,
    steps: [
      { key: 'start', kind: 'start', title: 'Lands on the home page', description: '', lane: 'main' },
      { key: 'home', kind: 'screen', title: 'Home', description: 'Hero with the assessment as main action.', lane: 'main', topics: ['assessment'],
        components: [header(), v('split', sec('cmp-hero', { title: 'How ready is your organisation for {topic}?', body: 'Ten questions, ten minutes, a personal report.', cta: 'Start the assessment' }, 'go')), sec('pat-stats'), sec('pat-expertise')],
        decisions: [{ text: 'Promise the time it takes before the first question.', topic: 'progress' }] },
      { key: 'quiz', kind: 'screen', title: 'Assessment question', description: 'One question per screen with progress.', lane: 'main', topics: ['assessment', 'progress'],
        components: [sec('pat-assessment', { question: 'How is {topic} used in your organisation today?' }, 'next', 'submit')],
        decisions: [{ text: 'Show "Question 3 of 10" on every screen.', topic: 'progress' }] },
      { key: 'complete', kind: 'decision', title: 'All questions answered?', description: '', question: 'Has the person answered all ten questions?', lane: 'main' },
      { key: 'results', kind: 'screen', title: 'Your results', description: 'Score, next steps, experts and contact.', lane: 'main', topics: ['next-step', 'contact'],
        components: [header(), confirm('Your {topic} maturity: level 2 of 4', 'You have working pilots. The next step is governance and scale.'), sec('pat-team', { title: 'Experts who can help you reach level 3' }), sec('pat-contact', { title: 'Discuss your results', cta: 'Book a 30-minute call' }, 'book', 'submit')],
        decisions: [{ text: 'End with a named next step, not just a score.', topic: 'next-step' }] },
      { key: 'done', kind: 'outcome', title: 'Assessment lead qualified', description: '', tone: 'success', lane: 'main' },
    ],
    branches: [
      { from: 'start', to: 'home', label: 'Opens home' },
      { from: 'home', to: 'quiz', label: 'Start the assessment', trigger: 'go' },
      { from: 'quiz', to: 'complete', label: 'Next question', trigger: 'next' },
      { from: 'complete', to: 'results', label: 'Yes', condition: 'question 10 answered' },
      { from: 'complete', to: 'quiz', label: 'Not yet', condition: 'questions remaining', kind: 'alternative' },
      { from: 'results', to: 'done', label: 'Book a call', trigger: 'book' },
    ],
  },
  {
    id: 'office-finder',
    name: 'Find an office',
    summary: 'Office directory with search by city or country and consistent office cards.',
    basis: 'devoteam.com office list is long with no filter or map and inconsistent fields (site review); bench-02 office card (GOV.UK contact pattern).',
    fits: /\b(offices?|bureaux?|address|adresse|agences?|locations?|near me|près de)\b/i,
    steps: [
      { key: 'start', kind: 'start', title: 'Needs a local contact', description: '', lane: 'main', topics: ['location'] },
      { key: 'dir', kind: 'screen', title: 'Our offices', description: 'Search, grouped by country, map links.', lane: 'main', topics: ['location', 'findability'],
        components: [header(), sec('pat-offices', { title: 'Our offices in {country} and worldwide' }), sec('cmp-locale'), footer],
        decisions: [{ text: 'Same fields on every office card, phone in international format.', topic: 'location' }] },
      { key: 'found', kind: 'decision', title: 'Office found?', description: '', question: 'Does the search match an office?', lane: 'main' },
      { key: 'none', kind: 'screen', title: 'No office matches', description: '', lane: 'alt', topics: ['findability'],
        components: [header(), { key: 'clear', componentId: 'cmp-empty', variantId: 'no-results', props: { title: 'No office in this city', cta: 'Show all offices' }, interaction: { kind: 'back' } }, sec('pat-contact', { title: 'Or write to us', cta: 'Send my request' }, 'write', 'submit')] },
      { key: 'done', kind: 'outcome', title: 'Office contacted', description: '', tone: 'success', lane: 'main' },
    ],
    branches: [
      { from: 'start', to: 'dir', label: 'Opens offices' },
      { from: 'dir', to: 'found', label: 'Searches' },
      { from: 'found', to: 'done', label: 'Found', condition: 'one or more offices match' },
      { from: 'found', to: 'none', label: 'Not found', condition: 'no office matches', kind: 'alternative', errorPath: true },
      { from: 'none', to: 'dir', label: 'Show all offices', kind: 'alternative', trigger: 'clear', errorPath: true },
      { from: 'none', to: 'done', label: 'Writes to us', kind: 'alternative', trigger: 'write', errorPath: true },
    ],
  },
  {
    id: 'insights-newsletter',
    name: 'Read insights and subscribe',
    summary: 'Topic hub of articles, a long read with contents and share links, and a newsletter sign-up.',
    basis: 'devoteam.com content split across magazine, expert view and topic hubs; newsletter on its own page (site review).',
    fits: /\b(insights?|articles?|blog|magazine|read|newsletter|subscri\w*|abonn\w*|thought leadership)\b/i,
    steps: [
      { key: 'start', kind: 'start', title: 'Arrives on an article from search', description: '', lane: 'main', topics: ['content'] },
      { key: 'hub', kind: 'screen', title: '{Topic} insights', description: 'Topic hub across content types.', lane: 'main', topics: ['findability', 'content'],
        components: [header(), sec('pat-articles', { title: 'Expert views on {topic}', topic: '{Topic}' }, 'open'), sec('pat-newsletter', {}, 'sub', 'submit')],
        decisions: [{ text: 'One hub per topic across articles, ebooks and events.', topic: 'findability' }] },
      { key: 'article', kind: 'screen', title: 'Article', description: 'Contents, share links, newsletter in context.', lane: 'main', topics: ['content', 'newsletter'],
        components: [header(), sec('pat-longread', { title: 'Expert view', chapter: 'What {topic} changes for IT operations' }), sec('pat-newsletter', {}, 'sub2', 'submit')],
        decisions: [{ text: 'Offer the newsletter inside the article, not only on its own page.', topic: 'newsletter' }] },
      { key: 'valid', kind: 'decision', title: 'Email valid?', description: '', question: 'Is the email well formed and consent given?', lane: 'main', topics: ['errors'] },
      { key: 'error', kind: 'screen', title: 'Sign-up error', description: '', lane: 'alt', topics: ['errors'],
        components: [err('Enter an email address in the format name@example.com'), btn('again', 'Subscribe', 'primary', 'submit')] },
      { key: 'thanks', kind: 'screen', title: 'Subscribed', description: '', lane: 'main', topics: ['next-step'],
        components: [header(), confirm('You are subscribed', 'The next issue arrives on the first Tuesday of the month.'), sec('pat-articles', { title: 'Keep reading' }, 'more')] },
      { key: 'done', kind: 'outcome', title: 'Subscriber gained', description: '', tone: 'success', lane: 'main' },
    ],
    branches: [
      { from: 'start', to: 'hub', label: 'Opens hub' },
      { from: 'hub', to: 'article', label: 'Opens an article', trigger: 'open' },
      { from: 'hub', to: 'valid', label: 'Subscribes from the hub', kind: 'alternative', trigger: 'sub' },
      { from: 'article', to: 'valid', label: 'Subscribe', trigger: 'sub2' },
      { from: 'valid', to: 'thanks', label: 'Valid', condition: 'email well formed and consent given' },
      { from: 'valid', to: 'error', label: 'Invalid', condition: 'email malformed', kind: 'alternative', errorPath: true },
      { from: 'error', to: 'valid', label: 'Corrects', kind: 'alternative', trigger: 'again', errorPath: true },
      { from: 'thanks', to: 'done', label: 'Keeps reading', trigger: 'more' },
    ],
  },
  {
    id: 'investor-docs',
    name: 'Find financial documents',
    summary: 'Investor page with documents filtered by year, each link stating type and size.',
    basis: 'devoteam.com reports sit as loose PDFs (site review); bench-02 document list (GOV.UK attachment and document list).',
    fits: /\b(investors?|financial|annual report|shareholders?|press|journalists?|investisseurs?|actionnaires?|résultats)\b/i,
    steps: [
      { key: 'start', kind: 'start', title: 'Results day', description: '', lane: 'main', topics: ['investor'] },
      { key: 'docs', kind: 'screen', title: 'Financial information', description: 'Year filter, documents with type and size.', lane: 'main', topics: ['investor', 'findability'],
        components: [header(), v('compact', sec('cmp-hero', { title: 'Investors', body: 'Results, reports and general meetings.', cta: 'Latest results' })), sec('pat-docs'), footer],
        decisions: [{ text: 'Filter documents by year and state type and size in each link.', topic: 'investor' }] },
      { key: 'done', kind: 'outcome', title: 'Document found', description: '', tone: 'success', lane: 'main' },
    ],
    branches: [
      { from: 'start', to: 'docs', label: 'Opens investors' },
      { from: 'docs', to: 'done', label: 'Opens a report' },
    ],
  },
  {
    id: 'faq',
    name: 'Find an answer',
    summary: 'FAQ section with a contact fallback when the answer is missing.',
    basis: 'Webflow P1 accordion; Awwwards contact pattern as the fallback.',
    fits: /\b(help|faq|questions?|answers?|support|aide)\b/i,
    steps: [
      { key: 'start', kind: 'start', title: 'Has a question', description: '', lane: 'main' },
      { key: 'help', kind: 'screen', title: 'Help', description: '', lane: 'main', topics: ['findability'],
        components: [header(), sec('pat-faq', { title: 'Questions about {topic}' }), v('brand', sec('cmp-cta-band', { title: 'Still a question?', cta: 'Ask an expert' }, 'ask'))],
        decisions: [{ text: 'Write questions the way people ask them.', topic: 'findability' }] },
      { key: 'found', kind: 'decision', title: 'Answer found?', description: '', question: 'Did the answer solve the problem?', lane: 'main' },
      { key: 'contact', kind: 'screen', title: 'Ask an expert', description: '', lane: 'alt', topics: ['contact'],
        components: [header(), sec('pat-contact', { title: 'Ask a {topic} expert', cta: 'Send my question' }, 'send', 'submit')] },
      { key: 'done', kind: 'outcome', title: 'Question answered', description: '', tone: 'success', lane: 'main' },
      { key: 'ticket', kind: 'outcome', title: 'Question sent', description: '', tone: 'neutral', lane: 'alt' },
    ],
    branches: [
      { from: 'start', to: 'help', label: 'Opens help' },
      { from: 'help', to: 'found', label: 'Reads an answer' },
      { from: 'help', to: 'contact', label: 'Ask an expert', kind: 'alternative', trigger: 'ask' },
      { from: 'found', to: 'done', label: 'Yes', condition: 'answer marked helpful' },
      { from: 'found', to: 'contact', label: 'No', condition: 'answer marked unhelpful', kind: 'alternative', errorPath: true },
      { from: 'contact', to: 'ticket', label: 'Send my question', trigger: 'send', kind: 'alternative' },
    ],
  },
];

export const PATTERNS: JourneyPattern[] = [
  {
    id: 'signup',
    name: 'Account creation',
    summary: 'Welcome, short form, email verification, confirmation. Error and expired-code paths included.',
    basis: 'Registration scenario of the product vision; inline validation and paste-friendly code input from the content and component bench.',
    fits: /\b(account|sign ?up|register|registration|onboard)\b/i,
    steps: [
      { key: 'start', kind: 'start', title: 'Arrives from invitation', description: 'Entry from an email or a sign-up link.', lane: 'main' },
      { key: 'welcome', kind: 'screen', title: 'Welcome', description: 'Sets expectations and starts the task.', lane: 'main', topics: ['progress'],
        components: [progress(1, 3), h1('Create your account'), txt('Three short steps, less than a minute.'), btn('go', 'Get started'), { componentId: 'cmp-link', variantId: 'standalone', props: { label: 'Already have an account? Sign in' }, interaction: { kind: 'none' } }],
        decisions: [{ text: 'Announce the number of steps up front.', topic: 'progress' }] },
      { key: 'form', kind: 'screen', title: 'Your details', description: 'Only the fields needed now.', lane: 'main', topics: ['form-length', 'errors'],
        components: [progress(1, 3), h1('Your details'), field('Full name', 'text'), field('Work email', 'email', 'We send a code to this address.'), field('Password', 'password', 'At least 12 characters.'), { componentId: 'cmp-checkbox', variantId: 'default', props: { label: 'I accept the terms of use' } }, btn('submit', 'Create account', 'primary', 'submit')],
        decisions: [{ text: 'Ask for three fields only; the rest comes later.', topic: 'form-length' }, { text: 'Validate each field when it loses focus.', topic: 'errors' }] },
      { key: 'valid', kind: 'decision', title: 'Details valid?', description: 'Format and password rules.', question: 'Are all fields valid?', lane: 'main', topics: ['errors'] },
      { key: 'form-error', kind: 'screen', title: 'Form with errors', description: 'Errors next to the fields, focus on the first one.', lane: 'alt', topics: ['errors'],
        components: [alert('Check 1 field to continue.'), { componentId: 'cmp-form-field', variantId: 'inline-error', props: { label: 'Work email', hint: '', type: 'email', required: true, error: 'Enter an email address in the format name@example.com' } }, btn('retry', 'Create account', 'primary', 'submit')],
        decisions: [{ text: 'Show a summary and the error under the field.', topic: 'errors' }] },
      { key: 'verify', kind: 'screen', title: 'Verify email', description: 'One-time code, paste supported.', lane: 'main', topics: ['code'],
        components: [progress(2, 3), h1('Check your email'), { componentId: 'cmp-code', variantId: 'segmented', props: { length: 6, label: 'Enter the 6-digit code we sent to your work email' } }, btn('verify', 'Verify email', 'primary', 'submit'), btn('resend', 'Send a new code', 'ghost')],
        decisions: [{ text: 'Accept a pasted code in one action.', topic: 'code' }] },
      { key: 'code-ok', kind: 'decision', title: 'Code accepted?', description: 'Matches and not expired.', question: 'Is the code correct and still valid?', lane: 'main' },
      { key: 'code-error', kind: 'screen', title: 'Code problem', description: 'Wrong or expired code, with a way out.', lane: 'alt', topics: ['expiry', 'code'],
        components: [alert('This code has expired. Codes are valid for 10 minutes.'), { componentId: 'cmp-code', variantId: 'segmented', props: { length: 6, label: 'Enter the 6-digit code' } }, btn('retry-code', 'Verify email', 'primary', 'submit'), btn('new-code', 'Send a new code', 'secondary')],
        decisions: [{ text: 'Always offer a new code next to the error.', topic: 'expiry' }] },
      { key: 'confirm', kind: 'screen', title: 'Account created', description: 'Confirms and points to the next step.', lane: 'main', topics: ['next-step'],
        components: [progress(3, 3), { componentId: 'cmp-confirmation', variantId: 'success', props: { title: 'Account created', body: 'Your dashboard is ready.' } }, btn('open', 'Open my dashboard')],
        decisions: [{ text: 'Link straight to what the person came for.', topic: 'next-step' }] },
      { key: 'done', kind: 'outcome', title: 'Registered and verified', description: '', tone: 'success', lane: 'main' },
    ],
    branches: [
      { from: 'start', to: 'welcome', label: 'Opens link' },
      { from: 'welcome', to: 'form', label: 'Get started', trigger: 'go' },
      { from: 'form', to: 'valid', label: 'Create account', trigger: 'submit' },
      { from: 'valid', to: 'verify', label: 'Valid', condition: 'all fields pass validation' },
      { from: 'valid', to: 'form-error', label: 'Invalid', condition: 'one or more fields fail validation', kind: 'alternative', errorPath: true },
      { from: 'form-error', to: 'valid', label: 'Corrects and retries', kind: 'alternative', trigger: 'retry', errorPath: true },
      { from: 'verify', to: 'code-ok', label: 'Verify email', trigger: 'verify' },
      { from: 'verify', to: 'verify', label: 'Sends a new code', kind: 'alternative', trigger: 'resend' },
      { from: 'code-ok', to: 'confirm', label: 'Accepted', condition: 'code matches and is under 10 minutes old' },
      { from: 'code-ok', to: 'code-error', label: 'Wrong or expired', condition: 'code mismatch or expired', kind: 'alternative', errorPath: true },
      { from: 'code-error', to: 'code-ok', label: 'Retries', kind: 'alternative', trigger: 'retry-code', errorPath: true },
      { from: 'code-error', to: 'verify', label: 'Sends a new code', kind: 'alternative', trigger: 'new-code', errorPath: true },
      { from: 'confirm', to: 'done', label: 'Open my dashboard', trigger: 'open' },
    ],
  },
  {
    id: 'recover',
    name: 'Access recovery',
    summary: 'Request a new code, handle unknown emails without revealing accounts, confirm.',
    basis: 'Support-ticket insights on expired codes; GOV.UK-style error messages from the content bench.',
    fits: /\b(recover|reset|forgot|expired|access|lost)\b/i,
    steps: [
      { key: 'start', kind: 'start', title: 'Code expired', description: '', lane: 'main', topics: ['expiry'] },
      { key: 'request', kind: 'screen', title: 'Request a new code', description: '', lane: 'main', topics: ['expiry'],
        components: [h1('Get a new code'), field('Work email', 'email'), btn('send', 'Send code', 'primary', 'submit')],
        decisions: [{ text: 'One field and one action to get unstuck.', topic: 'expiry' }] },
      { key: 'known', kind: 'decision', title: 'Email well formed?', description: '', question: 'Is the email address in a valid format?', lane: 'main' },
      { key: 'error', kind: 'screen', title: 'Email format error', description: '', lane: 'alt', topics: ['errors'],
        components: [{ componentId: 'cmp-form-field', variantId: 'inline-error', props: { label: 'Work email', hint: '', type: 'email', required: true, error: 'Enter an email address in the format name@example.com' } }, btn('again', 'Send code', 'primary', 'submit')],
        decisions: [{ text: 'Name the expected format in the error.', topic: 'errors' }] },
      { key: 'sent', kind: 'screen', title: 'Code sent', description: 'Same message whether or not an account exists.', lane: 'main', topics: ['next-step'],
        components: [{ componentId: 'cmp-confirmation', variantId: 'info', props: { title: 'Check your email', body: 'If an account uses this address, a new code is on its way.' } }, btn('enter', 'Enter my code')] },
      { key: 'done', kind: 'outcome', title: 'Back on track', description: '', tone: 'success', lane: 'main' },
    ],
    branches: [
      { from: 'start', to: 'request', label: 'Opens link' },
      { from: 'request', to: 'known', label: 'Send code', trigger: 'send' },
      { from: 'known', to: 'sent', label: 'Valid format', condition: 'email matches name@domain' },
      { from: 'known', to: 'error', label: 'Invalid format', condition: 'email malformed', kind: 'alternative', errorPath: true },
      { from: 'error', to: 'known', label: 'Corrects', kind: 'alternative', trigger: 'again', errorPath: true },
      { from: 'sent', to: 'done', label: 'Enter my code', trigger: 'enter' },
    ],
  },
  ...SITE_PATTERNS,
];

export type VarName = 'topic' | 'Topic' | 'partner' | 'country' | 'role' | 'event';
export const DEFAULT_VARS: Record<VarName, string> = { topic: 'cloud', Topic: 'Cloud', partner: 'Google Cloud', country: 'France', role: 'Cloud Architect', event: 'Cloud Summit Paris' };

const fill = (v: unknown, vars: Record<VarName, string>): unknown => (typeof v === 'string' ? v.replace(/\{(topic|Topic|partner|country|role|event)\}/g, (_, k: VarName) => vars[k]) : v);

export interface GenerateInput {
  name: string;
  patternId: string;
  useCase: UseCase | null;
  insights: Insight[];
  includeErrorPaths: boolean;
  /** Values substituted for {topic}, {Topic}, {partner}, {country}, {role}, {event} in the pattern copy. */
  vars?: Partial<Record<VarName, string>>;
}

export interface GenerateResult {
  journey: Journey;
  usedComponentIds: string[];
  skipped: { componentId: string; reason: string }[];
  linkedInsights: { insightId: string; nodeTitles: string[] }[];
  unmatchedInsightIds: string[];
}

/** Suggest the best pattern for a use case from its title and goal. */
export function suggestPattern(useCase: UseCase | null): JourneyPattern {
  if (useCase) {
    const text = `${useCase.title} ${useCase.goal} ${useCase.businessObjective}`;
    let best: JourneyPattern | null = null;
    let bestScore = 0;
    for (const p of PATTERNS) {
      const n = (text.match(new RegExp(p.fits.source, 'gi')) ?? []).length;
      if (n > bestScore) {
        best = p;
        bestScore = n;
      }
    }
    if (best) return best;
  }
  return PATTERNS[0];
}

export function generateJourney(input: GenerateInput, catalog: ComponentDef[], makeId: (p: string) => string, now = new Date()): GenerateResult {
  const pattern = PATTERNS.find((p) => p.id === input.patternId) ?? PATTERNS[0];
  const vars = { ...DEFAULT_VARS, ...(input.vars ?? {}) };
  const usable = new Map(catalog.filter((c) => c.status !== 'deprecated').map((c) => [c.id, c]));
  const skipped: GenerateResult['skipped'] = [];
  const used = new Set<string>();

  const steps = pattern.steps.filter((s) => input.includeErrorPaths || s.lane === 'main' || pattern.branches.some((b) => b.to === s.key && !b.errorPath));
  const keepStep = new Set(steps.map((s) => s.key));
  const branches = pattern.branches.filter((b) => (input.includeErrorPaths || !b.errorPath) && keepStep.has(b.from) && keepStep.has(b.to));

  const topicsByInsight = new Map(input.insights.map((i) => [i.id, insightTopics(i)]));
  const nodeIdByKey = new Map<string, string>();
  const triggerIdByKey = new Map<string, string>();

  let mainCol = 0;
  const altCols = new Map<string, number>();
  const nodes: JourneyNode[] = steps.map((s) => {
    const id = makeId('n');
    nodeIdByKey.set(s.key, id);
    let x: number;
    let y: number;
    if (s.lane === 'main') {
      x = mainCol * 300;
      y = s.kind === 'start' || s.kind === 'outcome' || s.kind === 'decision' ? 120 : 40;
      mainCol++;
    } else {
      const parent = pattern.branches.find((b) => b.to === s.key)?.from;
      const parentIdx = parent ? steps.findIndex((x2) => x2.key === parent) : mainCol;
      const col = Math.max(0, steps.slice(0, parentIdx + 1).filter((x2) => x2.lane === 'main').length - 1);
      const stack = altCols.get(String(col)) ?? 0;
      altCols.set(String(col), stack + 1);
      x = col * 300;
      y = 380 + stack * 300;
    }

    const components: ComponentInstance[] = [];
    for (const c of s.components ?? []) {
      const def = usable.get(c.componentId);
      if (!def) {
        skipped.push({ componentId: c.componentId, reason: catalog.some((k) => k.id === c.componentId) ? 'deprecated in the library' : 'not in the library' });
        continue;
      }
      const iid = makeId('ci');
      if (c.key) triggerIdByKey.set(c.key, iid);
      used.add(def.id);
      const props: ComponentInstance['props'] = {};
      for (const p of def.props) props[p.name] = p.defaultValue;
      for (const [k, v] of Object.entries(c.props ?? {})) props[k] = fill(v, vars) as string | number | boolean;
      const variantId = def.variants.some((v) => v.id === c.variantId) ? c.variantId! : def.variants[0].id;
      components.push({ id: iid, componentId: def.id, variantId, props, ...(c.interaction ? { interaction: c.interaction } : {}) });
    }

    const insightIds = input.insights.filter((i) => (s.topics ?? []).some((t) => topicsByInsight.get(i.id)?.includes(t))).map((i) => i.id);
    const decisions = (s.decisions ?? [])
      .map((d) => ({ d, ids: input.insights.filter((i) => topicsByInsight.get(i.id)?.includes(d.topic)).map((i) => i.id) }))
      .filter((x2) => x2.ids.length > 0)
      .map((x2) => ({ id: makeId('d'), text: String(fill(x2.d.text, vars)), insightIds: x2.ids }));

    return {
      id, kind: s.kind, title: String(fill(s.title, vars)), description: String(fill(s.description, vars)), position: { x, y }, components,
      ...(s.question ? { question: String(fill(s.question, vars)) } : {}), ...(s.tone ? { tone: s.tone } : {}),
      insightIds, decisions,
    };
  });

  // Insights that matched no step are attached to the first screen, so they stay visible as context.
  const linked = new Set(nodes.flatMap((n) => n.insightIds));
  const unmatched = input.insights.filter((i) => !linked.has(i.id)).map((i) => i.id);
  const firstScreen = nodes.find((n) => n.kind === 'screen');
  if (firstScreen && unmatched.length) firstScreen.insightIds = [...firstScreen.insightIds, ...unmatched];

  const edges: JourneyEdge[] = branches.map((b) => ({
    id: makeId('e'),
    source: nodeIdByKey.get(b.from)!,
    target: nodeIdByKey.get(b.to)!,
    label: String(fill(b.label, vars)),
    kind: b.kind ?? 'main',
    ...(b.condition ? { condition: b.condition } : {}),
    ...(b.trigger && triggerIdByKey.has(b.trigger) ? { triggerInstanceId: triggerIdByKey.get(b.trigger) } : {}),
  }));

  const t = now.toISOString();
  const journey: Journey = {
    id: makeId('jr'), name: input.name, useCaseId: input.useCase?.id ?? null, status: 'draft', folder: 'Generated',
    nodes, edges, createdAt: t, updatedAt: t,
  };

  return {
    journey,
    usedComponentIds: [...used],
    skipped,
    linkedInsights: input.insights.map((i) => ({ insightId: i.id, nodeTitles: nodes.filter((n) => n.insightIds.includes(i.id)).map((n) => n.title) })),
    unmatchedInsightIds: unmatched,
  };
}
