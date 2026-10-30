// End-to-end smoke test: serves the production build, walks the full chain
// (overview, design system, components, insights, journey builder, preview, generator)
// in headless Chromium, fails on any console error, and saves screenshots to e2e/shots.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import chromium from '@sparticuz/chromium';
import { chromium as pw } from 'playwright-core';
import { readFileSync } from 'node:fs';
const AXE = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');

const PORT = 4300 + Math.floor(Math.random() * 500);
const BASE = `http://localhost:${PORT}/`;
mkdirSync('e2e/shots', { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('preview server did not start')), 20000);
  server.stdout.on('data', (d) => d.toString().includes(String(PORT)) && (clearTimeout(t), res()));
});

const browser = await pw.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

// Photos come from the Pexels CDN; the test machine is offline, so answer them with a local
// placeholder image (the photo path renders) instead of letting them fail.
const PH = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#5a6470"/><stop offset="1" stop-color="#2b3138"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
await page.route(/images\.pexels\.com/, (r) => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: PH }));

const steps = [];
const step = async (name, fn) => {
  try {
    await fn();
    steps.push(`PASS ${name}`);
  } catch (e) {
    steps.push(`FAIL ${name}: ${e.message.split('\n').slice(0, 3).join(' / ')}`);
    await page.screenshot({ path: `e2e/shots/FAIL-${steps.length}.png` }).catch(() => {});
  }
};
const screenNode = (title) => page.locator('.react-flow__node-screen').filter({ has: page.locator('.jnode-title', { hasText: new RegExp(`^${title}$`) }) });
const axeFindings = [];
const axe = async (label) => {
  await page.addScriptTag({ content: AXE });
  const res = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
  });
  for (const x of res) axeFindings.push(`${label}: ${x}`);
  return res;
};
// Screenshots are evidence, not assertions: freeze CSS animations and allow slow software rendering.
const shot = (n) => page.screenshot({ path: `e2e/shots/${n}.png`, animations: 'disabled', timeout: 60000 });

await page.goto(BASE + '#/overview');
await step('overview renders the brand-to-experience chain', async () => {
  await page.getByRole('heading', { name: 'From brand to experience' }).waitFor();
  await page.getByText('Quick account creation').first().waitFor();
  await shot('01-overview');
  await axe('overview');
});

await step('design system: edit a primitive and see the semantic token resolve', async () => {
  await page.goto(BASE + '#/design-system/colors');
  await page.getByRole('heading', { name: 'Contrast check (WCAG 2.2)' }).waitFor();
  await shot('02-design-system-colors');
  await axe('design-system colors');
  await page.goto(BASE + '#/design-system/tokens');
  await page.getByRole('textbox', { name: 'Value of space.md' }).fill('1.25rem');
  await page.keyboard.press('Enter');
  await page.getByText('space.md set to 1.25rem').waitFor();
  await page.getByRole('textbox', { name: 'Value of space.md' }).fill('1rem');
  await page.keyboard.press('Enter');
  await page.goto(BASE + '#/design-system/dependencies');
  await page.getByRole('heading', { name: 'Components affected' }).waitFor();
  await shot('03-design-system-dependencies');
});

await step('components: search, filter by benchmark, change variant', async () => {
  await page.goto(BASE + '#/components');
  await page.getByRole('textbox', { name: 'Search components' }).fill('card');
  await page.getByRole('link', { name: /Case study card/ }).click();
  await page.getByRole('button', { name: 'Accent' }).first().click();
  await page.getByText('From benchmark').first().waitFor();
  await page.getByRole('textbox', { name: 'Search components' }).fill('');
  await page.getByRole('link', { name: /^Button/ }).first().click();
  await page.getByRole('group', { name: 'Variant' }).getByRole('button', { name: 'Secondary' }).click();
  await page.getByRole('tab', { name: /Used in/ }).click();
  await shot('04-components');
  await axe('components');
});

await step('insights: traceability badges link to journey steps', async () => {
  await page.goto(BASE + '#/insights/uc-signup');
  await page.getByRole('heading', { name: 'Create an account quickly' }).waitFor();
  await page.getByText(/Traced to/).first().waitFor();
  await shot('05-insights');
  await axe('insights');
});

await step('journey builder: canvas, select a screen, edit a component', async () => {
  await page.goto(BASE + '#/journeys/jr-signup');
  await page.locator('.react-flow__node-screen').first().waitFor();
  await page.waitForTimeout(400);
  await shot('06-builder');
  await axe('journey builder');
  await screenNode('Registration form').locator('.jnode-title').click();
  await page.getByRole('tab', { name: /^Components \d/ }).click();
  await page.getByRole('button', { name: /Button.*Create account/ }).click();
  const label = page.getByRole('textbox', { name: 'Label' }).first();
  await label.fill('Create my account');
  await screenNode('Registration form').getByText('Create my account').waitFor();
  await shot('07-builder-inspector');
  await page.keyboard.press('Escape');
});

