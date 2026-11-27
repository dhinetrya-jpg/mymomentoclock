import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import express from 'express';
import { readFileSync } from 'node:fs';
import {
  createTimingGateway,
  validTimingRequest,
  timingGatewayFromEnvironment,
  type TimingGatewayOptions,
  type TimingTransport,
} from '../../server/timingBoundary';
import { calculateRealDailyTimingWindows } from '../../server/dailyTimingEngine';
import { DailyTiming, TimingTimeline } from '../../src/components/DailyTiming';
import { TIMING_ACTIVITIES, type TimingRequest, type TimingResult } from '../../src/engine/timingClient';

const request: TimingRequest = {
  schema_version: 1,
  birth: { date: '2000-01-01', time: '12:00', certainty: 'EXACT', timezone: 'Asia/Kolkata', latitude: 22.57, longitude: 88.36 },
  target: { date: '2026-03-08', timezone: 'America/New_York', latitude: 40.71, longitude: -74 },
  activity: 'work',
  rule_version: 'timing-rules-v1',
  ephemeris_mode: 'MOSHIER',
};

async function serve(run: (base: string) => Promise<void>, transportOrOpts?: TimingTransport | TimingGatewayOptions) {
  const app = express();
  app.use(express.json({ limit: '64kb' }));
  app.use('/api/v1/timing', createTimingGateway(transportOrOpts));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  try {
    await run('http://127.0.0.1:' + (server.address() as any).port);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  }
}

