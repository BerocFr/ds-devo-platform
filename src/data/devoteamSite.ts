import type { ComponentInstance } from '../domain/types';

// devoteam.com rebuilt with the library patterns only. Storytelling and section order follow
// the live site as read on 2026-10-30 (home, cybersecurity, cloud native architecture, join us,
// our offices). Copy is quoted or closely paraphrased from those pages; where the live site
// shows nothing (no call to action, empty figures), the UI pass adds the missing piece and
// says so in `changes`. Sample content (anonymised stories, generic topic pages, jobs) is
// listed in SAMPLE_NOTES. Photos: Pexels (free to use), see src/data/photos.json.

export interface SiteSection {
  componentId: string;
  variantId?: string;
  props: Record<string, string>;
}

export interface SitePage {
  id: string;
  /** Short name used in the browser title and the prototype notes. */
  name: string;
  /** Page of the live site it rebuilds, when there is one. */
  source?: string;
  sections: SiteSection[];
  /** UI pass: what changed compared with the live page, in reading order. */
  changes: string[];
}

const SERVICES: [string, string, string][] = [
  ['Artificial intelligence', 'artificial-intelligence', 'From the first use case to AI at scale, with governance built in.'],
  ['Cloud Native Architecture', 'cloud-native-architecture', ''],
  ['Cloud Native App Development', 'cloud-native-app-development', 'Design, build and modernise applications made for the cloud.'],
  ['Cloud Managed Services', 'cloud-managed-services', 'Run, secure and optimise cloud platforms day after day.'],
  ['Cybersecurity', 'cybersecurity', ''],
  ['Data', 'data', 'Data platforms, governance and analytics that AI can rely on.'],
  ['Digital Workplace', 'digital-workplace', 'Collaboration tools and AI assistants that people actually adopt.'],
  ['Training', 'training', 'Certifications and learning paths on the leading platforms.'],
  ['Strategy', 'strategy', 'Technology strategy and operating models for the AI era.'],
  ['Sustainable IT', 'sustainable-it', 'Measure and reduce the footprint of your IT.'],
];

const PARTNERS: [string, string, string, string][] = [
  ['AWS', 'aws', 'Migration and modernisation.', 'pexels-17489150'],
  ['Google Cloud', 'google-cloud', 'Data, AI and Workspace.', 'pexels-30547567'],
  ['Microsoft', 'microsoft', 'Cloud, security and Copilot.', 'pexels-8512131'],
  ['ServiceNow', 'servicenow', 'Workflows and service management.', 'pexels-7876664'],
];

const PARTNER_CARDS = [
  'AWS|Premier Consulting Partner|450+ Certified Specialists|aws',
  'Google Cloud|Premier Consulting Partner|5 Partner of the Year Awards|google-cloud',
  'Microsoft|Preferred EMEA Partner|1,200+ Certified Specialists|microsoft',
  'ServiceNow|Elite Partner|Multi-award Winning Partner|servicenow',
].join('; ');

const TOPIC_PHOTO: Record<string, string> = {
  'artificial-intelligence': 'pexels-8386437',
  'cloud-native-app-development': 'pexels-6804068',
  'cloud-managed-services': 'pexels-1181354',
  data: 'pexels-6476261',
  'digital-workplace': 'pexels-1181745',
  training: 'pexels-1181260',
  strategy: 'pexels-7495607',
  'sustainable-it': 'pexels-12932191',
};

/* ---------------- shared sections ---------------- */

const header = (): SiteSection => ({
  componentId: 'pat-site-header',
  props: {
    brand: 'devoteam',
    servicesLabel: 'Services',
    services: SERVICES.map(([label, id]) => `${label}|${id}`).join('; '),
    items: 'Partners|partners; Success stories|success-stories; Careers|join-us; Our offices|our-offices',
    locale: 'Global, English',
    cta: 'Contact us',
    ctaTo: 'contact',
  },
});

const footer = (): SiteSection => ({
  componentId: 'pat-site-footer',
  props: {
    brand: 'devoteam',
    tagline: 'AI-driven tech consulting. Over 11,000 people in more than 25 countries across Europe, the Middle East and Africa.',
    groups: [
      `Services|${SERVICES.map(([l, id]) => `${l}>${id}`).join(', ')}`,
      `Partners|${PARTNERS.map(([l, id]) => `${l}>${id}`).join(', ')}`,
      'Company|Success stories>success-stories, Careers>join-us, Jobs>jobs, Our offices>our-offices, Contact>contact',
    ].join(' || '),
    newsletter: 'Monthly Tech2Tech LinkedIn newsletter|Receive the latest tech news|Sign up on LinkedIn|https://www.linkedin.com/company/devoteam/|Browse our latest editions|https://www.linkedin.com/company/devoteam/',
    legal: '© 2026 Devoteam. Prototype rebuilt with the DS-Devo patterns, not the official site.',
    legalLinks: 'About this prototype>about-prototype, Official site>https://www.devoteam.com/',
  },
});