await step('journey builder: undo restores the previous label', async () => {
  await page.locator('.react-flow__pane').click({ position: { x: 30, y: 30 } });
  await page.getByRole('button', { name: 'Undo' }).click();
  await screenNode('Registration form').getByText('Create account', { exact: true }).waitFor();
});

await step('journey builder: link an insight and validate', async () => {
  // Verify email sits right of the opening view: fit the whole journey first.
  await page.getByRole('button', { name: 'Fit journey to view' }).click();
  await page.waitForTimeout(400);
  await screenNode('Verify email').locator('.jnode-title').click();
  await page.getByRole('tab', { name: /Insights/ }).first().click();
  await page.getByRole('combobox', { name: 'Link an insight' }).selectOption({ label: 'Expired codes are a dead end' });
  await page.locator('.react-flow__pane').click({ position: { x: 30, y: 30 } });
  await page.getByRole('button', { name: /^Validate/ }).click();
  await page.getByText(/Validation (passed|found)/).waitFor();
  await shot('08-validation');
});

await step('journey builder: add a screen block and connect it', async () => {
  await page.getByRole('tab', { name: 'Blocks' }).click();
  await page.getByRole('button', { name: /^Screen A step/ }).click();
  await page.getByRole('heading', { name: 'New screen' }).waitFor();
  await page.getByRole('button', { name: 'Undo' }).click();
});

await step('preview: walk the main path and an error branch', async () => {
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const dlg = page.getByRole('dialog', { name: /Preview of/ });
  await dlg.waitFor();
  await shot('09-preview-welcome');
  await dlg.getByRole('button', { name: 'Get started' }).click();
  await dlg.getByRole('button', { name: 'Create account' }).click();
  await dlg.getByRole('button', { name: /Invalid/ }).click();
  await dlg.getByText('Check 1 field to continue.').waitFor();
  await shot('10-preview-error');
  await axe('preview');
  await dlg.getByRole('button', { name: 'Create account' }).click();
  await dlg.getByRole('button', { name: /^Valid/ }).click();
  await dlg.getByRole('button', { name: 'Verify email' }).click();
  await dlg.getByRole('button', { name: /Accepted/ }).click();
  await dlg.getByText('Account created').waitFor();
  await dlg.getByRole('button', { name: 'Open my project' }).click();
  await dlg.getByText(/Journey ends/).waitFor();
  await shot('11-preview-end');
  await page.keyboard.press('Escape');
});

await step('describe a journey in French: draft, create, pages view', async () => {
  await page.goto(BASE + '#/journeys');
  await page.getByRole('button', { name: 'Describe a journey' }).first().click();
  await page.getByRole('textbox', { name: 'What should the journey do?' }).fill('Un candidat cherche un poste de data engineer au Portugal et postule avec son CV');
  await page.getByRole('button', { name: 'Draft the journey' }).click();
  await page.getByText('Drafted by rules').waitFor();
  await page.getByText('Find a matching job and apply').first().waitFor();
  await shot('12-describe');
  await page.getByRole('button', { name: 'Create journey' }).click();
  await screenNode('Job board').waitFor();
  await page.waitForTimeout(400);
  await shot('13-generated');
  await page.getByRole('group', { name: 'View' }).getByRole('button', { name: 'Pages' }).click();
  await page.locator('.pv-page').first().waitFor();
  await page.waitForTimeout(500);
  await shot('13b-pages-view');
  await axe('pages view');
  await page.getByRole('group', { name: 'View' }).getByRole('button', { name: 'Canvas' }).click();
});

await step('library: patterns render as full sections', async () => {
  await page.goto(BASE + '#/components/pat-jobs');
  await page.getByRole('heading', { name: 'Job board' }).waitFor();
  await page.getByText('Built from').waitFor();
  await page.waitForTimeout(300);
  await shot('16-pattern');
  await page.goto(BASE + '#/components/pat-contact');
  await page.waitForTimeout(300);
  await shot('17-pattern-contact');
});

await step('overview prompt bar opens a drafted journey', async () => {
  await page.goto(BASE + '#/overview');
  await page.getByRole('textbox', { name: 'Describe a journey and get its pages' }).fill('A visitor downloads our AWS cloud whitepaper and reads it online');
  await page.getByRole('button', { name: 'Draft the journey' }).click();
  await page.getByText('Drafted by rules').waitFor();
  await shot('18-overview-ask');
  await page.keyboard.press('Escape');
});

await step('persistence: reload keeps the generated journey', async () => {
  await page.waitForTimeout(900);
  await page.goto(BASE + '#/journeys');
  await page.reload();
  await page.getByRole('link', { name: /Find a job and apply/ }).first().waitFor();
});