const post = (base: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(base + '/api/v1/timing/daily', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

// =============================================================================
// PART 1: EXISTING FAIL-CLOSED PRODUCTION GATE CONTRACTS (GATE CLOSED = 503)
// =============================================================================

for (const activity of TIMING_ACTIVITIES)
  test(`versioned activity ${activity.id} cannot activate personal results when gate is closed`, () => {
    assert.ok(validTimingRequest({ ...request, activity: activity.id }));
  });

test('strict request schema rejects profiles, facts, approval flags and invalid civil data', () => {
  for (const b of [
    { ...request, customer_id: 'other' },
    { ...request, facts: [] },
    { ...request, release_authorized: true },
    { ...request, ephemeris_mode: 'BROWSER' },
    { ...request, rule_version: 'unapproved' },
    { ...request, target: { ...request.target, date: '2026-02-30' } },
    { ...request, birth: { ...request.birth, latitude: 91 } },
    { ...request, birth: { ...request.birth, time: '25:00' } },
    { ...request, birth: { ...request.birth, timezone: 'Local' } },
    { ...request, birth: { ...request.birth, certainty: 'APPROXIMATE' } },
  ])
    assert.equal(validTimingRequest(b), false);
});

test('default gateway always returns typed unavailable without personal echoes and blocks QA unlock in production', () =>
  serve(async (base) => {
    const r = await post(base, request);
    assert.equal(r.status, 503);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    const b = await r.json();
    assert.equal(b.status, 'UNAVAILABLE');
    assert.equal(b.code, 'CORE_P0_01_NOT_VERIFIED');
    assert.deepEqual(b.windows, []);
    assert.equal(b.provenance.release_authorized, false);
    assert.doesNotMatch(JSON.stringify(b), /2000-01-01|22\.57|88\.36/);

    const qaBlocked = await fetch(base + '/api/v1/timing/qa-unlock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'any-token' }),
    });
    assert.equal(qaBlocked.status, 403);
  }));

test('query parameters and oversized bodies are rejected', () =>
  serve(async (base) => {
    assert.equal((await fetch(base + '/api/v1/timing/daily?birthDate=private')).status, 422);
    assert.equal((await post(base, { ...request, padding: 'x'.repeat(17000) })).status, 413);
    assert.equal((await fetch(base + '/api/v1/timing/daily')).status, 405);
    assert.equal((await post(base, { ...request, user_id: 'other' })).status, 422);
  }));

test('capability and registry remain explicitly blocked when gate is closed', () =>
  serve(async (base) => {
    const c = await (await fetch(base + '/api/v1/timing/capability')).json();
    assert.equal(c.release_authorized, false);
    assert.equal(c.qa_preview_available, undefined);
    assert.equal(c.accuracy_status, 'NOT_VERIFIED');
    assert.equal(c.missing_dependencies.length, 4);
    const a = await (await fetch(base + '/api/v1/timing/activities')).json();
    assert.deepEqual(
      a.activities.map((v: any) => v.id),
      TIMING_ACTIVITIES.map((v) => v.id)
    );
    assert.ok(a.activities.every((v: any) => v.status === 'UNAVAILABLE'));
    assert.match(a.activities.find((v: any) => v.id === 'finance').limitation, /no guaranteed profit/);
  }));

test('upstream fixtures, fake approval or response birth details cannot leak through gateway', () =>
  serve(
    async (base) => {
      const r = await post(base, request);
      assert.equal(r.status, 503);
      assert.equal((await r.json()).code, 'TIMING_SERVICE_UNAVAILABLE');
    },
    async () => ({ status: 200, body: { schema_version: 1, status: 'PROVISIONAL', windows: [{ start: 'private' }], provenance: { release_authorized: true }, birth: request.birth } })
  ));

test('upstream blocked response is projected and stripped of extras', () =>
  serve(
    async (base) => {
      const b = await (await post(base, request)).json();
      assert.equal(b.code, 'REQUIRED_FACT_COVERAGE_MISSING');
      assert.equal(b.birth, undefined);
      assert.equal(b.day.elapsed_seconds, 82800);
    },
    async () => ({
      status: 503,
      body: {
        schema_version: 1,
        status: 'INSUFFICIENT_EVIDENCE',
        code: 'REQUIRED_FACT_COVERAGE_MISSING',
        windows: [],
        provenance: { release_authorized: false },
        birth: request.birth,
        day: { date: '2026-03-08', timezone: 'America/New_York', start: '2026-03-08T05:00:00Z', end: '2026-03-09T04:00:00Z', elapsed_seconds: 82800 },
      },
    })
  ));

test('daily screen has no stored natal defaults or verified recommendation', () => {
  const html = renderToStaticMarkup(<DailyTiming />);
  assert.match(html, /Birth IANA timezone/);
  assert.match(html, /Unknown time/);
  assert.match(html, /Financial categories/);
  assert.doesNotMatch(html, /localStorage|value="2000-|Verified recommendation|confidence/);
});

test('timeline renders DST elapsed hours and escapes explanation markup', () => {
  const result: TimingResult = {
    schema_version: 1,
    status: 'PROVISIONAL',
    code: 'SYNTHETIC_ALGORITHM_ONLY',
    activity: 'work',
    day: { date: '2026-03-08', timezone: 'America/New_York', start: '2026-03-08T05:00:00Z', end: '2026-03-09T04:00:00Z', elapsed_seconds: 82800 },
    windows: [{ start: '2026-03-08T06:00:00Z', end: '2026-03-08T08:00:00Z', duration_seconds: 7200, rank: 1, rule_ids: ['fixture'], explanations: ['<img src=x onerror=alert(1)>'], classification: 'PROVISIONAL_TRADITIONAL_FAVORABLE' }],
    limitations: [],
    provenance: { calculation_version: 'timing-v1', rule_version: 'timing-rules-v1', ephemeris_mode: 'SYNTHETIC', requested_ephemeris_mode: 'MOSHIER', source: 'fixture', calculated_at: '2026-01-01T00:00:00Z', accuracy_status: 'SYNTHETIC_NOT_ACCURACY_EVIDENCE', release_authorized: false },
  };
  const html = renderToStaticMarkup(<TimingTimeline result={result} />);
  assert.match(html, /23 elapsed hours/);
  assert.match(html, /GMT-5/);
  assert.match(html, /GMT-4/);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
});

test('mirrored timing client, engines, and UI components remain synchronized across src and frontend/src', () => {
  for (const name of ['engine/timingClient.ts', 'components/DailyTiming.tsx', 'components/AuspiciousMasterHub.tsx'])
    assert.equal(
      readFileSync(new URL('../../src/' + name, import.meta.url), 'utf8').replace(/\r\n/g, '\n').trimEnd(),
      readFileSync(new URL('../../frontend/src/' + name, import.meta.url), 'utf8').replace(/\r\n/g, '\n').trimEnd()
    );

  const mirroredPaths = [
    'App.tsx',
    'main.tsx',
    'pwa/PwaStatus.tsx',
    'engine/planetaryEphemeris.ts',
    'engine/astroMath.ts',
    'engine/zeroCostAstroEngine.ts',
    'engine/scoringEngine.ts',
    'engine/offlineGeoData.ts',
    'engine/aiNarrativeEngine.ts',
    'engine/personalProfileEngine.ts',
    'engine/uatAndStress.ts',
    'components/DiwaliProsperityKit.tsx',
    'components/LivingRoomTvDashboard.tsx',
    'components/ModernLocationPicker.tsx',
    'components/MuhuratCalculationExplainer.tsx',
    'components/OnboardingWizard.tsx',
    'components/PersonalProfileModal.tsx',
    'components/CustomerCheckout.tsx',
    'components/SandboxCheckout.tsx',
    'components/ConversionFunnelView.tsx',
  ];
  for (const rel of mirroredPaths) {
    const primary = readFileSync(new URL('../../src/' + rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n').trimEnd();
    const mirrored = readFileSync(new URL('../../frontend/src/' + rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n').trimEnd();
    assert.equal(primary, mirrored, `Mirror drift detected between src/${rel} and frontend/src/${rel}`);
  }
});

test('remote public URLs cannot become personal-data transport', () => {
  const old = process.env.TIMING_INTERNAL_URL;
  try {
    process.env.TIMING_INTERNAL_URL = 'https://external.example/';
    assert.throws(() => timingGatewayFromEnvironment(), /CONFIGURATION/);
  } finally {
    if (old === undefined) delete process.env.TIMING_INTERNAL_URL;
    else process.env.TIMING_INTERNAL_URL = old;
  }
});

test('browser client rejects verified claims, invalid windows and mismatched provenance', async () => {
  const { calculateDailyTiming } = await import('../../src/engine/timingClient');
  const original = globalThis.fetch;
  const valid: any = {
    schema_version: 1,
    status: 'PROVISIONAL',
    code: 'SYNTHETIC_ALGORITHM_ONLY',
    activity: 'work',
    day: { date: '2026-03-08', timezone: 'America/New_York', start: '2026-03-08T05:00:00Z', end: '2026-03-09T04:00:00Z', elapsed_seconds: 82800 },
    windows: [{ start: '2026-03-08T06:00:00Z', end: '2026-03-08T08:00:00Z', duration_seconds: 7200, rank: 1, rule_ids: ['fixture'], explanations: ['Synthetic only'], classification: 'PROVISIONAL_TRADITIONAL_FAVORABLE' }],
    limitations: ['Synthetic only'],
    provenance: { calculation_version: 'timing-v1', rule_version: 'timing-rules-v1', ephemeris_mode: 'SYNTHETIC', requested_ephemeris_mode: 'MOSHIER', source: 'fixture', calculated_at: '2026-01-01T00:00:00Z', accuracy_status: 'SYNTHETIC_NOT_ACCURACY_EVIDENCE', release_authorized: false },
  };
  try {
    globalThis.fetch = async () => new Response(JSON.stringify(valid), { status: 200 });
    assert.equal((await calculateDailyTiming(request)).status, 'PROVISIONAL');
    for (const mutate of [
      (b: any) => (b.status = 'VERIFIED'),
      (b: any) => (b.provenance.release_authorized = true),
      (b: any) => (b.windows[0].end = 'not-an-instant'),
      (b: any) => (b.windows[0].duration_seconds = 1),
      (b: any) => (b.day.timezone = 'UTC'),
      (b: any) => (b.provenance.requested_ephemeris_mode = 'JPL'),
      (b: any) => (b.windows[0].explanations = null),
    ]) {
      const b = structuredClone(valid);
      mutate(b);
      globalThis.fetch = async () => new Response(JSON.stringify(b), { status: 200 });
      await assert.rejects(calculateDailyTiming(request));
    }
  } finally {
    globalThis.fetch = original;
  }
});

// =============================================================================
// PART 2: TWO-STAGE GATE, QA SERVER UNLOCK & REAL TIMING WINDOWS CONTRACT SPECS
// =============================================================================

test('partial gate (releaseAuthorized: true, taraBalaAuthorized: false) still blocks personalized Tara Bala with 503', () =>
  serve(
    async (base) => {
      const cap = await (await fetch(base + '/api/v1/timing/capability')).json();
      assert.equal(cap.release_authorized, false);
      assert.deepEqual(cap.missing_dependencies, ['TARA_BALA_MOON_EXIT_TEST_ACCEPTANCE']);

      const r = await post(base, request);
      assert.equal(r.status, 503);
      const b = await r.json();
      assert.equal(b.code, 'TARA_BALA_MOON_EXIT_TEST_REQUIRED');
      assert.deepEqual(b.windows, []);
      assert.equal(b.provenance.release_authorized, false);
    },
    { releaseAuthorized: true, taraBalaAuthorized: false }
  ));

test('QA / staging server unlock issues HttpOnly HMAC cookie and unlocks PROVISIONAL windows without setting release_authorized', () =>
  serve(
    async (base) => {
      const capLocked = await (await fetch(base + '/api/v1/timing/capability')).json();
      assert.equal(capLocked.qa_preview_available, true);
      assert.equal(capLocked.qa_preview_unlocked, false);
      assert.equal(capLocked.release_authorized, false);

      const badUnlock = await fetch(base + '/api/v1/timing/qa-unlock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: 'wrong-secret-token' }),
      });
      assert.equal(badUnlock.status, 401);

      const goodUnlock = await fetch(base + '/api/v1/timing/qa-unlock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: 'staging-qa-secret-2026' }),
      });
      assert.equal(goodUnlock.status, 200);
      const setCookie = goodUnlock.headers.get('set-cookie') || '';
      assert.match(setCookie, /__mmo_qa_preview=.*HttpOnly.*SameSite=Strict/);
      const cookiePair = setCookie.split(';')[0];

      const capUnlocked = await (await fetch(base + '/api/v1/timing/capability', { headers: { cookie: cookiePair } })).json();
      assert.equal(capUnlocked.qa_preview_unlocked, true);
      assert.equal(capUnlocked.preview_mode, 'UNVALIDATED_PREVIEW');
      assert.equal(capUnlocked.release_authorized, false);

      const dailyPreview = await post(base, request, { cookie: cookiePair });
      assert.equal(dailyPreview.status, 200);
      const body = await dailyPreview.json();
      assert.equal(body.status, 'PROVISIONAL');
      assert.equal(body.provenance.release_authorized, false);
      assert.equal(body.provenance.accuracy_status, 'PROVISIONAL_PRE_AUTHORIZATION');
      assert.ok(body.windows.length >= 1);
    },
    { releaseAuthorized: false, taraBalaAuthorized: false, qaPreview: { enabled: true, token: 'staging-qa-secret-2026' } }
  ));

test('gate open computes real Panchang, Hora, Choghadiya and Tara Bala windows respecting DST day lengths and exclusions', () =>
  serve(
    async (base) => {
      const cap = await (await fetch(base + '/api/v1/timing/capability')).json();
      assert.equal(cap.release_authorized, true);
      assert.equal(cap.status, 'AUTHORIZED');

      // Verify DST local-day bounds: 23h (82800s), 24h (86400s), and 25h (90000s) in America/New_York
      for (const [targetDate, expectedSeconds] of [
        ['2026-03-08', 82800],
        ['2026-11-26', 86400],
        ['2026-11-01', 90000],
      ] as const) {
        const reqCase: TimingRequest = { ...request, target: { ...request.target, date: targetDate } };
        const resp = await post(base, reqCase);
        assert.equal(resp.status, 200);
        const body = (await resp.json()) as TimingResult;
        assert.equal(body.status, 'AUTHORIZED');
        assert.equal(body.provenance.release_authorized, true);
        assert.equal(body.day?.elapsed_seconds, expectedSeconds, `${targetDate} elapsed_seconds`);

        const direct = calculateRealDailyTimingWindows(reqCase, { releaseAuthorized: true, taraBalaAuthorized: true });
        assert.ok(direct.diagnostics, 'Expected solar & exclusion diagnostics');
        const exclusions = [direct.diagnostics.rahuKaal, direct.diagnostics.yamaganda, direct.diagnostics.gulikaKaal].map((iv) => ({
          startMs: Date.parse(iv.start),
          endMs: Date.parse(iv.end),
        }));

        const dayStartMs = Date.parse(body.day!.start);
        const dayEndMs = Date.parse(body.day!.end);

        body.windows.forEach((w, idx) => {
          const wStart = Date.parse(w.start);
          const wEnd = Date.parse(w.end);
          assert.equal(w.rank, idx + 1);
          assert.ok(wStart >= dayStartMs && wEnd <= dayEndMs, 'Window must lie inside target local day');
          assert.equal(w.duration_seconds, (wEnd - wStart) / 1000);
          assert.ok(w.duration_seconds >= 900, 'Window must be at least 15 minutes');
          assert.equal(w.classification, 'TRADITIONAL_FAVORABLE');
          assert.ok(w.rule_ids.some((id) => id.startsWith('panchang-')));
          assert.ok(w.rule_ids.some((id) => id.startsWith('choghadiya-')));
          assert.ok(w.rule_ids.some((id) => id.startsWith('hora-')));
          assert.ok(w.rule_ids.some((id) => id.startsWith('tara-bala-')));

          // Zero overlap with Rahu Kaal, Yamaganda, or Gulika Kaal
          for (const ex of exclusions) {
            const overlap = Math.min(wEnd, ex.endMs) - Math.max(wStart, ex.startMs);
            assert.ok(overlap <= 0, `Window [${w.start}, ${w.end}] overlaps inauspicious Kaala [${new Date(ex.startMs).toISOString()}, ${new Date(ex.endMs).toISOString()}]`);
          }
        });
      }

      // Non-EXACT birth certainty, DST birth gap/fold, and polar day still refuse safely when gate is open
      const unknownResp = await post(base, {
        ...request,
        birth: { date: '2000-01-01', certainty: 'UNKNOWN', timezone: 'Asia/Kolkata', latitude: 22.57, longitude: 88.36 },
      });
      assert.equal(unknownResp.status, 503);
      assert.equal((await unknownResp.json()).code, 'BIRTH_TIME_EVIDENCE_INSUFFICIENT');

      const gapResp = await post(base, {
        ...request,
        birth: { date: '2026-03-08', time: '02:30:00', certainty: 'EXACT', timezone: 'America/New_York', latitude: 40.71, longitude: -74 },
      });
      assert.equal(gapResp.status, 422);
      assert.equal((await gapResp.json()).code, 'NONEXISTENT_LOCAL_TIME');

      const foldAmbigResp = await post(base, {
        ...request,
        birth: { date: '2026-11-01', time: '01:30:00', certainty: 'EXACT', timezone: 'America/New_York', latitude: 40.71, longitude: -74 },
      });
      assert.equal(foldAmbigResp.status, 422);
      assert.equal((await foldAmbigResp.json()).code, 'AMBIGUOUS_LOCAL_TIME');

      const polarResp = await post(base, {
        ...request,
        target: { date: '2026-06-21', timezone: 'Europe/Oslo', latitude: 69.6492, longitude: 18.9553 },
      });
      assert.equal(polarResp.status, 503);
      assert.equal((await polarResp.json()).code, 'SOLAR_EVENTS_UNAVAILABLE');
    },
    { releaseAuthorized: true, taraBalaAuthorized: true }
  ));