const STORIES = [
  'AI|Cellnex|Productivity and collaboration with Microsoft 365 Copilot|pexels-8512131|success-stories',
  'Cloud|European retailer|Core platform moved to the cloud without downtime|pexels-17489150|success-stories',
  'Data|Financial services group|A third fewer false fraud alerts with machine learning|pexels-6476261|success-stories',
].join('; ');

const contact = (title: string, promise: string): SiteSection => ({
  componentId: 'pat-contact',
  props: { title, promise, cta: 'Send my request' },
});

const OFFICES = [
  'France|Levallois-Perret|Headquarters|73 rue Anatole France, 92300 Levallois-Perret',
  'Morocco|Rabat||7, Rue Al Mariniyinne, Hassan 10020, Rabat',
  'Czech Republic|Prague||Ovocný trh 1096/8, 110 00 Prague',
  'Czech Republic|Ostrava||Českobratrská 3321/46, 702 00 Moravská Ostrava a Přívoz',
  'Slovakia|Bratislava||BBC5 Building, Plynárenská 5944/7A, 82109 Bratislava, Ružinov',
  'Belgium|Machelen||Culliganlaan 3, 1831 Machelen',
  'Denmark|Copenhagen||Kampmannsgade 2, 1604 Copenhagen V',
  'Denmark|Aarhus||Mariane Thomsens Gade 2F, 8000 Aarhus C',
  'Germany|Frankfurt am Main||Neue Mainzer Straße 32-36, 60311 Frankfurt am Main',
  'Indonesia|Jakarta||Level 17, Sequis Tower, Jl. Jend. Sudirman No.71, Jakarta 12190',
  'Italy|Milan||Via Bartolomeo Eustachi 7, 20129 Milan',
  'Lithuania|Vilnius||Artery building, Konstitucijos str. 18B, LT-09308 Vilnius',
  'Lithuania|Kaunas||BLC center, K. Donelaičio g. 60, LT-44248 Kaunas',
  'Luxembourg|Windhof||7, rue des Trois Cantons, 8399 Windhof',
  'Mexico|Mexico City||Darwin 74, Anzures, Miguel Hidalgo, 11590 México City',
  'Saudi Arabia|Riyadh||Dhabab St., Devoteam Building, 11525 Riyadh',
  'Netherlands|Amsterdam||John M. Keynesplein 10, 1066 EP Amsterdam',
  'Netherlands|The Hague||Zuid Hollandlaan 7, 2596 AL The Hague',
  'Netherlands|Amsterdam (G Cloud)||Claude Debussylaan 10, 1082 MD Amsterdam',
  'Poland|Warsaw||Ludwika Waryńskiego 3a, 00-645 Warszawa',
  'Portugal|Lisbon||Av. Dom João II 43, 1990-084 Lisbon',
  'Portugal|Porto||Av. dos Aliados 322-324, 4000-065 Porto',
  'Portugal|Aveiro||Rua Cristóvão Pinho Queimado 33, 3800-012 Aveiro',
  'Spain|Madrid||C/ Alcalá 44, 28014 Madrid',
  'Sweden|Malmö||Hans Michelsensgatan 10, 211 20 Malmö',
  'Sweden|Stockholm||Klara Östra kyrkogata 2B, 111 52 Stockholm',
  'Turkey|Istanbul||Acıbadem Mah. Çeçen Sok. Akasya Kent Etabı, A-1 Blok Kat:22 No:112, 34660 Üsküdar',
  'United Kingdom|London||5th Floor, Cottons Centre, Hay\'s Lane, London SE1 2QG',
].join('; ');

/* ---------------- pages ---------------- */