await step('site rebuild: home renders from patterns, in the live order', async () => {
  await page.goto(BASE + '#/site');
  await page.getByRole('heading', { level: 1, name: /Build your AI-driven transformation/ }).waitFor();
  const order = await page.locator('.site-block').evaluateAll((els) => els.map((e) => e.getAttribute('data-pattern')));
  const expected = ['Site header', 'Hero with media', 'Featured stories', 'Expertise grid', 'Partner showcase', 'Story teaser', 'Story split', 'Partner band', 'Closing statement', 'Site footer'];
  if (order.join('|') !== expected.join('|')) throw new Error(`order ${order.join(', ')}`);
  await page.waitForTimeout(1300);
  await shot('20-site-home');
  // Scroll through once so every reveal has fired, then capture the whole page.
  for (let y = 0; y < 9000; y += 600) {
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'e2e/shots/20b-site-home-full.png', fullPage: true });
  await page.evaluate(() => window.scrollTo(0, 0));
});

await step('site rebuild: services menu, keyboard and page navigation', async () => {
  const menu = page.getByRole('button', { name: 'Services' });
  await menu.click();
  await page.getByRole('link', { name: 'Cybersecurity' }).first().waitFor();
  await page.keyboard.press('Escape');
  if ((await menu.getAttribute('aria-expanded')) !== 'false') throw new Error('Escape did not close the menu');
  await menu.click();
  await page.locator('.ds-subnav2').getByRole('link', { name: 'Cybersecurity' }).click();
  await page.getByRole('heading', { level: 1, name: 'Secure your journey, guard your path' }).waitFor();
  await page.getByRole('heading', { name: 'Alert Readiness Framework' }).waitFor();
  await page.getByRole('link', { name: /Contact Cyril/ }).click();
  await page.getByRole('heading', { level: 1, name: 'The time for better change is now' }).waitFor();
  await page.getByRole('button', { name: 'Send my request' }).click();
  await page.getByText('This is a prototype: nothing was sent or saved.').waitFor();
});

await step('site rebuild: office search filters and announces the count', async () => {
  await page.goto(BASE + '#/site/our-offices');
  const box = page.getByRole('searchbox', { name: 'Find an office by city or country' });
  await box.fill('portugal');
  await page.getByText('3 offices in 1 country').waitFor();
  await box.fill('zzz');
  await page.getByText(/No office matches/).waitFor();
  await box.fill('');
});

await step('site rebuild: pattern overlay links each block to the library', async () => {
  await page.goto(BASE + '#/site/join-us');
  await page.getByRole('heading', { level: 1, name: /Putting people at the heart/ }).waitFor();
  await page.getByRole('button', { name: 'Show patterns' }).click();
  await page.getByRole('link', { name: 'Pattern: Page hero' }).waitFor();
  await page.waitForTimeout(900);
  await shot('21-site-patterns');
  await page.getByRole('link', { name: 'Pattern: Feature rows' }).click();
  await page.getByText('Built from').waitFor();
  await page.waitForTimeout(400);
  await shot('24-library-feature-rows');
  await page.goto(BASE + '#/components/pat-hero-media');
  await page.getByText('Built from').waitFor();
  await page.waitForTimeout(400);
  await shot('25-library-hero');
});

await step('site rebuild: every page renders and passes axe (reduced motion)', async () => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const ids = ['', 'cybersecurity', 'cloud-native-architecture', 'join-us', 'our-offices', 'success-stories', 'contact', 'ai-maturity', 'jobs', 'partners', 'data', 'aws', 'about-prototype'];
  for (const id of ids) {
    await page.goto(BASE + (id ? `#/site/${id}` : '#/site'));
    await page.locator('h1').first().waitFor();
    await axe(`site ${id || 'home'}`);
  }
  await shot('22-site-about');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '#/site');
  await page.locator('h1').first().waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`horizontal overflow ${overflow}px at 390px`);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Careers' }).waitFor();
  await shot('23-site-phone');
  await axe('site phone');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

await step('accessibility: no serious or critical axe violation', async () => {
  if (axeFindings.length) throw new Error(`${axeFindings.length} findings`);
});

await step('mobile width: shell stays usable', async () => {
  await page.setViewportSize({ width: 820, height: 900 });
  await page.goto(BASE + '#/overview');
  await page.getByRole('heading', { name: 'From brand to experience' }).waitFor();
  await shot('14-narrow');
});

await browser.close();
server.kill();
console.log(steps.join('\n'));
if (axeFindings.length) console.log('AXE:\n' + axeFindings.join('\n'));
if (errors.length) console.log('CONSOLE ERRORS:\n' + [...new Set(errors)].join('\n'));
const failed = steps.filter((s) => s.startsWith('FAIL')).length + (errors.length ? 1 : 0);
console.log(`e2e steps=${steps.length} failed=${failed}`);
process.exit(failed ? 1 : 0);
