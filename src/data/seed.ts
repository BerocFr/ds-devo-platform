import type {
  ComponentDef,
  DesignPrinciple,
  DesignToken,
  Insight,
  Journey,
  PlatformData,
  UseCase,
} from '../domain/types';
import { benchComponents } from './benchCatalog';
import { rebuildPatterns, siteAtoms, sitePatterns } from './siteCatalog';
import { siteInsights, siteUseCases } from './siteUseCases';

// Seed workspace: Devoteam. Brand values mirror BerocFr/DS-Devo brand/README.md
// (source: Engrym "Devoteam DS" 6c66409e v2). Values the brand does not define are
// marked `todo-brand` and carry a visible placeholder so validation can flag them.

const SRC = 'DS-Devo brand/README.md';

const t = (
  name: string,
  type: DesignToken['type'],
  tier: DesignToken['tier'],
  category: string,
  value: string,
  provenance: DesignToken['provenance'],
  description?: string,
): DesignToken => ({
  id: `tok-${name.replace(/\./g, '-')}`,
  name,
  type,
  tier,
  category,
  value,
  provenance,
  description,
  source: provenance === 'brand' ? SRC : undefined,
});

export const seedTokens: DesignToken[] = [
  // Primitives: color
  t('color.coral.500', 'color', 'primitive', 'Color', '#f8485e', 'brand', 'Devoteam primary (coral red).'),
  t('color.coral.600', 'color', 'primitive', 'Color', '#f43d52', 'brand', 'Pressed variant seen in Devoteam CSS.'),
  t('color.coral.700', 'color', 'primitive', 'Color', '#ea0925', 'derived', 'First darker coral that carries white text at 4.5:1 (owner decision 1, final value in DS-Devo S-003).'),
  t('color.ink.900', 'color', 'primitive', 'Color', '#3c3c3a', 'brand', 'Body text ink.'),
  t('color.ink.700', 'color', 'primitive', 'Color', '#5f5f5c', 'derived', 'Ink lightened for secondary text; 6.5:1 on white.'),
  t('color.neutral.0', 'color', 'primitive', 'Color', '#ffffff', 'brand', 'Base surface.'),
  t('color.neutral.50', 'color', 'primitive', 'Color', '#f4f4f4', 'brand', 'Light neutral surface.'),
  t('color.neutral.300', 'color', 'primitive', 'Color', '#c5c5c5', 'brand', 'Border seen in Devoteam CSS.'),
  t('color.neutral.500', 'color', 'primitive', 'Color', '#a2a2a2', 'brand', 'Mid neutral. Fails AA for text on white.'),
  t('color.mint.100', 'color', 'primitive', 'Color', '#d7ebe6', 'brand', 'Secondary (mint).'),
  t('color.status.error', 'color', 'primitive', 'Color', '#b3261e', 'todo-brand', 'Placeholder. Status colors are not defined by the brand yet.'),
  t('color.status.success', 'color', 'primitive', 'Color', '#1e6b4f', 'todo-brand', 'Placeholder. Status colors are not defined by the brand yet.'),
  // Semantic color
  t('color.text.default', 'color', 'semantic', 'Color', '{color.ink.900}', 'brand'),
  t('color.text.muted', 'color', 'semantic', 'Color', '{color.ink.700}', 'derived'),
  t('color.surface.default', 'color', 'semantic', 'Color', '{color.neutral.0}', 'brand'),
  t('color.surface.subtle', 'color', 'semantic', 'Color', '{color.neutral.50}', 'brand'),
  t('color.surface.accent', 'color', 'semantic', 'Color', '{color.mint.100}', 'brand'),
  t('color.border.default', 'color', 'semantic', 'Color', '{color.neutral.300}', 'brand'),
  t('color.action.primary', 'color', 'semantic', 'Color', '{color.coral.700}', 'derived', 'Text-bearing action background (white on it is 4.60:1).'),
  t('color.action.primary-pressed', 'color', 'semantic', 'Color', '{color.coral.600}', 'brand'),
  t('color.action.accent', 'color', 'semantic', 'Color', '{color.coral.500}', 'brand', 'Large text, icons and borders only (3.45:1 on white).'),
  t('color.feedback.error', 'color', 'semantic', 'Color', '{color.status.error}', 'todo-brand'),
  t('color.feedback.success', 'color', 'semantic', 'Color', '{color.status.success}', 'todo-brand'),
  t('color.focus.ring', 'color', 'semantic', 'Color', '{color.coral.500}', 'brand', 'Focus ring seen in Devoteam CSS.'),
  // Typography
  t('font.family.brand', 'fontFamily', 'primitive', 'Typography', '"Montserrat Variable", Montserrat, sans-serif', 'brand', 'Self-hosted via @fontsource-variable/montserrat (owner decision 3).'),
  t('font.weight.regular', 'fontWeight', 'primitive', 'Typography', '400', 'brand'),
  t('font.weight.semibold', 'fontWeight', 'primitive', 'Typography', '600', 'brand'),
  t('font.weight.bold', 'fontWeight', 'primitive', 'Typography', '700', 'brand'),
  t('font.size.small', 'fontSize', 'primitive', 'Typography', '0.875rem', 'brand', 'Buttons, h6.'),
  t('font.size.base', 'fontSize', 'primitive', 'Typography', '1rem', 'brand', 'Body, h5.'),
  t('font.size.medium', 'fontSize', 'primitive', 'Typography', '1.5rem', 'brand', 'h4.'),
  t('font.size.large', 'fontSize', 'primitive', 'Typography', '2rem', 'brand', 'h3.'),
  // Spacing
  t('space.xs', 'dimension', 'primitive', 'Spacing', '0.25rem', 'brand'),
  t('space.sm', 'dimension', 'primitive', 'Spacing', '0.75rem', 'brand'),
  t('space.md', 'dimension', 'primitive', 'Spacing', '1rem', 'brand'),
  t('space.lg', 'dimension', 'primitive', 'Spacing', '2rem', 'brand'),
  // Shape
  t('radius.small', 'radius', 'primitive', 'Shape', '4px', 'brand', 'Inputs and chips.'),
  t('radius.card', 'radius', 'primitive', 'Shape', '16px', 'brand', 'Dominant card radius.'),
  t('radius.pill', 'radius', 'primitive', 'Shape', '50px', 'brand', 'Pill buttons.'),
  t('shadow.subtle', 'shadow', 'primitive', 'Elevation', '0 2px 4px rgba(0,0,0,.1)', 'brand'),
  t('shadow.overlay', 'shadow', 'primitive', 'Elevation', '0 20px 48px rgba(0,0,0,.22)', 'brand'),
  // Motion
  t('motion.duration.md', 'duration', 'primitive', 'Motion', '200ms', 'brand', 'Small state change.'),
  t('motion.duration.lg', 'duration', 'primitive', 'Motion', '300ms', 'brand', 'Default transition.'),
  t('motion.easing.standard', 'easing', 'primitive', 'Motion', 'cubic-bezier(0.4, 0, 0.2, 1)', 'brand', 'UI movement.'),
  // Expressive motion for page storytelling, derived from the agency benchmark (DS-Devo bench-03).
  // The brand defines no motion personality yet; these are labelled derived, not brand.
  t('motion.expressive.duration.moderate', 'duration', 'primitive', 'Motion', '600ms', 'derived', 'Scroll reveals (K72; agency reveals of 1.0 to 1.1 s, trimmed). bench-03.'),
  t('motion.expressive.duration.slow', 'duration', 'primitive', 'Motion', '800ms', 'derived', 'Clip reveals and hover zoom (Gravity Works 700 ms, cover wipes 0.9 s trimmed). bench-03.'),
  t('motion.expressive.duration.slower', 'duration', 'primitive', 'Motion', '1000ms', 'derived', 'Hero headline only, once per page (By-Kin, Blackstone). bench-03.'),
  t('motion.expressive.easing.entrance', 'easing', 'primitive', 'Motion', 'cubic-bezier(0.22, 1, 0.36, 1)', 'derived', 'Elements entering the view. bench-03.'),
  t('motion.expressive.easing.emphasized', 'easing', 'primitive', 'Motion', 'cubic-bezier(0.16, 1, 0.3, 1)', 'derived', 'Expo out for headline and clip reveals (fromanother, By-Kin, Cuberto, K72). bench-03.'),
  t('motion.expressive.distance.md', 'dimension', 'primitive', 'Motion', '16px', 'derived', 'Rise distance of scroll reveals. bench-03.'),
  t('motion.expressive.stagger', 'duration', 'primitive', 'Motion', '50ms', 'derived', 'Delay between items, capped at 6 items (Uncommon, By-Kin). bench-03.'),
];