const home: SitePage = {
  id: 'home',
  name: 'Home',
  source: 'https://www.devoteam.com/',
  sections: [
    header(),
    {
      componentId: 'pat-hero-media',
      variantId: 'cinema',
      props: {
        kicker: 'Building Agents of Change',
        title: 'Your Forward Deployed Tech Partner for AI-Driven Business Transformation',
        lead: 'Profit from AI built inside your business. Deployed to production, adopted by your teams.',
        cta: 'Get in Touch',
        ctaTo: 'contact',
        cta2: 'Explore Services',
        cta2To: 'services',
        proof: '11,000+ experts in 25+ countries',
        visual: 'fluted-1',
        proofPeople: 'pexels-27086922, pexels-37148308, pexels-12396627',
        cardKicker: 'Success stories',
        cardTitle: 'Become a leading company embracing AI',
        cardImage: 'pexels-1181354',
        cardTo: 'success-stories',
      },
    },
    {
      componentId: 'pat-impact',
      variantId: 'statement',
      props: {
        figures: [
          '2,400+|AI projects|delivered yearly with 350+ atomic agents|brain|AI delivery',
          '11,000+|AI-Certified Experts|with 25,000+ Certifications|graduation|Expertise',
          '5,000+|Happy Customers||users|Customers',
          '5|Partner of the Year Awards|for AI-era innovation + 10 Specialisations|award|Recognition',
        ].join('; '),
        title: 'We are Agents of Change',
        accent: 'Agents of Change',
        body: 'Devoteam is a premium tech-native AI consulting firm working across EMEA. For 30 years, we have turned new technology, from the internet to cloud to AI, into bottom-line results for businesses and public institutions.',
      },
    },
    {
      componentId: 'pat-intro',
      variantId: 'headline',
      props: {
        kicker: 'What we do',
        lead: 'We advise. We build. We deploy.',
        body: 'Devoteam builds impactful agentic AI solutions on top of strong Cloud, Data, and Cybersecurity foundations through strategic partnerships.',
        cta: 'Explore Services',
        ctaTo: 'services',
      },
    },
    {
      componentId: 'pat-fde',
      props: {
        icon: 'cog',
        title: 'Forward Deployed Engineering',
        body: 'Most AI stalls at the pilot stage, built too far from the work it\'s meant to change. We fix that with the Forward Deployed Engineering teams. Senior engineers, AI specialists and agents move inside the business unit that owns the problem. They learn the job and build the solution. The result is AI that ships to production and changes how the work gets done.',
        link: 'See how it works',
        linkTo: 'artificial-intelligence',
        items: [
          'Strategise & Assess|Tech & Agentic Strategy and Readiness|strategy',
          'Build & Modernise|Cloud & Data Foundations|cloud-native-architecture',
          'Deploy & Accelerate|AI Pods & Platforms|artificial-intelligence',
          'Govern & Secure|AI Control & Resilience|cybersecurity',
          'Run & Optimise|Managed Services|cloud-managed-services',
          'People Enablement|Adoption & Change Management|digital-workplace',
        ].join('; '),
        highlight: '2',
        cta: 'See all Services',
        ctaTo: 'services',
      },
    },
    {
      componentId: 'pat-partner-cards',
      props: {
        kicker: 'Strategic partnerships',
        title: 'Multi Partner',
        body: 'We want to make technology work for you. So we pick a few partners and go all in, until we\'re the best at their technology. The result? They\'ve all named us a leader, and you benefit from the highest level of expertise and innovation.',
        items: PARTNER_CARDS,
      },
    },
    {
      componentId: 'pat-intro',
      variantId: 'headline',
      props: {
        kicker: 'Technology partners',
        lead: 'Complete Tech Toolkit for AI',
        body: 'Benefit from our extensive partnership network to create an integrated AI-ready stack tailored to your business challenges.',
        chips: 'Atlassian, Databricks, Dynatrace, Snowflake, NVIDIA, Cursor, ElevenLabs, Anthropic',
        cta: 'Get in touch',
        ctaTo: 'contact',
        cta2: 'Explore All Partners',
        cta2To: 'partners',
      },
    },
    {
      componentId: 'pat-apart',
      props: {
        kicker: 'Why choose Devoteam',
        title: 'What Sets Us Apart',
        items: [
          'text|rocket|Forward Deployed Engineers|Our FDE specialists embed with the team that owns the problem, so what we build fits how you actually work.',
          'stat|30+ Years|Guiding clients through every tech wave. You get a partner who knows which bets pay off.|pexels-5945799',
          'stat|3,000|AI-Certified Experts with 25,000+ Certifications. Your project is staffed by experts who already know the platforms that fit your stack.|pexels-1181260',
          'text|network|Integrated Delivery Network|11,000+ AI-certified experts in 25+ countries. You get the scale to run ambitious projects and a local team in your market.',
          'text|globe|Proven Client Satisfaction|4.3/5 client satisfaction score with over 5,000 customers. Consistent quality and results that hold up at scale.',
          'stat|2,400+|AI Projects delivered yearly with over 350 atomic agents. Your project starts from proven components, not a blank page.|pexels-7495607',
        ].join('; '),
      },
    },
    {
      componentId: 'pat-story-library',
      props: {
        kicker: 'Success stories',
        title: 'Real Results. Real Partnerships.',
        placeholder: 'I want to build...',
        filters: 'AI, Data, Cybersecurity, Managed Services',
        items: [
          "Building Privacy into Data Ingestion: RTL Nederland|Databricks|Data|pexels-9275222|success-stories",
          'Fast-tracking support for schools: how ParentPay Group uses AI|Artificial Intelligence (AI)|AI|pexels-9489396|success-stories',
          'SophIA: the intelligent assistant for TALGO trains|Artificial Intelligence (AI)|AI|pexels-8386437|success-stories',
          'How Fednot secured 24/7 cloud reliability|Cloud Managed Services|Managed Services|pexels-1181354|success-stories',
          'Aldesa success story: Google Workspace migration|Google Cloud|Managed Services|pexels-1181745|success-stories',
          'How Dunlop Hiflex Scandinavia is bringing AI to the factory floor|Artificial Intelligence (AI)|AI|pexels-6804068|success-stories',
          'Approved Food: personalising recommendations at scale|Artificial Intelligence (AI)|AI|pexels-6476261|success-stories',
          'Building the data foundation for industrial physical AI|Google Cloud|Data|pexels-30547567|success-stories',
        ].join('; '),
        clients: 'Collibra, BNP Paribas, Spotify, Randstad, Veolia, Coca-Cola HBC, Bouygues',
      },
    },
    {
      componentId: 'pat-change',
      props: {
        kicker: 'Contact us',
        title: 'Change Starts Here',
        body: 'Tell us the problem you want to solve. We\'ll show you how to get into production.',
        cta: 'Talk to an Expert',
        ctaTo: 'contact',
        cta2: 'Explore Case Studies',
        cta2To: 'success-stories',
        quotes: [
          'Devoteam helped us a lot with clear documentation, implementing everything including the connectors.|Bob Gerrmann|AI Operations Lead, Road',
          'Working with Devoteam on the Google Workspace with Gemini training was seamless. Their responsiveness to feedback and ability to deliver clear, concise training videos were especially valuable.|Maya Brandel|Head of Tech Learning at Spotify',
        ].join('; '),
      },
    },
    {
      componentId: 'pat-insights',
      props: {
        title: 'Insights from the field.',
        magazine: 'Devoteam Magazine',
        magazineLead: 'Insights from the field. Pick a topic.',
        topics: 'AI|star|artificial-intelligence; Cloud|cloud|cloud-native-architecture; Data|database|data; AWS|cloud|aws; Cyber|shield|cybersecurity; Microsoft|layers|microsoft; Google Cloud|globe|google-cloud; ServiceNow|workflow|servicenow',
        article: 'Nino Heck|Senior Solutions Engineer|Why Taste is a Valuable Skill in the Age of AI|Explore why taste, conviction about what to make before the making begins, is the defining skill in the age of AI.|pexels-8386437|artificial-intelligence',
        publication: 'Signature publications|TechRadar 2026|The definitive guide to more than 100 technologies shaping the future. Don\'t play catch-up.|Download Report|contact|pexels-27524202',
      },
    },
    {
      componentId: 'pat-faq',
      props: {
        title: 'FAQs',
        items: [
          'Which technology partners does Devoteam work with?|Devoteam holds top-tier status with AWS, Google Cloud, Microsoft and ServiceNow, plus partnerships across the wider AI and data ecosystem, including Databricks, Snowflake, Dynatrace, Atlassian and NVIDIA.',
          'What is Forward Deployed Engineering?|Senior engineers, AI specialists and agents move inside the business unit that owns the problem. They learn the job and build the solution, so AI ships to production and changes how the work gets done.',
          'Which industries does Devoteam work in?|Our success stories span media, education, rail transport, construction, manufacturing, food retail and industry, for businesses and public institutions.',
          'How does Devoteam measure the success of an engagement?|By AI that reaches production and is adopted by your teams. Our clients rate us 4.3 out of 5 on average.',
          'Where does Devoteam operate?|Devoteam works across Europe, the Middle East and Africa, with over 11,000 experts in more than 25 countries.',
        ].join('; '),
      },
    },
    footer(),
  ],
  changes: [
    'Hero: the new positioning ("Your Forward Deployed Tech Partner for AI-Driven Business Transformation", owner copy), generated fluted-glass visual, red primary "Get in Touch" and "Explore Services", proof line with portraits and a success story card, all above the fold.',
    'Identity (bench-05, owner reference Rowalo): light canvases with black sections, coral plus labels, centred heads, staggered 24px cards, pill actions with a corner arrow, Montserrat 500 very large and tight.',
    'Impact intro (owner content): "We are Agents of Change" as the label, the positioning paragraph as a large statement, and the four key figures in a two by two grid with hairlines.',
    'What we do (owner capture of the live home, 2026-10-31): centred bold headline, paragraph and a red action.',
    'Forward Deployed Engineering: the statement in a panel and the six service steps as cards, the second one dark; each step links to its service.',
    'Multi Partner: title and paragraph side by side, then one card per partner with its tier, name and proof.',
    'Complete Tech Toolkit for AI: the eight technology partners as names in pills, with two actions.',
    'What Sets Us Apart: three short reasons and three photo cards with a counting figure.',
    'Success stories: the eight stories with a search field and topic filters that work, an empty state, and client names.',
    'Change Starts Here: the closing call to action with two client quotes; avatars show initials, not photos of the quoted people.',
    'Insights from the field: magazine topics that lead to each topic page, the featured article and the TechRadar 2026 publication.',
    'FAQs: five questions that open in place. Answers two to five are written from facts on the home and need owner validation.',
    'Footer: rebuilt with grouped links (services, partners, company) and a legal line.',
  ],
};

