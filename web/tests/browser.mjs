import { createRequire } from 'node:module';
import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/codex/cua_node/lib/node_modules/playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const data = JSON.parse(await readFile(resolve(root, 'data/results.json'), 'utf8'));
const dist = resolve(root, 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.csv': 'text/csv' };
// Serve the production output at a nested path with no SPA fallback. Missing
// downloads must be real failures, not an HTML page returned with status 200.
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (!pathname.startsWith('/results/')) { response.writeHead(404).end(); return; }
  const relative = decodeURIComponent(pathname.slice('/results/'.length)) || 'index.html';
  const target = resolve(dist, relative);
  if (!target.startsWith(dist + sep)) { response.writeHead(403).end(); return; }
  try {
    const content = await readFile(target);
    response.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream' }).end(content);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/results/`;
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const fmt = value => value.toLocaleString('en-US', { maximumFractionDigits: 3 });
  for (const width of [320, 390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('h1').innerText(), 'One circle.\nMore ways to compute it.');
    assert.equal(await page.locator('svg[role="img"]').count(), 4);
    assert.equal(await page.locator('#workload').inputValue(), '1500');
    for (const terms of [20, 500, 1500]) {
      await page.selectOption('#workload', String(terms));
      const records = data.rows.filter(row => row.terms === terms);
      const rows = page.locator('#rows tr');
      assert.equal(await rows.count(), records.length);
      for (const [index, row] of records.entries()) {
        const cells = await rows.nth(index).locator('td').allTextContents();
        assert.deepEqual(cells, [fmt(row.median_ms), `${fmt(row.min_ms)} to ${fmt(row.max_ms)}`, `${fmt(row.speedup)}×`, row.efficiency === null ? 'Not applicable' : `${fmt(row.efficiency * 100)}%`]);
      }
      for (const [index, key] of ['median_ms', 'speedup', 'efficiency'].entries()) {
        const chart = page.locator('.chart svg').nth(index);
        assert.match(await chart.getAttribute('aria-label'), new RegExp(`${terms} Taylor`));
        const values = records.filter(row => row[key] !== null).map(row => row[key]);
        const heights = await chart.locator('rect').evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('height'))));
        assert.equal(heights.length, values.length);
        heights.forEach((height, i) => assert.ok(Math.abs(height - 130 * values[i] / Math.max(...values)) < 1e-9));
      }
    }
    for (const link of await page.locator('a[download]').all()) {
      const href = await link.getAttribute('href');
      const response = await page.request.get(new URL(href, page.url()).href);
      assert.equal(response.status(), 200);
      const relative = href.replace(/^\.\//, '');
      assert.equal(await response.text(), await readFile(resolve(root, relative), 'utf8'), `download ${href} matches source evidence`);
    }
    await page.getByRole('link', { name: 'Evidence', exact: true }).click();
    assert.equal(new URL(page.url()).hash, '#evidence');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'page must not overflow viewport');
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `/tmp/clomp-c11-final-${width}.png`, fullPage: true });
    await page.close();
    console.log(`PASS ${width}px: all workloads, exact table and chart values, evidence downloads, anchor, nested path, no overflow or page errors`);
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
