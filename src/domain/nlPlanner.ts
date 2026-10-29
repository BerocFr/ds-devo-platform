import { PATTERNS, insightTopics, type JourneyPattern, type Topic, type VarName } from './generator';
import type { Insight, UseCase } from './types';

// Natural-language planner (rule-based). Reads a request in English or French and decides:
// which journey pattern fits, which use case it serves (existing or new), which insights to
// design for, and the copy variables (topic, partner, country, role, event). It explains each
// decision so the person can correct the request. A model-backed planner (claudePlanner.ts)
// can replace it when the host offers one; both end in a journey built from the library.

export interface Plan {
  engine: 'rules';
  request: string;
  name: string;
  patternId: string;
  useCase: UseCase;
  isNewUseCase: boolean;
  insightIds: string[];
  vars: Partial<Record<VarName, string>>;
  includeErrorPaths: boolean;
  notes: string[];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Extra FR/EN cues per pattern, added to each pattern's own `fits` expression. */
const CUES: Record<string, RegExp[]> = {
  signup: [/\b(create|open|creer|ouvrir) (an |un )?(account|compte)\b/, /\b(sign ?up|inscription au portail|onboarding|portail client)\b/],
  recover: [/\b(code|mot de passe|password)\b.*\b(expire|perdu|forgot|oublie|reset)\b/, /\b(reset|recover|recuperer)\b/],
  'expert-contact': [/\b(expert|consultant|parler|talk|contact\w*|rappel|call back|rendez-vous|meeting|lead)\b/],
  'browse-cases': [/\b(case stud\w*|success stor\w*|references? client|cas client|preuves?|portfolio)\b/],
  'job-application': [/\b(job|jobs|emploi|poste|candidat\w*|postule\w*|apply|career|carriere|cv|recrut\w*|offre d.emploi)\b/],
  'event-registration': [/\b(events?|evenements?|webinars?|webinaires?|summit|conference|meetup|salon|replay|forum|day)\b/, /\b(regist\w*|inscri\w*|s.inscri\w*)\b/],
  'gated-download': [/\b(whitepaper|livre blanc|ebook|e-book|telecharg\w*|download|guide|etude)\b/],
  'ai-assessment': [/\b(assess\w*|evaluation|maturite|maturity|diagnostic|quiz|score|auto-?evaluation)\b/],
  'office-finder': [/\b(bureau|bureaux|office|offices|agence|adresse|address|locali\w*|pres de chez|near me)\b/],
  'insights-newsletter': [/\b(article|insights?|blog|magazine|newsletter|abonn\w*|subscri\w*|lire|read)\b/],
  'investor-docs': [/\b(investor|investisseur|actionnaire|shareholder|rapport annuel|annual report|financial|financier|press|presse|journaliste)\b/],
  faq: [/\b(faq|question|aide|help|support|reponse)\b/],
};

const TOPICS: { re: RegExp; topic: string; Topic: string; role: string; event: string }[] = [
  { re: /\b(cyber\w*|securit\w*|security|soc|zero trust|ciso|rssi)\b/, topic: 'cybersecurity', Topic: 'Cybersecurity', role: 'Security Consultant', event: 'Cyber Day' },
  { re: /\b(genai|ia|ai|intelligence artificielle|artificial intelligence|machine learning|llm|agents?)\b/, topic: 'AI', Topic: 'AI', role: 'AI Engineer', event: 'GenAI Day' },
  { re: /\b(data|donnees|analytics|bi|data engineer\w*)\b/, topic: 'data', Topic: 'Data', role: 'Data Engineer', event: 'Data Forum' },
  { re: /\b(servicenow|itsm|service management)\b/, topic: 'service management', Topic: 'Service management', role: 'ServiceNow Developer', event: 'ServiceNow User Day' },
  { re: /\b(workplace|google workspace|m365|microsoft 365|collaboration)\b/, topic: 'digital workplace', Topic: 'Digital workplace', role: 'Workplace Consultant', event: 'Workplace Day' },
  { re: /\b(cloud|migration|kubernetes|devops|finops|landing zone)\b/, topic: 'cloud', Topic: 'Cloud', role: 'Cloud Architect', event: 'Cloud Summit' },
];

const PARTNERS: [RegExp, string][] = [
  [/\b(aws|amazon web services|amazon)\b/, 'AWS'],
  [/\b(google cloud|gcp|google)\b/, 'Google Cloud'],
  [/\b(azure|microsoft)\b/, 'Microsoft'],
  [/\b(servicenow)\b/, 'ServiceNow'],
  [/\b(salesforce)\b/, 'Salesforce'],
];

const COUNTRIES: [RegExp, string, string][] = [
  [/\b(france|paris|lyon|toulouse|lille)\b/, 'France', 'Paris'],
  [/\b(belgi\w*|brussels|bruxelles)\b/, 'Belgium', 'Brussels'],
  [/\b(spain|espagne|madrid|barcelon\w*)\b/, 'Spain', 'Madrid'],
  [/\b(portugal|lisbon\w*|lisbonne|porto)\b/, 'Portugal', 'Lisbon'],
  [/\b(netherlands|pays-bas|amsterdam|nederland)\b/, 'Netherlands', 'Amsterdam'],
  [/\b(uk|united kingdom|royaume-uni|london|londres|england)\b/, 'United Kingdom', 'London'],
  [/\b(germany|allemagne|berlin|munich|frankfurt)\b/, 'Germany', 'Frankfurt'],
  [/\b(ital\w*|milan|rome)\b/, 'Italy', 'Milan'],
  [/\b(switzerland|suisse|zurich|geneve|geneva)\b/, 'Switzerland', 'Zurich'],
  [/\b(morocco|maroc|casablanca)\b/, 'Morocco', 'Casablanca'],
  [/\b(denmark|danemark|copenhag\w*)\b/, 'Denmark', 'Copenhagen'],
];

const ROLE_HINTS: [RegExp, string][] = [
  [/\b(data engineer\w*|ingenieur data)\b/, 'Data Engineer'],
  [/\b(data scientist\w*)\b/, 'Data Scientist'],
  [/\b(architect\w*|architecte)\b/, ''],
  [/\b(develop\w*|developpeu\w*|engineer|ingenieur)\b/, ''],
  [/\b(project manager|chef de projet)\b/, 'Project Manager'],
  [/\b(consultant\w*)\b/, ''],
];

const PATTERN_PROFILE: Record<string, { actor: string; objective: string; outcome: string; metric: string }> = {
  signup: { actor: 'New client user', objective: 'Increase successful registrations.', outcome: 'An active, verified account.', metric: 'Proposed: registration completion rate.' },
  recover: { actor: 'Registered person', objective: 'Reduce support tickets.', outcome: 'Access recovered without support.', metric: 'Proposed: recovery success rate.' },
  'expert-contact': { actor: 'IT or business decision maker', objective: 'Generate qualified B2B leads per practice.', outcome: 'A qualified request reaches the right expert.', metric: 'Proposed: page-to-contact conversion rate.' },
  'browse-cases': { actor: 'Prospect evaluating credibility', objective: 'Turn proof points into pipeline.', outcome: 'A relevant story found, then contact.', metric: 'Proposed: share of story readers who contact.' },
  'job-application': { actor: 'Job seeker', objective: 'Recruit consultants at scale.', outcome: 'Application submitted with a CV.', metric: 'Proposed: job-view-to-application rate.' },
  'event-registration': { actor: 'Client or prospect', objective: 'Engagement and lead generation.', outcome: 'Registration confirmed, attended or replay watched.', metric: 'Proposed: registration-to-attendance rate.' },
  'gated-download': { actor: 'Practitioner researching a topic', objective: 'Lead capture and nurture.', outcome: 'Content received and read.', metric: 'Proposed: gated form completion rate.' },
  'ai-assessment': { actor: 'Business or IT leader', objective: 'Capture and qualify early-funnel leads.', outcome: 'Assessment completed and a call booked.', metric: 'Proposed: assessment completion rate.' },
  'office-finder': { actor: 'Client, candidate or visitor', objective: 'Local reach and fewer misrouted requests.', outcome: 'The right office reached.', metric: 'Proposed: sessions ending in a call or map click.' },
  'insights-newsletter': { actor: 'Practitioner following tech trends', objective: 'Build an owned audience.', outcome: 'Subscription confirmed.', metric: 'Proposed: sign-up rate per article view.' },
  'investor-docs': { actor: 'Investor, analyst or journalist', objective: 'Transparency and compliance.', outcome: 'The right document found.', metric: 'Proposed: report downloads per results release.' },
  faq: { actor: 'Client or prospect with a question', objective: 'Answer without a ticket.', outcome: 'Question answered or routed to an expert.', metric: 'Proposed: self-service resolution rate.' },
};

function scorePattern(p: JourneyPattern, t: string): number {
  let s = 0;
  const own = new RegExp(p.fits.source, 'gi');
  s += (t.match(own) ?? []).length * 2;
  for (const re of CUES[p.id] ?? []) s += (t.match(new RegExp(re.source, 'g')) ?? []).length * 3;
  return s;
}

export function rankPatterns(text: string): { pattern: JourneyPattern; score: number }[] {
  const t = norm(text);
  return PATTERNS.map((pattern) => ({ pattern, score: scorePattern(pattern, t) })).sort((a, b) => b.score - a.score);
}

const STOP = new Set('a an the and or of to for in on with de du des la le les un une et ou pour dans sur avec en au aux qui que sa son ses their his her is est'.split(' '));
const words = (s: string) => new Set(norm(s).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)));