const cybersecurity: SitePage = {
  id: 'cybersecurity',
  name: 'Cybersecurity',
  source: 'https://www.devoteam.com/services/cybersecurity/',
  sections: [
    header(),
    {
      componentId: 'pat-page-hero',
      props: {
        crumbs: 'Home|home; Services; Cybersecurity',
        visual: 'fluted-2',
        kicker: 'Cybersecurity',
        title: 'Secure your journey, guard your path',
        lead: 'Balance innovation with protection and operational efficiency.',
        cta: 'Talk to a security expert',
        ctaTo: 'contact',
        image: 'pexels-5380792',
      },
    },
    {
      componentId: 'pat-challenges',
      props: {
        kicker: "Today's challenges",
        title: 'Three threats every organisation faces',
        items: [
          'coins|Cybercrime costs|The cost of cybercrime keeps rising for organisations of every size.',
          'link|Supply chain attacks|One compromised supplier can open the door to many companies.',
          'lock|Ransomware payments|Ransom payments and downtime weigh on every sector.',
        ].join('; '),
      },
    },
    {
      componentId: 'pat-feature-rows',
      props: {
        kicker: 'Our services',
        title: 'Our cybersecurity services',
        items: [
          'GRC|Empower a proactive GRC culture||Strategy and risk, Risk management and vulnerability assessment, Compliance and regulatory guidance|ServiceNow|pexels-7876664',
          'Digital identity|Establish a unified, secure digital identity framework||Access management (AM), Privileged access management (PAM), Identity governance and administration (IGA)||pexels-5483240',
          'Secure cloud|Empower secure cloud transformation|Zero trust access, SecDevOps and cloud native application protection platforms (CNAPP).|Risk prevention, Visibility and control, Runtime protection|AWS, Google Cloud, Microsoft, ServiceNow, Palo Alto Networks|pexels-17489150',
          'Security posture|Proactively strengthen your security posture||Penetration testing, Maturity assessment, Security awareness programmes||pexels-8108728',
          'Secure AI|Empower secure and responsible AI innovation||AI adoption, Secure AI architecture, Secure AI development||pexels-8386437',
        ].join('; '),
      },
    },
    {
      componentId: 'pat-spotlight',
      props: {
        kicker: 'Developed by Devoteam',
        title: 'Alert Readiness Framework',
        subtitle: 'Bridging business and cybersecurity in a modern framework',
        body: 'Security controls that follow the threat level, like military alert levels.',
        itemsLabel: 'How the framework works',
        items: 'Map|Link business activities to the assets they depend on.; Set levels|Define alert levels and the controls each level turns on.; Adapt|Raise or lower the level as the threat changes.',
        cta: 'Talk about the ARF',
        ctaTo: 'contact',
      },
    },
    {
      componentId: 'pat-team',
      props: {
        kicker: 'People',
        title: 'Core cybersecurity team',
        names: 'Cyril Lehmann: Vice President, Business Unit; Aiert Azueta Dudagoitia: Head of Digital Identity, Business Unit; Benoit Micaud: Head of GRC, Business Unit',
        ctaTo: 'contact',
      },
    },
    contact('Talk to a security expert', 'A security expert in your country replies within two working days.'),
    footer(),
  ],
  changes: [
    'Hero: breadcrumb and a primary action added; the live page has no call to action at all.',
    'Challenges: the three statistics become three cards; the live figures were not readable, so no figure is shown rather than an invented one.',
    'Services: the five offerings (GRC, digital identity, secure cloud, security posture, secure AI) become alternating feature rows with their key points and partners, in the live order.',
    'Alert Readiness Framework: one dark spotlight band with the method in three steps (the steps are a summary of the live text) and an action.',
    'Core team: each expert gets a "Contact" link (insight: experts are named but not linked to contact). Initials instead of photos: no stock face is put on a real person.',
    'Contact section added at the end of the page.',
  ],
};