export const seedPrinciples: DesignPrinciple[] = [
  { id: 'pr-1', title: 'Say less, show the next step', description: 'Every screen has one primary action. Secondary paths stay visible but quiet.' },
  { id: 'pr-2', title: 'Accessible by default', description: 'WCAG 2.2 AA is the floor: visible focus, keyboard reachability, 4.5:1 text contrast, motion that respects reduced-motion settings.' },
  { id: 'pr-3', title: 'Errors explain and repair', description: 'Say what happened and how to fix it, next to the field it concerns. Never blame the person.' },
  { id: 'pr-4', title: 'Brand values are traceable', description: 'Every value comes from the brand source or is marked derived or TODO-BRAND. Nothing is invented.' },
];

const g = (d: string[], n: string[]) => ({ do: d, dont: n });

export const seedComponents: ComponentDef[] = [
  {
    id: 'cmp-button', kind: 'button', name: 'Button', category: 'Actions', status: 'stable',
    description: 'Triggers an action or moves the person to the next step.',
    variants: [
      { id: 'primary', name: 'Primary', description: 'The single main action of a screen.' },
      { id: 'secondary', name: 'Secondary', description: 'Alternative action, outlined.' },
      { id: 'ghost', name: 'Ghost', description: 'Low-emphasis action, text only.' },
    ],
    sizes: ['sm', 'md', 'lg'], states: ['default', 'hover', 'focus', 'disabled', 'loading'],
    props: [
      { name: 'label', label: 'Label', kind: 'text', defaultValue: 'Continue' },
      { name: 'fullWidth', label: 'Full width', kind: 'boolean', defaultValue: true },
      { name: 'icon', label: 'Trailing icon', kind: 'select', options: ['none', 'arrow', 'check'], defaultValue: 'none', advanced: true },
    ],
    tokens: ['color.action.primary', 'color.action.primary-pressed', 'color.surface.default', 'font.family.brand', 'font.weight.semibold', 'font.size.small', 'radius.pill', 'color.focus.ring', 'motion.duration.md', 'motion.easing.standard'],
    guidelines: g(['Use one primary button per screen.', 'Start the label with a verb that names the result: "Create account".'], ['Do not use "Submit" or "OK".', 'Do not put two primary buttons side by side.']),
    interactions: ['navigate', 'submit', 'back', 'none'],
  },
  {
    id: 'cmp-text-input', kind: 'textInput', name: 'Text input', category: 'Forms', status: 'stable',
    description: 'Single-line entry for short text such as a name or an email address.',
    variants: [{ id: 'default', name: 'Default' }, { id: 'filled', name: 'Filled' }],
    sizes: ['md', 'lg'], states: ['default', 'focus', 'error', 'disabled'],
    props: [
      { name: 'placeholder', label: 'Placeholder', kind: 'text', defaultValue: '' },
      { name: 'type', label: 'Input type', kind: 'select', options: ['text', 'email', 'password'], defaultValue: 'text' },
    ],
    tokens: ['color.border.default', 'color.surface.default', 'color.text.default', 'radius.small', 'font.family.brand', 'font.size.base', 'color.focus.ring'],
    guidelines: g(['Always pair with a visible label (use Form field).'], ['Do not use placeholder text as the label.']),
    interactions: ['none'],
  },
  {
    id: 'cmp-form-field', kind: 'formField', name: 'Form field', category: 'Forms', status: 'stable',
    description: 'Label, hint, input and error message grouped as one accessible unit.',
    variants: [{ id: 'default', name: 'Default' }, { id: 'inline-error', name: 'With error' }],
    sizes: ['md'], states: ['default', 'error', 'disabled'],
    props: [
      { name: 'label', label: 'Label', kind: 'text', defaultValue: 'Email address' },
      { name: 'hint', label: 'Hint', kind: 'text', defaultValue: '' },
      { name: 'type', label: 'Input type', kind: 'select', options: ['text', 'email', 'password'], defaultValue: 'text' },
      { name: 'required', label: 'Required', kind: 'boolean', defaultValue: true },
      { name: 'error', label: 'Error text', kind: 'text', defaultValue: '', advanced: true },
    ],
    tokens: ['color.text.default', 'color.feedback.error', 'color.border.default', 'radius.small', 'font.family.brand', 'font.weight.semibold', 'space.xs'],
    guidelines: g(['Ask only for what you need now.', 'Put the error under the field, in plain words, with the fix.'], ['Do not validate while the person is still typing.']),
    interactions: ['none'],
  },
  {
    id: 'cmp-error', kind: 'errorMessage', name: 'Error message', category: 'Feedback', status: 'stable',
    description: 'Explains what went wrong and how to fix it.',
    variants: [{ id: 'inline', name: 'Inline' }, { id: 'summary', name: 'Summary' }],
    sizes: ['md'], states: ['default'],
    props: [{ name: 'text', label: 'Message', kind: 'text', defaultValue: 'Enter an email address in the format name@example.com' }],
    tokens: ['color.feedback.error', 'font.family.brand', 'font.size.small', 'font.weight.semibold'],
    guidelines: g(['Name the field and the fix.'], ['Do not apologise or say "invalid".']),
    interactions: ['none'],
  },
  {
    id: 'cmp-progress', kind: 'progress', name: 'Progress indicator', category: 'Navigation', status: 'stable',
    description: 'Shows where the person is in a short multi-step task.',
    variants: [{ id: 'steps', name: 'Steps' }, { id: 'bar', name: 'Bar' }],
    sizes: ['md'], states: ['default'],
    props: [
      { name: 'current', label: 'Current step', kind: 'number', defaultValue: 1 },
      { name: 'total', label: 'Total steps', kind: 'number', defaultValue: 3 },
    ],
    tokens: ['color.action.accent', 'color.border.default', 'font.family.brand', 'font.size.small'],
    guidelines: g(['Announce "Step 2 of 3" as text, not only as a bar.'], ['Do not show more than 5 steps.']),
    interactions: ['none'],
  },
  {
    id: 'cmp-code', kind: 'codeInput', name: 'Verification code input', category: 'Forms', status: 'beta',
    description: 'Entry for a short one-time code, with paste support.',
    variants: [{ id: 'segmented', name: 'Segmented' }, { id: 'single', name: 'Single field' }],
    sizes: ['md'], states: ['default', 'error'],
    props: [
      { name: 'length', label: 'Digits', kind: 'number', defaultValue: 6 },
      { name: 'label', label: 'Label', kind: 'text', defaultValue: 'Enter the 6-digit code we sent to your email' },
    ],
    tokens: ['color.border.default', 'color.action.accent', 'radius.small', 'font.family.brand', 'font.size.medium', 'color.focus.ring'],
    guidelines: g(['Accept a pasted code in one go.', 'Say where the code was sent.'], ['Do not auto-submit before the last digit.']),
    interactions: ['none'],
  },
  {
    id: 'cmp-confirmation', kind: 'confirmation', name: 'Confirmation message', category: 'Feedback', status: 'stable',
    description: 'Confirms that a task is complete and says what happens next.',
    variants: [{ id: 'success', name: 'Success' }, { id: 'info', name: 'Info' }],
    sizes: ['md'], states: ['default'],
    props: [
      { name: 'title', label: 'Title', kind: 'text', defaultValue: 'Your account is ready' },
      { name: 'body', label: 'Body', kind: 'text', defaultValue: 'You can now sign in with your email address.' },
    ],
    tokens: ['color.feedback.success', 'color.surface.accent', 'radius.card', 'font.family.brand', 'font.weight.bold'],
    guidelines: g(['Use the same verb as the action: "Account created".'], ['Do not end the journey without a next step.']),
    interactions: ['none'],
  },
  {
    id: 'cmp-heading', kind: 'heading', name: 'Heading', category: 'Content', status: 'stable',
    description: 'Page or section title.',
    variants: [{ id: 'h1', name: 'Page title' }, { id: 'h2', name: 'Section title' }],
    sizes: ['md'], states: ['default'],
    props: [{ name: 'text', label: 'Text', kind: 'text', defaultValue: 'Create your account' }],
    tokens: ['font.family.brand', 'font.weight.bold', 'font.size.large', 'color.text.default'],
    guidelines: g(['One page title per screen.'], ['Do not skip heading levels.']),
    interactions: ['none'],
  },
  {
    id: 'cmp-text', kind: 'text', name: 'Body text', category: 'Content', status: 'stable',
    description: 'Paragraph text.',
    variants: [{ id: 'default', name: 'Default' }, { id: 'muted', name: 'Muted' }],
    sizes: ['md'], states: ['default'],
    props: [{ name: 'text', label: 'Text', kind: 'text', defaultValue: 'It takes less than a minute.' }],
    tokens: ['font.family.brand', 'font.size.base', 'color.text.default', 'color.text.muted'],
    guidelines: g(['Keep lines under 80 characters.'], ['Do not use muted text for essential information.']),
    interactions: ['none'],
  },
  {
    id: 'cmp-checkbox', kind: 'checkbox', name: 'Checkbox', category: 'Forms', status: 'stable',
    description: 'A single yes or no choice, such as accepting terms.',
    variants: [{ id: 'default', name: 'Default' }],
    sizes: ['md'], states: ['default', 'checked', 'focus', 'error'],
    props: [{ name: 'label', label: 'Label', kind: 'text', defaultValue: 'I accept the terms of use' }],
    tokens: ['color.action.primary', 'color.border.default', 'radius.small', 'font.family.brand', 'color.focus.ring'],
    guidelines: g(['Make the whole label clickable.'], ['Do not pre-check consent.']),
    interactions: ['none'],
  },
  {
    id: 'cmp-link', kind: 'link', name: 'Link', category: 'Navigation', status: 'stable',
    description: 'Moves to another place, inline or standalone.',
    variants: [{ id: 'inline', name: 'Inline' }, { id: 'standalone', name: 'Standalone' }],
    sizes: ['md'], states: ['default', 'hover', 'focus'],
    props: [{ name: 'label', label: 'Label', kind: 'text', defaultValue: 'Already have an account? Sign in' }],
    tokens: ['color.text.default', 'color.action.accent', 'font.family.brand', 'color.focus.ring'],
    guidelines: g(['Describe the destination.'], ['Do not use "Click here".']),
    interactions: ['navigate', 'back', 'none'],
  },
  {
    id: 'cmp-alert', kind: 'alert', name: 'Notification', category: 'Feedback', status: 'stable',
    description: 'A message about the page or the task, shown above the content.',
    variants: [{ id: 'info', name: 'Info' }, { id: 'error', name: 'Error' }, { id: 'success', name: 'Success' }],
    sizes: ['md'], states: ['default', 'dismissible'],
    props: [{ name: 'text', label: 'Message', kind: 'text', defaultValue: 'We sent a new code to your email.' }],
    tokens: ['color.surface.subtle', 'color.feedback.error', 'color.feedback.success', 'radius.small', 'font.family.brand'],
    guidelines: g(['Use role=alert only for urgent errors.'], ['Do not stack more than one notification.']),
    interactions: ['none'],
  },
  {
    id: 'cmp-card', kind: 'card', name: 'Card', category: 'Layout', status: 'stable',
    description: 'Groups related content with a title and short text.',
    variants: [{ id: 'default', name: 'Default' }, { id: 'accent', name: 'Accent' }],
    sizes: ['md'], states: ['default', 'hover'],
    props: [
      { name: 'title', label: 'Title', kind: 'text', defaultValue: 'Why we ask' },
      { name: 'body', label: 'Body', kind: 'text', defaultValue: 'Your email is only used to sign in and recover your account.' },
    ],
    tokens: ['radius.card', 'shadow.subtle', 'color.surface.default', 'color.surface.accent', 'font.family.brand'],
    guidelines: g(['Give each card one clear purpose.'], ['Do not nest cards.']),
    interactions: ['none'],
  },
  {
    id: 'cmp-divider', kind: 'divider', name: 'Divider', category: 'Layout', status: 'stable',
    description: 'Separates groups of content.',
    variants: [{ id: 'default', name: 'Default' }],
    sizes: ['md'], states: ['default'], props: [],
    tokens: ['color.border.default'],
    guidelines: g(['Use to separate groups, not every item.'], ['Do not use as decoration.']),
    interactions: ['none'],
  },
  {
    id: 'cmp-nav', kind: 'navBar', name: 'Top bar', category: 'Navigation', status: 'deprecated',
    description: 'Legacy top bar with logo and back link. Replaced by SiteHeader in DS-Devo S-019.',
    variants: [{ id: 'default', name: 'Default' }],
    sizes: ['md'], states: ['default'],
    props: [{ name: 'title', label: 'Title', kind: 'text', defaultValue: 'Devoteam' }],
    tokens: ['color.surface.default', 'color.border.default', 'font.family.brand'],
    guidelines: g(['Plan migration to SiteHeader.'], ['Do not use in new journeys.']),
    interactions: ['back', 'none'],
  },
];

