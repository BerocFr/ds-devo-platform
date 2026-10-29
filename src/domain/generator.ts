import type { ComponentDef, ComponentInstance, Insight, Journey, JourneyEdge, JourneyNode, NodeKind, OutcomeTone, UseCase } from './types';

// Rule-based journey generator. A pattern describes steps and branches in terms of catalog
// components; the generator resolves each one against the live component library, skips what
// is missing or deprecated, links the selected insights to the steps they concern, and lays the
// result out on the canvas. The interface (GenerateInput -> GenerateResult) is the seam where a
// model-backed generator can be plugged in later.

type Topic = 'form-length' | 'progress' | 'errors' | 'code' | 'expiry' | 'next-step' | 'trust' | 'findability' | 'contact' | 'mobile';

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
    id: 'contact',
    name: 'Contact request',
    summary: 'From a service page to a short contact form and a confirmation that says when you will hear back.',
    basis: 'Awwwards bench: one always-visible contact action (8 of 33 sites); Webflow P0 form field set.',
    fits: /\b(contact|lead|enquir|inquir|request|quote|talk|expert)\b/i,
    steps: [
      { key: 'start', kind: 'start', title: 'Lands on a service page', description: 'From search or a campaign.', lane: 'main' },
      { key: 'service', kind: 'screen', title: 'Service page', description: 'Value, proof, one action.', lane: 'main', topics: ['trust', 'contact'],
        components: [{ key: 'nav-cta', componentId: 'cmp-site-header', variantId: 'default', props: { brand: 'Devoteam', items: 'Services, Industries, Insights, Careers', cta: 'Contact us' }, interaction: { kind: 'navigate' } }, { componentId: 'cmp-hero', variantId: 'split', props: { title: 'Cloud migration without downtime', body: 'Plan, move and run your platforms with one team.', cta: 'Talk to an expert' } }, { componentId: 'cmp-stat', variantId: 'default', props: { value: '40%', label: 'average hosting cost reduction' } }, { componentId: 'cmp-testimonial', variantId: 'default', props: {} }, { key: 'band', componentId: 'cmp-cta-band', variantId: 'brand', props: { title: 'Have a project in mind?', cta: 'Contact our team' }, interaction: { kind: 'navigate' } }],
        decisions: [{ text: 'Keep one contact action visible at all times.', topic: 'contact' }, { text: 'Back the promise with a figure and a client quote.', topic: 'trust' }] },
      { key: 'form', kind: 'screen', title: 'Contact form', description: 'Four fields, topic pre-filled.', lane: 'main', topics: ['form-length', 'errors'],
        components: [h1('Tell us about your project'), field('Full name', 'text'), field('Work email', 'email'), { componentId: 'cmp-select', variantId: 'default', props: { label: 'Topic', options: 'Cloud, Data and AI, Cybersecurity, Other' } }, { componentId: 'cmp-textarea', variantId: 'default', props: {} }, btn('send', 'Send request', 'primary', 'submit')],
        decisions: [{ text: 'Limit the form to four fields.', topic: 'form-length' }] },
      { key: 'valid', kind: 'decision', title: 'Request valid?', description: '', question: 'Are the required fields filled correctly?', lane: 'main' },
      { key: 'error', kind: 'screen', title: 'Form with errors', description: '', lane: 'alt', topics: ['errors'],
        components: [alert('Check 1 field to send your request.'), { componentId: 'cmp-form-field', variantId: 'inline-error', props: { label: 'Work email', hint: '', type: 'email', required: true, error: 'Enter an email address in the format name@example.com' } }, btn('resend', 'Send request', 'primary', 'submit')],
        decisions: [{ text: 'Explain the fix next to the field.', topic: 'errors' }] },
      { key: 'thanks', kind: 'screen', title: 'Request sent', description: 'Says who replies and when.', lane: 'main', topics: ['next-step', 'contact'],
        components: [{ componentId: 'cmp-confirmation', variantId: 'success', props: { title: 'Request sent', body: 'An expert replies within two working days.' } }, btn('more', 'Read our case studies', 'secondary')],
        decisions: [{ text: 'State the reply delay in the confirmation.', topic: 'contact' }] },
      { key: 'done', kind: 'outcome', title: 'Lead qualified', description: '', tone: 'success', lane: 'main' },
    ],
    branches: [
      { from: 'start', to: 'service', label: 'Opens page' },
      { from: 'service', to: 'form', label: 'Contact our team', trigger: 'band' },
      { from: 'service', to: 'form', label: 'Contact us (header)', kind: 'alternative', trigger: 'nav-cta' },
      { from: 'form', to: 'valid', label: 'Send request', trigger: 'send' },
      { from: 'valid', to: 'thanks', label: 'Valid', condition: 'required fields filled and email well formed' },
      { from: 'valid', to: 'error', label: 'Invalid', condition: 'missing or malformed field', kind: 'alternative', errorPath: true },
      { from: 'error', to: 'valid', label: 'Corrects and resends', kind: 'alternative', trigger: 'resend', errorPath: true },
      { from: 'thanks', to: 'done', label: 'Read our case studies', trigger: 'more' },
    ],
  },
  {
    id: 'browse-cases',
    name: 'Explore case studies',
    summary: 'Filterable index of outcome-led case cards, an empty state for no results, a case page that ends on contact.',
    basis: 'Awwwards bench: filterable work index (6 sites), outcome-led case cards (5), fixed case template (context, approach, results).',
    fits: /\b(case stud|reference|portfolio|work|browse|explore|insight)\b/i,
    steps: [
      { key: 'start', kind: 'start', title: 'Opens the case study index', description: '', lane: 'main' },
      { key: 'index', kind: 'screen', title: 'Case study index', description: 'Filter by expertise, scan outcomes.', lane: 'main', topics: ['findability', 'trust'],
        components: [{ componentId: 'cmp-breadcrumbs', variantId: 'default', props: {} }, h1('Case studies'), { componentId: 'cmp-tag', variantId: 'filter', props: { items: 'Cloud, Data, AI, Security' } }, { key: 'card', componentId: 'cmp-case-card', variantId: 'default', props: {}, interaction: { kind: 'navigate' } }, { componentId: 'cmp-case-card', variantId: 'default', props: { title: 'Bank: fraud detection with AI', body: 'False positives down by a third.' } }],
        decisions: [{ text: 'Filter by expertise with chips that announce the result count.', topic: 'findability' }, { text: 'Lead every card with a measured result.', topic: 'trust' }] },
      { key: 'results', kind: 'decision', title: 'Any results?', description: '', question: 'Do the filters match at least one case?', lane: 'main' },
      { key: 'empty', kind: 'screen', title: 'No results', description: '', lane: 'alt', topics: ['findability'],
        components: [{ key: 'clear', componentId: 'cmp-empty', variantId: 'no-results', props: {}, interaction: { kind: 'back' } }],
        decisions: [{ text: 'Offer to clear filters instead of a blank list.', topic: 'findability' }] },
      { key: 'case', kind: 'screen', title: 'Case study', description: 'Context, approach, results, contact.', lane: 'main', topics: ['trust', 'contact'],
        components: [{ componentId: 'cmp-breadcrumbs', variantId: 'default', props: { items: 'Home, Case studies, Retail cloud migration' } }, h1('Retail group: cloud migration'), { componentId: 'cmp-tabs', variantId: 'line', props: {} }, { componentId: 'cmp-stat', variantId: 'default', props: { value: '9 months', label: 'from audit to full migration' } }, { componentId: 'cmp-testimonial', variantId: 'default', props: {} }, { key: 'cta', componentId: 'cmp-cta-band', variantId: 'brand', props: {}, interaction: { kind: 'navigate' } }],
        decisions: [{ text: 'Same structure for every case: context, approach, results.', topic: 'trust' }] },
      { key: 'done', kind: 'outcome', title: 'Goes to contact', description: '', tone: 'success', lane: 'main' },
    ],
    branches: [
      { from: 'start', to: 'index', label: 'Opens index' },
      { from: 'index', to: 'results', label: 'Applies filters' },
      { from: 'results', to: 'case', label: 'Has results', condition: 'one or more cases match', trigger: undefined },
      { from: 'results', to: 'empty', label: 'No results', condition: 'no case matches', kind: 'alternative', errorPath: true },
      { from: 'empty', to: 'index', label: 'Clear filters', kind: 'alternative', trigger: 'clear', errorPath: true },
      { from: 'index', to: 'case', label: 'Opens a case', kind: 'alternative', trigger: 'card' },
      { from: 'case', to: 'done', label: 'Contact our team', trigger: 'cta' },
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
  {
    id: 'faq',
    name: 'Find an answer',
    summary: 'Help page with questions, and a contact fallback when the answer is missing.',
    basis: 'Webflow P1 accordion; Awwwards contact pattern as the fallback.',
    fits: /\b(help|faq|question|answer|support)\b/i,
    steps: [
      { key: 'start', kind: 'start', title: 'Has a question', description: '', lane: 'main' },
      { key: 'help', kind: 'screen', title: 'Help centre', description: '', lane: 'main', topics: ['findability'],
        components: [h1('How can we help?'), { componentId: 'cmp-accordion', variantId: 'single', props: {} }, { key: 'contact', componentId: 'cmp-link', variantId: 'standalone', props: { label: 'Ask our support team' }, interaction: { kind: 'navigate' } }],
        decisions: [{ text: 'Write questions the way people ask them.', topic: 'findability' }] },
      { key: 'found', kind: 'decision', title: 'Answer found?', description: '', question: 'Did the answer solve the problem?', lane: 'main' },
      { key: 'ask', kind: 'screen', title: 'Ask support', description: '', lane: 'alt', topics: ['contact'],
        components: [h1('Ask our support team'), { componentId: 'cmp-textarea', variantId: 'default', props: { label: 'Your question', hint: '' } }, btn('send', 'Send question', 'primary', 'submit')] },
      { key: 'done', kind: 'outcome', title: 'Question answered', description: '', tone: 'success', lane: 'main' },
      { key: 'ticket', kind: 'outcome', title: 'Ticket opened', description: '', tone: 'neutral', lane: 'alt' },
    ],
    branches: [
      { from: 'start', to: 'help', label: 'Opens help' },
      { from: 'help', to: 'found', label: 'Reads an answer' },
      { from: 'help', to: 'ask', label: 'Ask our support team', kind: 'alternative', trigger: 'contact' },
      { from: 'found', to: 'done', label: 'Yes', condition: 'person marks the answer helpful' },
      { from: 'found', to: 'ask', label: 'No', condition: 'person marks the answer unhelpful', kind: 'alternative', errorPath: true },
      { from: 'ask', to: 'ticket', label: 'Send question', trigger: 'send', kind: 'alternative' },
    ],
  },
];

export interface GenerateInput {
  name: string;
  patternId: string;
  useCase: UseCase | null;
  insights: Insight[];
  includeErrorPaths: boolean;
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
    const hit = PATTERNS.find((p) => p.fits.test(text));
    if (hit) return hit;
  }
  return PATTERNS[0];
}