const cloudNative: SitePage = {
  id: 'cloud-native-architecture',
  name: 'Cloud Native Architecture',
  source: 'https://www.devoteam.com/services/cloud-native-architecture/',
  sections: [
    header(),
    {
      componentId: 'pat-page-hero',
      props: {
        crumbs: 'Home|home; Services; Cloud Native Architecture',
        visual: 'fluted-3',
        kicker: 'Cloud Native Architecture',
        title: 'Build your multi-cloud and hybrid business by adopting the cloud at scale',
        lead: 'Maximise the value from your cloud native architecture to innovate with AI, and grow faster.',
        cta: 'Talk to a cloud expert',
        ctaTo: 'contact',
        image: 'pexels-1181354',
      },
    },
    {
      componentId: 'pat-intro',
      props: {
        kicker: 'The challenge',
        lead: 'You started with a small cloud native setup. Today you run data centres and several public clouds.',
        body: 'One control plane over every cloud reduces complexity, costs and lock-in.',
      },
    },
    {
      componentId: 'pat-feature-rows',
      props: {
        kicker: 'Cloud native architecture',
        title: 'Why you need a multi-cloud or hybrid approach',
        items: [
          'Reasons|Reasons to go multi-cloud or hybrid||Meet regulatory needs, Control costs, Avoid vendor lock-in, Keep data secure and fast||pexels-11857023',
          'Services|Cloud native architecture services||Faster innovation, Greater agility, Streamlined operations, Lower costs|Google Cloud|pexels-6804068',
        ].join('; '),
      },
    },
    {
      componentId: 'pat-stats',
      props: { title: 'Why work with Devoteam?', items: '11,000+|employees; 25+|countries; 4|strategic partnerships' },
    },
    {
      componentId: 'pat-team',
      props: {
        kicker: 'People',
        title: 'Our cloud native experts',
        names: 'Luc Germain: CTO Devoteam Innovative Tech; Gilles Dutertre: Tribe Leader, FinOps and Agile at scale, France; Michael Marz: Principal Consultant and Red Hat Partner Manager, Germany; Killian Kaeses: Cloud Native Platform Manager, Belgium; Philippe Entringer: Deputy CTO Innovative Tech; Christophe Blanes: Advisory IT and Cloud Architect',
        ctaTo: 'contact',
      },
    },
    contact('Talk to a cloud native expert', 'A cloud architect replies within two working days.'),
    footer(),
  ],
  changes: [
    'Hero: breadcrumb and a primary action added.',
    'Opening text: the long paragraph becomes one framing sentence and a supporting paragraph.',
    'The three stacked subheadings (why, reasons, services) become two feature rows with their key points.',
    '"Why work with Devoteam?" showed a "Completed projects" label without a figure: replaced by the company figures.',
    'Experts: each gets a "Contact" link; initials instead of photos.',
    'Contact section added at the end of the page.',
  ],
};