export const seedUseCases: UseCase[] = [
  {
    id: 'uc-signup', title: 'Create an account quickly', actor: 'New visitor',
    goal: 'Get access to the client portal without friction.',
    outcome: 'An active, verified account in under one minute.',
    businessObjective: 'Increase successful registrations and reduce abandonment.',
    audience: 'Client-side project managers invited by a Devoteam consultant, mostly on desktop, some on mobile.',
    context: 'They arrive from an invitation email and want to see their project dashboard.',
    metric: 'Registration completion rate (target: from 58% to 75%).',
  },
  {
    id: 'uc-recover', title: 'Recover access after a failed verification', actor: 'Registered person',
    goal: 'Get a new code and finish verification.',
    outcome: 'Verified account without contacting support.',
    businessObjective: 'Reduce support tickets about verification.',
    audience: 'People whose code expired or did not arrive.',
    context: 'Often on mobile, switching between email and browser.',
    metric: 'Verification support tickets per week.',
  },
];

export const seedInsights: Insight[] = [
  { id: 'in-long-form', kind: 'pain-point', title: 'Long forms make people leave', detail: 'In session recordings, 4 in 10 visitors left the 9-field form before the password field.', source: 'Analytics funnel, Q3', evidence: 'high', useCaseIds: ['uc-signup'] },
  { id: 'in-progress', kind: 'need', title: 'People want to know how long it takes', detail: 'Interviewees asked how many steps were left before committing to the form.', source: '8 user interviews', evidence: 'medium', useCaseIds: ['uc-signup'] },
  { id: 'in-errors', kind: 'pain-point', title: 'Errors appear too late', detail: 'Errors shown only after submit forced people to scan the whole form to find the problem.', source: 'Usability test, 6 participants', evidence: 'high', useCaseIds: ['uc-signup'] },
  { id: 'in-code', kind: 'observation', title: 'Codes are copied from the email', detail: 'Most people copy the code and paste it; typing digit by digit caused mistakes.', source: 'Support ticket review', evidence: 'medium', useCaseIds: ['uc-signup', 'uc-recover'] },
  { id: 'in-expired', kind: 'pain-point', title: 'Expired codes are a dead end', detail: 'When a code expired, the page offered no way to get a new one.', source: 'Support tickets, 31 in September', evidence: 'high', useCaseIds: ['uc-recover'] },
  { id: 'in-next', kind: 'opportunity', title: 'Show the project right after sign-up', detail: 'People came for their project dashboard; a direct link after confirmation removes one step.', source: 'Product analytics', evidence: 'low', useCaseIds: ['uc-signup'] },
];