function matchUseCase(text: string, useCases: UseCase[], patternId: string): { uc: UseCase; score: number } | null {
  const w = words(text);
  let best: { uc: UseCase; score: number } | null = null;
  for (const uc of useCases) {
    const u = words(`${uc.title} ${uc.goal} ${uc.actor}`);
    let s = 0;
    for (const x of w) if (u.has(x)) s++;
    const rank = rankPatterns(`${uc.title} ${uc.goal}`)[0];
    if (rank.score > 0 && rank.pattern.id === patternId) s += 3;
    if (!best || s > best.score) best = { uc, score: s };
  }
  return best && best.score >= 3 ? best : null;
}

const sentence = (s: string) => {
  const t = s.trim().replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
  const cut = t.length > 90 ? `${t.slice(0, 87).replace(/\s+\S*$/, '')}...` : t;
  return cut.charAt(0).toUpperCase() + cut.slice(1);
};

export function planFromText(text: string, data: { useCases: UseCase[]; insights: Insight[] }, makeId: (p: string) => string, now = new Date()): Plan {
  const t = norm(text);
  const notes: string[] = [];
  const ranked = rankPatterns(text);
  const top = ranked[0].score > 0 ? ranked[0].pattern : PATTERNS.find((p) => p.id === 'expert-contact')!;
  notes.push(ranked[0].score > 0 ? `Journey type: ${top.name}, matched on the words of the request.` : `Journey type: ${top.name}, the default when the request names no specific task.`);

  const topic = TOPICS.find((x) => x.re.test(t)) ?? TOPICS[TOPICS.length - 1];
  const partner = PARTNERS.find(([re]) => re.test(t))?.[1];
  const country = COUNTRIES.find(([re]) => re.test(t));
  const vars: Plan['vars'] = { topic: topic.topic, Topic: topic.Topic };
  if (partner) vars.partner = partner;
  if (country) vars.country = country[1];
  let role = topic.role;
  for (const [re, r] of ROLE_HINTS) {
    if (re.test(t)) {
      role = r || topic.role;
      break;
    }
  }
  vars.role = role;
  vars.event = `${topic.event} ${country?.[2] ?? 'Paris'}`;
  notes.push(`Subject: ${topic.Topic}${partner ? `, partner ${partner}` : ''}${country ? `, ${country[1]}` : ''}.`);
  if (top.id === 'job-application') notes.push(`Role used in the pages: ${role}.`);
  if (top.id === 'event-registration') notes.push(`Event used in the pages: ${vars.event}.`);

  const includeErrorPaths = !/\b(sans (chemin d.)?erreurs?|without errors?|happy path|nominal only|chemin nominal)\b/.test(t);
  if (!includeErrorPaths) notes.push('Error and recovery paths left out, as asked.');

  const m = matchUseCase(text, data.useCases, top.id);
  const profile = PATTERN_PROFILE[top.id] ?? PATTERN_PROFILE['expert-contact'];
  let useCase: UseCase;
  let isNew = false;
  if (m) {
    useCase = m.uc;
    notes.push(`Use case: "${m.uc.title}" (existing).`);
  } else {
    isNew = true;
    useCase = {
      id: makeId('uc'),
      title: sentence(text),
      actor: profile.actor,
      goal: sentence(text),
      outcome: profile.outcome,
      businessObjective: profile.objective,
      audience: `${topic.Topic} audience${country ? ` in ${country[1]}` : ''}.`,
      context: `Described in natural language on ${now.toISOString().slice(0, 10)}.`,
      metric: profile.metric,
    };
    notes.push('Use case: none matched, a new one will be created from the request.');
  }

  const stepTopics = new Set<Topic>(top.steps.flatMap((s) => s.topics ?? []));
  const fromUc = data.insights.filter((i) => i.useCaseIds.includes(useCase.id));
  const related = data.insights.filter((i) => !fromUc.includes(i) && insightTopics(i).some((x) => stepTopics.has(x)) && insightTopics(i).length > 0);
  const insightIds = [...fromUc, ...related].slice(0, 6).map((i) => i.id);
  notes.push(insightIds.length ? `${insightIds.length} insight${insightIds.length > 1 ? 's' : ''} linked to the steps they concern.` : 'No insight matched; add some to trace the design decisions.');

  const name = `${top.name}, ${vars.Topic}${country ? `, ${country[1]}` : ''}`;
  return { engine: 'rules', request: text, name, patternId: top.id, useCase, isNewUseCase: isNew, insightIds, vars, includeErrorPaths, notes };
}