const joinUs: SitePage = {
  id: 'join-us',
  name: 'Join us',
  source: 'https://www.devoteam.com/join-us/',
  sections: [
    header(),
    {
      componentId: 'pat-page-hero',
      props: {
        crumbs: 'Home|home; Careers',
        visual: 'fluted-5',
        kicker: 'Does this sound like you?',
        title: 'Putting people at the heart of technology is the way to unlock the future',
        lead: 'That is what we believe at Devoteam.',
        cta: 'Explore opportunities',
        ctaTo: 'jobs',
        image: 'pexels-9489396',
      },
    },
    {
      componentId: 'pat-stats',
      props: {
        title: 'Want to challenge yourself?',
        lead: 'Work with the best cloud platforms, with 8,000 tech and business leaders.',
        items: '8,000|tech and business leaders; 18|EMEA countries; 25 years|in tech',
      },
    },
    {
      componentId: 'pat-feature-rows',
      props: {
        kicker: 'Life at Devoteam',
        title: 'Multidisciplinary approach with international opportunities',
        items: [
          'Teams|Join a multidisciplinary team||Cloud experts, Designers, Business consultants, Security experts, Engineers and developers||pexels-5945799',
          'Growth|Learn, certify and grow||Partner certifications, Studio mode, Career growth, Flexibility||pexels-1181260',
          'Impact|Fuse creativity with technology|Solutions that change things for the better.|||pexels-7581000',
        ].join('; '),
      },
    },
    {
      componentId: 'pat-closing',
      props: { title: "It's all out there, just imagine", cta: 'Apply now', ctaTo: 'jobs', image: 'pexels-6804068' },
    },
    {
      componentId: 'pat-signposts',
      props: {
        items: [
          'Our offices|Offices in 18 countries.|See our offices|our-offices|pexels-30702962',
          'Get in touch|The time for better change is now.|Contact us|contact|pexels-1181745',
        ].join('; '),
      },
    },
    footer(),
  ],
  changes: [
    'Hero: the opening belief becomes the page title, "Does this sound like you?" its kicker, and "Explore opportunities" its action.',
    'Figures (8,000 people, 18 countries, 25 years) pulled out of the paragraphs into a figure band.',
    'The three paragraphs without headings (teams, learning, impact) become feature rows with headings.',
    '"Our offices" and "Get in touch" become two signposts with photos and actions.',
  ],
};