let n = 0;
const iid = () => `ci-${++n}`;

const now = '2026-10-29T09:00:00.000Z';

export const seedJourney: Journey = {
  id: 'jr-signup',
  name: 'Quick account creation',
  useCaseId: 'uc-signup',
  status: 'in-review',
  folder: 'Onboarding',
  createdAt: '2026-10-21T10:00:00.000Z',
  updatedAt: now,
  nodes: [
    { id: 'n-start', kind: 'start', title: 'Invitation email opened', description: 'The person clicks the link in the invitation email.', position: { x: 0, y: 140 }, components: [], insightIds: [], decisions: [] },
    {
      id: 'n-welcome', kind: 'screen', title: 'Welcome', description: 'Sets expectations and starts the task.', position: { x: 220, y: 60 },
      components: [
        { id: iid(), componentId: 'cmp-progress', variantId: 'steps', props: { current: 1, total: 3 } },
        { id: iid(), componentId: 'cmp-heading', variantId: 'h1', props: { text: 'Create your account' } },
        { id: iid(), componentId: 'cmp-text', variantId: 'muted', props: { text: 'Three short steps, less than a minute.' } },
        { id: 'ci-welcome-cta', componentId: 'cmp-button', variantId: 'primary', props: { label: 'Get started', fullWidth: true, icon: 'none' }, interaction: { kind: 'navigate' } },
        { id: iid(), componentId: 'cmp-link', variantId: 'standalone', props: { label: 'Already have an account? Sign in' }, interaction: { kind: 'none' } },
      ],
      insightIds: ['in-progress'],
      decisions: [{ id: 'd-1', text: 'Announce the number of steps up front.', insightIds: ['in-progress'] }],
    },
    {
      id: 'n-form', kind: 'screen', title: 'Registration form', description: 'Three fields instead of nine. Everything else is asked later.', position: { x: 520, y: 60 },
      components: [
        { id: iid(), componentId: 'cmp-progress', variantId: 'steps', props: { current: 1, total: 3 } },
        { id: iid(), componentId: 'cmp-heading', variantId: 'h1', props: { text: 'Your details' } },
        { id: iid(), componentId: 'cmp-form-field', variantId: 'default', props: { label: 'Full name', hint: '', type: 'text', required: true, error: '' } },
        { id: iid(), componentId: 'cmp-form-field', variantId: 'default', props: { label: 'Work email', hint: 'We send a code to this address.', type: 'email', required: true, error: '' } },
        { id: iid(), componentId: 'cmp-form-field', variantId: 'default', props: { label: 'Password', hint: 'At least 12 characters.', type: 'password', required: true, error: '' } },
        { id: iid(), componentId: 'cmp-checkbox', variantId: 'default', props: { label: 'I accept the terms of use' } },
        { id: 'ci-form-submit', componentId: 'cmp-button', variantId: 'primary', props: { label: 'Create account', fullWidth: true, icon: 'none' }, interaction: { kind: 'submit' } },
      ],
      insightIds: ['in-long-form'],
      decisions: [
        { id: 'd-2', text: 'Reduce the form from 9 to 3 fields.', insightIds: ['in-long-form'] },
        { id: 'd-3', text: 'Validate each field when it loses focus, not on submit only.', insightIds: ['in-errors'] },
      ],
    },
    { id: 'n-valid', kind: 'decision', title: 'Details valid?', description: 'Server-side check of the email format and password rules.', question: 'Are all fields valid?', position: { x: 820, y: 120 }, components: [], insightIds: ['in-errors'], decisions: [] },
    {
      id: 'n-form-error', kind: 'screen', title: 'Form with errors', description: 'Same form; errors next to the fields, focus moved to the first one.', position: { x: 820, y: 340 },
      components: [
        { id: iid(), componentId: 'cmp-alert', variantId: 'error', props: { text: 'Check 1 field to continue.' } },
        { id: iid(), componentId: 'cmp-form-field', variantId: 'inline-error', props: { label: 'Work email', hint: '', type: 'email', required: true, error: 'Enter an email address in the format name@example.com' } },
        { id: 'ci-err-retry', componentId: 'cmp-button', variantId: 'primary', props: { label: 'Create account', fullWidth: true, icon: 'none' }, interaction: { kind: 'submit' } },
      ],
      insightIds: ['in-errors'],
      decisions: [{ id: 'd-4', text: 'Show a summary plus the error under the field.', insightIds: ['in-errors'] }],
    },
    {
      id: 'n-verify', kind: 'screen', title: 'Verify email', description: 'Six-digit code sent by email, paste supported.', position: { x: 1120, y: 60 },
      components: [
        { id: iid(), componentId: 'cmp-progress', variantId: 'steps', props: { current: 2, total: 3 } },
        { id: iid(), componentId: 'cmp-heading', variantId: 'h1', props: { text: 'Check your email' } },
        { id: iid(), componentId: 'cmp-code', variantId: 'segmented', props: { length: 6, label: 'Enter the 6-digit code we sent to your work email' } },
        { id: 'ci-verify', componentId: 'cmp-button', variantId: 'primary', props: { label: 'Verify email', fullWidth: true, icon: 'none' }, interaction: { kind: 'submit' } },
        { id: 'ci-resend', componentId: 'cmp-button', variantId: 'ghost', props: { label: 'Send a new code', fullWidth: true, icon: 'none' }, interaction: { kind: 'navigate' } },
      ],
      insightIds: ['in-code'],
      decisions: [{ id: 'd-5', text: 'Accept a pasted code in one action.', insightIds: ['in-code'] }],
    },
    { id: 'n-code-ok', kind: 'decision', title: 'Code accepted?', description: 'The code matches and has not expired.', question: 'Is the code correct and still valid?', position: { x: 1420, y: 120 }, components: [], insightIds: [], decisions: [] },
    {
      id: 'n-code-error', kind: 'screen', title: 'Code problem', description: 'Wrong or expired code, with a way to get a new one.', position: { x: 1420, y: 340 },
      components: [
        { id: iid(), componentId: 'cmp-alert', variantId: 'error', props: { text: 'This code has expired. Codes are valid for 10 minutes.' } },
        { id: iid(), componentId: 'cmp-code', variantId: 'segmented', props: { length: 6, label: 'Enter the 6-digit code' } },
        { id: 'ci-retry', componentId: 'cmp-button', variantId: 'primary', props: { label: 'Verify email', fullWidth: true, icon: 'none' }, interaction: { kind: 'submit' } },
        { id: 'ci-newcode', componentId: 'cmp-button', variantId: 'secondary', props: { label: 'Send a new code', fullWidth: true, icon: 'none' }, interaction: { kind: 'navigate' } },
      ],
      insightIds: ['in-expired'],
      decisions: [{ id: 'd-6', text: 'Always offer a new code next to the error.', insightIds: ['in-expired'] }],
    },
    {
      id: 'n-confirm', kind: 'screen', title: 'Account confirmed', description: 'Confirms and links straight to the project.', position: { x: 1720, y: 60 },
      components: [
        { id: iid(), componentId: 'cmp-progress', variantId: 'steps', props: { current: 3, total: 3 } },
        { id: iid(), componentId: 'cmp-confirmation', variantId: 'success', props: { title: 'Account created', body: 'Your project dashboard is ready.' } },
        { id: 'ci-open', componentId: 'cmp-button', variantId: 'primary', props: { label: 'Open my project', fullWidth: true, icon: 'arrow' }, interaction: { kind: 'navigate' } },
      ],
      insightIds: ['in-next'],
      decisions: [{ id: 'd-7', text: 'Link directly to the project dashboard.', insightIds: ['in-next'] }],
    },
    { id: 'n-done', kind: 'outcome', title: 'Registered and verified', description: 'Success: the person reaches the dashboard.', tone: 'success', position: { x: 2020, y: 140 }, components: [], insightIds: [], decisions: [] },
  ],
  edges: [
    { id: 'e-1', source: 'n-start', target: 'n-welcome', label: 'Opens link', kind: 'main' },
    { id: 'e-2', source: 'n-welcome', target: 'n-form', label: 'Get started', kind: 'main', triggerInstanceId: 'ci-welcome-cta' },
    { id: 'e-3', source: 'n-form', target: 'n-valid', label: 'Create account', kind: 'main', triggerInstanceId: 'ci-form-submit' },
    { id: 'e-4', source: 'n-valid', target: 'n-verify', label: 'Valid', condition: 'all fields pass validation', kind: 'main' },
    { id: 'e-5', source: 'n-valid', target: 'n-form-error', label: 'Invalid', condition: 'one or more fields fail validation', kind: 'alternative' },
    { id: 'e-6', source: 'n-form-error', target: 'n-valid', label: 'Corrects and retries', kind: 'alternative', triggerInstanceId: 'ci-err-retry' },
    { id: 'e-7', source: 'n-verify', target: 'n-code-ok', label: 'Verify email', kind: 'main', triggerInstanceId: 'ci-verify' },
    { id: 'e-8', source: 'n-code-ok', target: 'n-confirm', label: 'Accepted', condition: 'code matches and is under 10 minutes old', kind: 'main' },
    { id: 'e-9', source: 'n-code-ok', target: 'n-code-error', label: 'Wrong or expired', condition: 'code mismatch or expired', kind: 'alternative' },
    { id: 'e-10', source: 'n-code-error', target: 'n-code-ok', label: 'Retries', kind: 'alternative', triggerInstanceId: 'ci-retry' },
    { id: 'e-11', source: 'n-code-error', target: 'n-verify', label: 'Sends a new code', kind: 'alternative', triggerInstanceId: 'ci-newcode' },
    { id: 'e-12', source: 'n-verify', target: 'n-verify', label: 'Sends a new code', kind: 'alternative', triggerInstanceId: 'ci-resend' },
    { id: 'e-13', source: 'n-confirm', target: 'n-done', label: 'Open my project', kind: 'main', triggerInstanceId: 'ci-open' },
  ],
};