export function generateJourney(input: GenerateInput, catalog: ComponentDef[], makeId: (p: string) => string, now = new Date()): GenerateResult {
  const pattern = PATTERNS.find((p) => p.id === input.patternId) ?? PATTERNS[0];
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
      Object.assign(props, c.props);
      const variantId = def.variants.some((v) => v.id === c.variantId) ? c.variantId! : def.variants[0].id;
      components.push({ id: iid, componentId: def.id, variantId, props, ...(c.interaction ? { interaction: c.interaction } : {}) });
    }

    const insightIds = input.insights.filter((i) => (s.topics ?? []).some((t) => topicsByInsight.get(i.id)?.includes(t))).map((i) => i.id);
    const decisions = (s.decisions ?? [])
      .map((d) => ({ d, ids: input.insights.filter((i) => topicsByInsight.get(i.id)?.includes(d.topic)).map((i) => i.id) }))
      .filter((x2) => x2.ids.length > 0)
      .map((x2) => ({ id: makeId('d'), text: x2.d.text, insightIds: x2.ids }));

    return {
      id, kind: s.kind, title: s.title, description: s.description, position: { x, y }, components,
      ...(s.question ? { question: s.question } : {}), ...(s.tone ? { tone: s.tone } : {}),
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
    label: b.label,
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
