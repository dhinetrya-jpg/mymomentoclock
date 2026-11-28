// Isolated synthetic renderer acceptance. This server never mounts the product gateway.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';

const root = fileURLToPath(new URL('../..', import.meta.url));
const fixture = {
  timezone: 'America/New_York',
  ruleVersion: 'synthetic-pilot-v1',
  provenance: 'Synthetic pilot fixture only',
  windows: [
    {start: '2026-11-01T05:10:00Z', end: '2026-11-01T05:40:00Z', classification: 'AUSPICIOUS',
      reasons: ['Synthetic positive criterion matched.']},
    {start: '2026-11-01T06:10:00Z', end: '2026-11-01T06:40:00Z', classification: 'NON_AUSPICIOUS',
      reasons: ['Synthetic exclusion criterion matched.', 'Untrusted <em>reason</em> is plain text.']},
    {start: '2026-11-01T07:10:00Z', end: '2026-11-01T07:40:00Z', classification: 'NEUTRAL',
      reasons: ['Synthetic criteria did not establish a classification.']},
  ],
};

const {outputFiles} = await build({
  stdin: {
    contents: `
      import { createRoot } from 'react-dom/client';
      import { LocationTimingWindows } from './src/components/LocationTimingWindows';
      const fixture = ${JSON.stringify(fixture)};
      createRoot(document.getElementById('pilot')).render(
        <LocationTimingWindows {...fixture}
          windows={location.pathname === '/empty' ? [] : fixture.windows} />
      );
    `,
    loader: 'tsx',
    resolveDir: root,
  },
  bundle: true,
  jsx: 'automatic',
  define: {'process.env.NODE_ENV': '"production"'},
  write: false,
});

const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.url === '/pilot.js') {
    response.setHeader('Content-Type', 'text/javascript');
    response.end(outputFiles[0].contents);
  } else if (request.url === '/' || request.url === '/empty') {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!DOCTYPE html><html lang="en"><meta charset="UTF-8"><title>Synthetic pilot acceptance</title><main id="pilot"></main><script src="/pilot.js"></script></html>');
  } else {
    response.writeHead(404).end();
  }
});
const base = await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolve('http://127.0.0.1:' + server.address().port));
});

let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const paths = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    paths.push(url.pathname);
    return url.origin === base ? route.continue() : route.abort();
  });
  await page.goto(base);
  const regions = page.getByRole('region', {name: 'Timing windows'});
  await regions.getByRole('heading', {name: 'Auspicious', exact: true}).waitFor();
  assert.deepEqual(await regions.getByRole('heading', {level: 4}).allTextContents(),
    ['Auspicious', 'Non-auspicious', 'Neutral']);
  for (const {reasons} of fixture.windows) {
    for (const reason of reasons) assert.equal(await regions.getByText(reason, {exact: true}).count(), 1);
  }
  assert.equal(await regions.locator('em').count(), 0);
  assert.equal(await regions.getByText(fixture.timezone, {exact: true}).count(), 1);
  assert.equal(await regions.getByText(/synthetic-pilot-v1 · Synthetic pilot fixture only/).count(), 1);

  const times = await regions.locator('time').evaluateAll(nodes => nodes.map(time => [time.dateTime, time.textContent]));
  assert.deepEqual(times.map(([instant]) => instant), fixture.windows.flatMap(({start, end}) => [start, end]));
  assert.match(times[0][1], /01:10:00 GMT-4$/);
  assert.match(times[2][1], /01:10:00 GMT-5$/);
  assert.equal(await page.locator('input, select, textarea').count(), 0);
  assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]);

  await page.goto(base + '/empty');
  await regions.getByText('No timing windows are available.', {exact: true}).waitFor();
  assert.equal(await regions.locator('time').count(), 0);
  assert.ok(paths.every(path => ['/', '/empty', '/pilot.js'].includes(path)), paths.join(','));
  console.log('Synthetic pilot renderer: classifications, reasons, provenance, repeated-hour offsets, empty state and no product requests passed.');
} finally {
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