const recoverJourney: Journey = {
  id: 'jr-recover',
  name: 'Recover after expired code',
  useCaseId: 'uc-recover',
  status: 'draft',
  folder: 'Onboarding',
  createdAt: '2026-10-27T14:00:00.000Z',
  updatedAt: '2026-10-28T16:20:00.000Z',
  nodes: [
    { id: 'r-start', kind: 'start', title: 'Code expired', description: 'Entry from the expired-code email reminder.', position: { x: 0, y: 80 }, components: [], insightIds: ['in-expired'], decisions: [] },
    {
      id: 'r-request', kind: 'screen', title: 'Request a new code', description: '', position: { x: 240, y: 20 },
      components: [
        { id: 'rc-1', componentId: 'cmp-heading', variantId: 'h1', props: { text: 'Get a new code' } },
        { id: 'rc-2', componentId: 'cmp-form-field', variantId: 'default', props: { label: 'Work email', hint: '', type: 'email', required: true, error: '' } },
        { id: 'rc-3', componentId: 'cmp-button', variantId: 'primary', props: { label: 'Send code', fullWidth: true, icon: 'none' }, interaction: { kind: 'submit' } },
      ],
      insightIds: ['in-expired'], decisions: [],
    },
    { id: 'r-done', kind: 'outcome', title: 'Code sent', description: '', tone: 'neutral', position: { x: 540, y: 80 }, components: [], insightIds: [], decisions: [] },
  ],
  edges: [
    { id: 're-1', source: 'r-start', target: 'r-request', label: 'Opens link', kind: 'main' },
    { id: 're-2', source: 'r-request', target: 'r-done', label: 'Send code', kind: 'main', triggerInstanceId: 'rc-3' },
  ],
};

