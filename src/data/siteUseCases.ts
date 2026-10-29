import type { Insight, UseCase } from '../domain/types';

// Use cases and insights drawn from a heuristic review of www.devoteam.com (9 pages readable,
// the rest identified from search results; see DS-Devo docs/slices/research/devoteam-site-analysis.md).
// Metrics are proposals, not measured values. Evidence is "low" for every insight: page review only.

const SRC = 'devoteam.com page review';

export const siteUseCases: UseCase[] = [
  { id: 'uc-contact-expertise-expert', title: 'Find an expert for a service area and get in touch', actor: 'IT or business decision maker at a prospect company', goal: 'Understand the offer in one domain (cloud, cyber, AI) and reach the right expert.', outcome: 'A qualified contact request reaches the right practice.', businessObjective: 'Generate qualified B2B leads per practice.', audience: 'Enterprise CIO, CISO, CTO and architects.', context: 'Researching vendors before a transformation project.', metric: 'Proposed: service-page-to-contact conversion rate per practice.' },
  { id: 'uc-assess-ai-maturity', title: 'Assess AI maturity with a self-assessment', actor: 'Business or IT leader curious about AI readiness', goal: 'Get a quick view of the organisation’s AI maturity.', outcome: 'Assessment completed, results received, follow-up accepted.', businessObjective: 'Capture early-funnel AI leads and qualify them.', audience: 'Executives exploring AI adoption.', context: 'Lands on the home page, prompted by the hero call to action.', metric: 'Proposed: assessment start-to-completion rate.' },
  { id: 'uc-case-study-to-contact', title: 'Review a success story and then make contact', actor: 'Prospect evaluating credibility', goal: 'Find proof of a similar solved problem (partner, sector, technology).', outcome: 'A relevant story found, then contact or a next step taken.', businessObjective: 'Turn proof points into pipeline.', audience: 'Decision makers and procurement.', context: 'Shortlisting vendors and needing references.', metric: 'Proposed: share of story readers who contact.' },
  { id: 'uc-download-gated-content', title: 'Download a whitepaper or ebook', actor: 'Practitioner or manager researching a topic', goal: 'Get in-depth content on cloud, cyber or AI.', outcome: 'Content downloaded and nurture consent given.', businessObjective: 'Lead capture and marketing nurture.', audience: 'Architects, IT managers, consultants.', context: 'Early research, not ready to talk to sales.', metric: 'Proposed: gated form completion rate.' },
  { id: 'uc-register-event', title: 'Register for a webinar or event', actor: 'Client or prospect wanting to learn from experts', goal: 'Join a session on a specific technology.', outcome: 'Registration confirmed, then attended or replay watched.', businessObjective: 'Engagement, lead generation, partner co-marketing.', audience: 'Technology users and leaders, by country.', context: 'Sees a promoted event or searches a topic.', metric: 'Proposed: registration-to-attendance rate.' },
  { id: 'uc-search-apply-job', title: 'Find a matching job and apply', actor: 'Job seeker', goal: 'Find a relevant open role by country and expertise.', outcome: 'Application submitted with a CV.', businessObjective: 'Recruit consultants at scale.', audience: 'Engineers, consultants, designers, sales.', context: 'Active job search, often landing from search straight on a job page.', metric: 'Proposed: job-view-to-application rate.' },
  { id: 'uc-explore-team-culture', title: 'Explore a team’s culture before applying', actor: 'Passive or curious candidate', goal: 'Understand what working in a given practice is like.', outcome: 'The candidate moves on to open roles.', businessObjective: 'Employer branding and better candidate fit.', audience: 'Tech professionals in specific ecosystems.', context: 'Comparing employers through practice career pages.', metric: 'Proposed: team-page-to-job-search click-through rate.' },
  { id: 'uc-subscribe-newsletter', title: 'Subscribe to the tech newsletter', actor: 'Practitioner following tech trends', goal: 'Receive regular tech content.', outcome: 'Subscription confirmed.', businessObjective: 'Build an owned audience for nurture.', audience: 'Tech practitioners and managers.', context: 'After reading content or from a promotion.', metric: 'Proposed: sign-up rate per content view.' },
  { id: 'uc-find-local-office', title: 'Find a local office and its contact details', actor: 'Existing client, candidate or visitor', goal: 'Get the address or phone number of the nearest office.', outcome: 'The right office found, a call or visit made.', businessObjective: 'Local reach and trust, fewer misrouted requests.', audience: 'Clients, candidates and suppliers in more than 20 countries.', context: 'Needs a local contact or meeting location.', metric: 'Proposed: office-page sessions ending in a call or map click.' },
  { id: 'uc-evaluate-partner-capability', title: 'Check expertise on a specific cloud partner', actor: 'IT buyer committed to AWS, Microsoft, Google Cloud or ServiceNow', goal: 'Confirm deep certified expertise on their platform.', outcome: 'The buyer contacts the partner-specific team.', businessObjective: 'Win partner-sourced and co-sell deals.', audience: 'Buyers tied to one hyperscaler.', context: 'Platform chosen, looking for an integrator.', metric: 'Proposed: partner-page-to-contact conversion rate.' },
  { id: 'uc-browse-insights-topic', title: 'Browse expert insights on a topic', actor: 'Practitioner or decision maker', goal: 'Read thought leadership on AI, cloud or cyber.', outcome: 'Several articles read, deeper engagement.', businessObjective: 'Thought leadership, search traffic, nurture.', audience: 'Broad tech audience.', context: 'Arrives from search or social on an article.', metric: 'Proposed: pages per session from article entry.' },
  { id: 'uc-find-investor-press-info', title: 'Find financial reports or press releases', actor: 'Investor, analyst or journalist', goal: 'Get official financial documents or company news.', outcome: 'Document or release found and opened.', businessObjective: 'Transparency and regulatory compliance.', audience: 'Investors, analysts, media.', context: 'Results period or news coverage.', metric: 'Proposed: investor document downloads per results release.' },
];