const offices: SitePage = {
  id: 'our-offices',
  name: 'Our offices',
  source: 'https://www.devoteam.com/our-offices/',
  sections: [
    header(),
    {
      componentId: 'pat-page-hero',
      props: { crumbs: 'Home|home; Our offices', visual: 'fluted-4', kicker: 'Devoteam worldwide', title: 'Our offices', lead: 'Discover our people nearby.', image: 'pexels-11936697' },
    },
    { componentId: 'pat-offices', props: { title: '', offices: OFFICES } },
    {
      componentId: 'pat-signposts',
      props: {
        items: [
          'Work with us|Offices in 18 countries, one way of working.|Join us|join-us|pexels-5945799',
          'Talk to an expert|An expert in your country replies within two working days.|Contact us|contact|pexels-1181745',
        ].join('; '),
      },
    },
    footer(),
  ],
  changes: [
    'Search by city or country with an announced count (the live list is long and has no filter).',
    'Offices grouped by country with the same fields everywhere and a link to the map instead of an embedded map.',
    'Austria and Switzerland are left out: the live page gives them the Prague address.',
    'Signposts to careers and contact added at the end.',
  ],
};

const successStories: SitePage = {
  id: 'success-stories',
  name: 'Success stories',
  source: 'https://www.devoteam.com/success-stories/',
  sections: [
    header(),
    { componentId: 'pat-page-hero', props: { crumbs: 'Home|home; Success stories', visual: 'fluted-6', kicker: 'Success stories', title: 'Become a leading company embracing AI', lead: 'How our clients build on cloud, data and cyber foundations.', image: 'pexels-6476261' } },
    { componentId: 'pat-cases', props: { title: 'All success stories', filters: 'AI, Cloud, Data, Cybersecurity, Digital workplace' } },
    { componentId: 'pat-closing', props: { title: 'Your story could be the next one', cta: 'Talk to an expert', ctaTo: 'contact', image: 'pexels-28589369' } },
    footer(),
  ],
  changes: ['Rebuilt from search results only (the live index refused automated reading): searchable index with filters by expertise and pagination.'],
};

const servicesPage: SitePage = {
  id: 'services',
  name: 'Services',
  sections: [
    header(),
    { componentId: 'pat-page-hero', props: { crumbs: 'Home|home; Services', kicker: 'Services', title: 'Our services', lead: 'From strategy to managed services, on cloud, data and cyber foundations.', visual: 'fluted-3' } },
    { componentId: 'pat-expertise', props: { kicker: 'Services', title: 'Ten services, one AI-driven transformation', items: SERVICES.map(([l]) => l).join(', ') } },
    { componentId: 'pat-closing', props: { kicker: 'Become an AI leader', title: 'Infinite possibilities to become an AI leader', cta: 'Get in Touch', ctaTo: 'contact' } },
    footer(),
  ],
  changes: ['Services index, the destination of "Explore Services" in the home hero.'],
};

const contactPage: SitePage = {
  id: 'contact',
  name: 'Contact',
  sections: [
    header(),
    { componentId: 'pat-page-hero', props: { crumbs: 'Home|home; Contact', visual: 'fluted-2', kicker: 'Get in touch', title: 'The time for better change is now', lead: 'Tell us about your project and an expert in your area will reply.', image: 'pexels-1181745' } },
    contact('Talk to an expert', 'An expert in your area replies within two working days.'),
    { componentId: 'pat-signposts', props: { items: 'Our offices|Find the office nearest to you.|See our offices|our-offices|pexels-30702962; Careers|Looking for a job instead?|Explore opportunities|jobs|pexels-9489396' } },
    footer(),
  ],
  changes: ['A contact page that every "Talk to an expert" action leads to (the live contact page refused automated reading).'],
};