export function createSeed(): PlatformData {
  return structuredClone({
    workspace: {
      id: 'ws-devoteam',
      name: 'Devoteam',
      industry: 'Digital and technology consulting',
      brandSource: 'Devoteam web foundations (Engrym "Devoteam DS" 6c66409e v2), mirrored in DS-Devo brand/README.md',
      createdAt: '2026-10-20T09:00:00.000Z',
    },
    tokens: seedTokens,
    principles: seedPrinciples,
    components: [...seedComponents.map((c) => ({ ...c, provenance: c.provenance ?? { source: 'core' as const } })), ...benchComponents, ...siteAtoms, ...sitePatterns, ...rebuildPatterns],
    useCases: [...seedUseCases, ...siteUseCases],
    insights: [...seedInsights, ...siteInsights],
    journeys: [seedJourney, recoverJourney],
    catalogVersion: 2,
    activity: [
      { id: 'a-1', at: '2026-10-29T08:40:00.000Z', text: 'Journey "Quick account creation" sent for review', target: { kind: 'journey', id: 'jr-signup' } },
      { id: 'a-2', at: '2026-10-28T16:20:00.000Z', text: 'Journey "Recover after expired code" created', target: { kind: 'journey', id: 'jr-recover' } },
      { id: 'a-3', at: '2026-10-28T11:05:00.000Z', text: 'Insight "Expired codes are a dead end" added', target: { kind: 'insight', id: 'in-expired' } },
      { id: 'a-4', at: '2026-10-27T15:30:00.000Z', text: 'Component "Top bar" marked deprecated', target: { kind: 'component', id: 'cmp-nav' } },
    ],
  } satisfies PlatformData);
}
