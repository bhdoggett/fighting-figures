// Automated playtest: drives the game in Chrome and saves screenshots.
// Usage: node scripts/playtest.ts [baseUrl] [outDir]
import { chromium, type Page } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:5179';
const out = process.argv[3] ?? '/tmp/ff-shots';
const dur = Number(process.env.DUR ?? 20);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log(`shot ${name}`);
}

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors: string[] = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

await page.goto(`${base}/?dur=${dur}`);
if (process.env.FRESH) {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}
await sleep(1500);
await shot(page, '01-pick');

await page.getByRole('button', { name: 'FIGHT!' }).click();
await sleep(1200);
await shot(page, '02-countdown');
await sleep(2200);

// Fight: walk toward the bot and mash attacks.
const keys = ['KeyE', 'KeyE', 'Space', 'KeyE', 'ArrowLeft', 'KeyE', 'KeyF'];
const start = Date.now();
let i = 0;
await page.keyboard.down('KeyW');
while (Date.now() - start < (dur + 1) * 1000) {
  await page.keyboard.press(keys[i % keys.length]);
  if (i % 9 === 0) await page.mouse.click(640, 400);
  i++;
  await sleep(180);
  if (i === 12) await shot(page, '03-fight');
  if (i === 40) await shot(page, '04-fight-later');
}
await page.keyboard.up('KeyW');
await sleep(500);
await shot(page, '05-times-up');
await sleep(3000);
await shot(page, '06-results');

const prizeBtn = page.getByRole('button', { name: /Get my prize!|Continue/ });
const label = await prizeBtn.textContent();
await prizeBtn.click();
await sleep(800);
if (label?.includes('prize')) {
  await shot(page, '07-prize');
  await page.locator('button').first().click();
  await sleep(800);
}
await shot(page, '08-pick-after');
const save = await page.evaluate(() => localStorage.getItem('fighting-figures.save'));
console.log('save:', save?.slice(0, 200));
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