const aiMaturity: SitePage = {
  id: 'ai-maturity',
  name: 'AI maturity assessment',
  sections: [
    header(),
    { componentId: 'pat-page-hero', props: { crumbs: 'Home|home; AI maturity assessment', visual: 'fluted-1', kicker: 'Unlock your AI potential', title: 'Assess your AI maturity in just 10 minutes', lead: 'Ten questions, then a short report with your next steps.' } },
    { componentId: 'pat-assessment', props: { question: 'How is AI used in your organisation today?', answers: 'Not yet, A few experiments, Some use cases in production, At scale with governance', current: '1', total: '10' } },
    footer(),
  ],
  changes: ['The assessment promised by the home hero, built from the self-assessment pattern (first question shown).'],
};

const jobs: SitePage = {
  id: 'jobs',
  name: 'Jobs',
  sections: [
    header(),
    { componentId: 'pat-page-hero', props: { crumbs: 'Home|home; Careers|join-us; Jobs', visual: 'fluted-5', kicker: 'Careers', title: 'Explore opportunities', lead: 'Cloud, data, cyber security and business roles in more than 18 countries.', image: 'pexels-5945799' } },
    { componentId: 'pat-jobs', props: { title: 'Find your next role', country: 'France' } },
    { componentId: 'pat-closing', props: { title: "It's all out there, just imagine", cta: 'Talk to a recruiter', ctaTo: 'contact', image: 'pexels-9489396' } },
    footer(),
  ],
  changes: ['Job search with filters and an announced count, the destination of "Explore opportunities" and "Apply now" (sample jobs).'],
};

function topicPage(id: string, name: string, kicker: string, lead: string, image: string): SitePage {
  return {
    id,
    name,
    sections: [
      header(),
      { componentId: 'pat-page-hero', props: { crumbs: `Home|home; ${kicker}; ${name}`, kicker, title: name, lead, cta: 'Talk to an expert', ctaTo: 'contact', image, visual: `fluted-${(id.length % 6) + 1}` } },
      { componentId: 'pat-case-teaser', props: { kicker: 'Success stories', title: `What we deliver`, items: STORIES, cta: 'Discover success stories', ctaTo: 'success-stories' } },
      contact(`Talk to a ${name} expert`, 'An expert replies within two working days.'),
      footer(),
    ],
    changes: ['Generic topic page built from four patterns; its copy is placeholder, the live page was not rebuilt.'],
  };
}

const topics: SitePage[] = [
  ...SERVICES.filter(([, , lead]) => lead).map(([name, id, lead]) => topicPage(id, name, 'Services', lead, TOPIC_PHOTO[id] ?? 'pexels-29267512')),
  ...PARTNERS.map(([name, id, lead, img]) => topicPage(id, name, 'Partners', lead, img)),
  {
    id: 'partners',
    name: 'Partners',
    sections: [
      header(),
      { componentId: 'pat-page-hero', props: { crumbs: 'Home|home; Partners', visual: 'fluted-3', kicker: 'Strategic partnerships', title: 'Built with the platforms you run on', lead: 'Certified teams on AWS, Google Cloud, Microsoft and ServiceNow.', image: 'pexels-30547567' } },
      { componentId: 'pat-partner-cards', props: { kicker: 'Strategic partnerships', title: 'Multi Partner', body: 'We pick a few partners and go all in, until we\'re the best at their technology.', items: PARTNER_CARDS } },
      footer(),
    ],
    changes: ['Partners index reached from the main navigation, built from the partner cards pattern (same cards as the home).'],
  },
];

export const SITE_PAGES: SitePage[] = [home, cybersecurity, cloudNative, joinUs, offices, successStories, servicesPage, contactPage, aiMaturity, jobs, ...topics];

export const SAMPLE_NOTES = [
  'Home success stories: titles come from the live site; photos are royalty-free stand-ins and every card leads to the success stories page. Stories elsewhere are anonymised samples.',
  'Jobs, the job filters and the assessment questions are samples.',
  'Topic pages (services other than cybersecurity and cloud native architecture, and partner pages) use placeholder copy.',
  'Forms do not send anything.',
];

export function findPage(id: string | undefined): SitePage | undefined {
  return SITE_PAGES.find((p) => p.id === (id || 'home'));
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Resolves a link key from pattern props: a page id, a label that slugs to one, or an absolute URL. */
export function siteLink(key: string): string | undefined {
  const k = key.trim();
  if (!k) return undefined;
  if (/^https?:\/\//.test(k)) return k;
  if (k === 'home') return '#/site';
  if (k === 'about-prototype') return '#/site/about-prototype';
  const id = findPage(k) ? k : findPage(slug(k)) ? slug(k) : undefined;
  return id ? `#/site/${id}` : undefined;
}

export function toInstances(page: SitePage): ComponentInstance[] {
  return page.sections.map((s, i) => ({ id: `${page.id}-${i}`, componentId: s.componentId, variantId: s.variantId ?? 'default', size: 'md', state: 'default', props: s.props }));
}