type I = [useCaseId: string, kind: Insight['kind'], title: string, detail: string, page: string];

const raw: I[] = [
  ['uc-contact-expertise-expert', 'observation', 'Service pages name real experts', 'Cloud native lists six named leaders and cybersecurity three, so prospects can picture who they would work with.', '/services/cloud-native-architecture/, /services/cybersecurity/'],
  ['uc-contact-expertise-expert', 'pain-point', 'Service pages show no visible contact path', 'No contact form or labelled contact action appeared in the text of the service pages, and expert profiles are not linked to contact.', '/services/cybersecurity/, /microsoft/security/'],
  ['uc-assess-ai-maturity', 'opportunity', 'A short AI self-assessment is the main home entry point', 'A time-boxed tool is a strong top-of-funnel pattern; it should show progress and a clear next step.', 'home'],
  ['uc-case-study-to-contact', 'need', 'Prospects need to filter success stories', 'The story index takes a category parameter and runs over five pages or more; no sector or outcome filter was confirmed.', '/success-story/ (search result)'],
  ['uc-case-study-to-contact', 'pain-point', 'Partner pages announce success stories but show none', 'The heading appeared empty on the AWS and Microsoft security pages, a missed proof point.', '/amazon-web-services/, /microsoft/security/'],
  ['uc-download-gated-content', 'observation', 'Long-form content is split between whitepapers and chaptered ebooks', 'Ebooks have chapter pages, which calls for chapter navigation; gating was not verified.', '/ebook/ (search result)'],
  ['uc-register-event', 'need', 'Events are spread across country paths with no single index', 'Visitors need filters for country, language, format and date.', '/event/ (search results)'],
  ['uc-register-event', 'opportunity', 'Past webinars live on as replays', 'Linking past event pages to their replay avoids dead ends.', '/webinar-on-demand/ (search result)'],
  ['uc-search-apply-job', 'observation', 'Candidates land directly on job offers from search', 'Many job pages rank in search, so the offer page must work as an entry point.', '/jobs/ (search results)'],
  ['uc-search-apply-job', 'opportunity', 'No job alert or open application on the careers hub', 'Candidates with no match today cannot be notified later.', '/join-us/'],
  ['uc-explore-team-culture', 'pain-point', 'Team career pages do not list the team’s open roles', 'The Google Cloud and Business Consulting pages have testimonials but no role list and no apply action.', '/join-us/google-cloud/, /join-us/business-consulting/'],
  ['uc-explore-team-culture', 'observation', 'Named employee testimonials carry employer branding', 'Two or three named employees per page, plus client stories showing the kind of work.', '/join-us/google-cloud/'],
  ['uc-subscribe-newsletter', 'need', 'Readers need an in-context newsletter sign-up', 'A dedicated page exists; inline sign-up on articles was not verified.', '/tech2tech-newsletter/ (search result)'],
  ['uc-find-local-office', 'pain-point', 'The office list is long, with no filter or map', 'Offices are grouped by country with headquarters first; some entries lack a phone number.', '/our-offices/'],
  ['uc-find-local-office', 'observation', 'Office entries use inconsistent fields', 'Most show address and phone, a few add email or a website. A consistent office card would help scanning.', '/our-offices/'],
  ['uc-evaluate-partner-capability', 'observation', 'Partner pages are organised around offering blocks', 'AWS lists about seven offering areas and Microsoft security six, each with a named expert team.', '/amazon-web-services/, /microsoft/security/'],
  ['uc-evaluate-partner-capability', 'pain-point', 'Partner pages offer no explicit next step', 'No labelled call to action on the AWS page; the Microsoft security prompt points back to its own offerings.', '/amazon-web-services/, /microsoft/security/'],
  ['uc-browse-insights-topic', 'need', 'Readers need topic navigation across content types', 'Content is split across magazine, expert view and topic hubs with locale variants.', '/magazine/, /topics/ (search results)'],
  ['uc-find-investor-press-info', 'observation', 'Financial reports are loose PDFs', 'Reports sit in a generic uploads folder; a list filtered by year would help findability.', '/investors/financial-information/ (search result)'],
];

export const siteInsights: Insight[] = raw.map(([useCaseId, kind, title, detail, page], i) => ({
  id: `in-site-${i + 1}`,
  kind,
  title,
  detail,
  source: `${SRC}, ${page}`,
  evidence: 'low',
  useCaseIds: [useCaseId],
}));
