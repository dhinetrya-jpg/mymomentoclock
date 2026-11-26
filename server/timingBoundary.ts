import type { RequestHandler } from 'express';
import crypto from 'node:crypto';
import https from 'node:https';
import { readFileSync } from 'node:fs';
import { CalculationInputError } from '../src/engine/calculationValidation';
import { TIMING_ACTIVITIES, TIMING_RULE_VERSION, TIMING_VERSION, type TimingRequest } from '../src/engine/timingClient';
import { calculateRealDailyTimingWindows, type DailyTimingGatePolicy } from './dailyTimingEngine';

export type TimingTransport = (method: string, path: string, body?: TimingRequest) => Promise<{ status: number; body: any }>;

export interface TimingGatewayOptions {
  transport?: TimingTransport;
  /** Default false in production. Flip to true ONLY after ~100-city exit tests, CI tolerance check, and Jyotishi sign-off. */
  releaseAuthorized?: boolean;
  /** Default false in production. Separate Moon/Nakshatra exit-test authorization gate for personalized Tara Bala. */
  taraBalaAuthorized?: boolean;
  /** Pre-authorization QA / CI tolerance evaluation mode: computes real windows labeled PROVISIONAL with release_authorized: false. */
  provisionalEvaluationMode?: boolean;
  /** Server-checked QA / staging unlock configuration (never enabled in public production builds). */
  qaPreview?: {
    enabled: boolean;
    token: string;
  };
}

const paths = [
  '/api/v1/timing/activities',
  '/api/v1/timing/capability',
  '/api/v1/timing/daily',
  '/api/v1/timing/qa-unlock',
  '/api/v1/timing/qa-lock',
];

const QA_COOKIE_NAME = '__mmo_qa_preview';

const unavailable = {
  schema_version: 1,
  status: 'UNAVAILABLE',
  code: 'CORE_P0_01_NOT_VERIFIED',
  windows: [],
  limitations: [
    'Personalized guidance requires independently verified native/Panchang inputs and owner-approved timing rules and release.',
    'Traditional timing is not a scientific prediction or a guarantee of success or investment returns.',
  ],
};

function keys(value: any, required: string[], optional: string[] = []) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    required.every((k) => Object.hasOwn(value, k)) &&
    Object.keys(value).every((k) => required.includes(k) || optional.includes(k))
  );
}

function date(value: unknown, min: number, max: number) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value && d.getUTCFullYear() >= min && d.getUTCFullYear() <= max;
}

function place(p: any) {
  if (
    typeof p.timezone !== 'string' ||
    p.timezone === 'Local' ||
    p.timezone.length > 100 ||
    !Number.isFinite(p.latitude) ||
    Math.abs(p.latitude) > 90 ||
    !Number.isFinite(p.longitude) ||
    Math.abs(p.longitude) > 180
  )
    return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: p.timezone });
    return true;
  } catch {
    return false;
  }
}

export function validTimingRequest(b: any): b is TimingRequest {
  if (
    !keys(b, ['schema_version', 'birth', 'target', 'activity', 'rule_version', 'ephemeris_mode']) ||
    b.schema_version !== 1 ||
    b.rule_version !== TIMING_RULE_VERSION ||
    !TIMING_ACTIVITIES.some((a) => a.id === b.activity) ||
    !['MOSHIER', 'SWISS_FILE', 'JPL'].includes(b.ephemeris_mode)
  )
    return false;
  if (
    !keys(b.birth, ['date', 'certainty', 'timezone', 'latitude', 'longitude'], ['time', 'utc_offset', 'uncertainty_minutes']) ||
    !keys(b.target, ['date', 'timezone', 'latitude', 'longitude']) ||
    !place(b.birth) ||
    !place(b.target) ||
    !date(b.birth.date, 1900, 2100) ||
    !date(b.target.date, 2000, 2100)
  )
    return false;
  const birth = b.birth;
  if (birth.certainty === 'UNKNOWN')
    return birth.time === undefined && birth.utc_offset === undefined && (birth.uncertainty_minutes === undefined || birth.uncertainty_minutes === 0);
  if (!['EXACT', 'APPROXIMATE'].includes(birth.certainty) || typeof birth.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(birth.time))
    return false;
  if (birth.utc_offset !== undefined && (!Number.isFinite(birth.utc_offset) || birth.utc_offset < -12 || birth.utc_offset > 14)) return false;
  return birth.certainty === 'EXACT'
    ? birth.uncertainty_minutes === undefined || birth.uncertainty_minutes === 0
    : Number.isInteger(birth.uncertainty_minutes) && birth.uncertainty_minutes >= 1 && birth.uncertainty_minutes <= 1440;
}

function parseCookieHeader(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) {
      return trimmed.slice(name.length + 1);
    }
  }
  return null;
}

function safeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function createTimingGateway(transportOrOptions?: TimingTransport | TimingGatewayOptions): RequestHandler {
  const opts: TimingGatewayOptions =
    typeof transportOrOptions === 'function' ? { transport: transportOrOptions } : transportOrOptions || {};

  const transport = opts.transport;
  const gatePolicy: DailyTimingGatePolicy = {
    releaseAuthorized: Boolean(opts.releaseAuthorized),
    taraBalaAuthorized: Boolean(opts.taraBalaAuthorized),
    provisionalEvaluationMode: Boolean(opts.provisionalEvaluationMode),
  };
  const isFullyAuthorized = gatePolicy.releaseAuthorized && gatePolicy.taraBalaAuthorized;
  const qaEnabled = Boolean(opts.qaPreview?.enabled && opts.qaPreview.token && opts.qaPreview.token.length >= 8);
  const qaSessionSecret = crypto.randomBytes(32);

  const signQaSession = (): string =>
    crypto.createHmac('sha256', qaSessionSecret).update('UNVALIDATED_PREVIEW_QA_SESSION').digest('hex');

  const isQaSessionUnlocked = (cookieHeader: string | undefined): boolean => {
    if (!qaEnabled) return false;
    const val = parseCookieHeader(cookieHeader, QA_COOKIE_NAME);
    if (!val) return false;
    return safeEqualStrings(val, signQaSession());
  };

  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const fail = (status: number, code: string) => res.status(status).json({ ...unavailable, code });
    const path = req.originalUrl.split('?')[0];
    if (Object.keys(req.query).length) return void fail(422, 'URL_PARAMETERS_NOT_ALLOWED');
    if (!paths.includes(path)) return void fail(404, 'NOT_FOUND');

    // Server-checked QA / Staging Unlock & Lock endpoints (strictly disabled in public production)
    if (path.endsWith('/qa-unlock')) {
      if (req.method !== 'POST') return void fail(405, 'METHOD_NOT_ALLOWED');
      if (!qaEnabled || !opts.qaPreview) {
        return void res.status(403).json({
          error: 'QA_PREVIEW_DISABLED_IN_PRODUCTION',
          message: 'QA preview unlock is disabled in public production.',
          release_authorized: false,
        });
      }
      const supplied = typeof req.body?.token === 'string' ? req.body.token : '';
      if (!supplied || !safeEqualStrings(supplied, opts.qaPreview.token)) {
        return void res.status(401).json({
          error: 'QA_TOKEN_INVALID',
          message: 'Invalid QA preview token.',
          release_authorized: false,
        });
      }
      res.setHeader(
        'Set-Cookie',
        `${QA_COOKIE_NAME}=${signQaSession()}; HttpOnly; SameSite=Strict; Path=/api/v1/timing; Max-Age=28800`
      );
      return void res.json({
        ok: true,
        qa_preview_available: true,
        qa_preview_unlocked: true,
        preview_mode: 'UNVALIDATED_PREVIEW',
        release_authorized: false,
      });
    }

    if (path.endsWith('/qa-lock')) {
      if (req.method !== 'POST') return void fail(405, 'METHOD_NOT_ALLOWED');
      if (!qaEnabled) {
        return void res.status(403).json({ error: 'QA_PREVIEW_DISABLED_IN_PRODUCTION', release_authorized: false });
      }
      res.setHeader(
        'Set-Cookie',
        `${QA_COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/api/v1/timing; Max-Age=0`
      );
      return void res.json({ ok: true, qa_preview_unlocked: false, release_authorized: false });
    }

    if (path.endsWith('/activities')) {
      if (req.method !== 'GET') return void fail(405, 'METHOD_NOT_ALLOWED');
      const activityStatus = isFullyAuthorized ? 'AVAILABLE' : gatePolicy.provisionalEvaluationMode ? 'PROVISIONAL' : 'UNAVAILABLE';
      return void res.json({
        schema_version: 1,
        rule_version: TIMING_RULE_VERSION,
        activities: TIMING_ACTIVITIES.map((a) => ({
          ...a,
          rule_version: TIMING_RULE_VERSION,
          status: activityStatus,
          sources: [
            {
              reference: isFullyAuthorized ? 'MUHURTA_CHINTAMANI_BPHS_V1' : 'OWNER_RULE_SOURCE_REQUIRED',
              locator: isFullyAuthorized
                ? 'Panchang Shuddhi + Chaldean Hora + Day/Night Choghadiya + Janma Tara Bala'
                : 'Exact edition/passage and applicability not supplied',
              review_status: isFullyAuthorized ? 'APPROVED' : 'UNAPPROVED',
            },
          ],
          limitation:
            a.id === 'finance'
              ? 'Traditional timing context only; no guaranteed profit, investment advantage or scientifically established predictive accuracy.'
              : 'Activity rules require source and owner review.',
        })),
      });
    }

    if (path.endsWith('/capability')) {
      if (req.method !== 'GET') return void fail(405, 'METHOD_NOT_ALLOWED');
      const missing: string[] = [];
      if (!gatePolicy.releaseAuthorized) {
        missing.push(
          'CORE_P0_01_NATIVE_REFERENCE_ACCEPTANCE',
          'VERIFIED_PANCHANG_AND_SOLAR_EVENTS',
          'OWNER_APPROVED_ACTIVITY_RULES',
          'PERSONAL_TIMING_RELEASE_AUTHORIZATION'
        );
      } else if (!gatePolicy.taraBalaAuthorized) {
        missing.push('TARA_BALA_MOON_EXIT_TEST_ACCEPTANCE');
      }
      const qaUnlocked = isQaSessionUnlocked(req.headers.cookie);
      return void res.json({
        schema_version: 1,
        status: isFullyAuthorized ? 'AUTHORIZED' : gatePolicy.provisionalEvaluationMode ? 'PROVISIONAL' : 'UNAVAILABLE',
        calculation_version: TIMING_VERSION,
        rule_version: TIMING_RULE_VERSION,
        accuracy_status: isFullyAuthorized ? 'VERIFIED_RELEASE_AUTHORIZED' : 'NOT_VERIFIED',
        release_authorized: isFullyAuthorized,
        missing_dependencies: missing,
        ...(qaEnabled
          ? {
              qa_preview_available: true,
              qa_preview_unlocked: qaUnlocked,
              preview_mode: qaUnlocked ? 'UNVALIDATED_PREVIEW' : undefined,
            }
          : {}),
      });
    }

    if (req.method !== 'POST') return void fail(405, 'METHOD_NOT_ALLOWED');
    if (Buffer.byteLength(JSON.stringify(req.body ?? null)) > 16384) return void fail(413, 'REQUEST_TOO_LARGE');
    if (!validTimingRequest(req.body)) return void fail(422, 'INVALID_TIMING_REQUEST');

    // Upstream mTLS transport path (when configured): preserves strict fail-closed projection without birth-data leaks
    if (transport) {
      const provenance = {
        calculation_version: TIMING_VERSION,
        rule_version: TIMING_RULE_VERSION,
        ephemeris_mode: 'UNAVAILABLE',
        requested_ephemeris_mode: req.body.ephemeris_mode,
        source: 'NATIVE_SWISS_CONTRACT_UNAVAILABLE',
        calculated_at: new Date().toISOString(),
        accuracy_status: 'NOT_VERIFIED',
        release_authorized: false,
      };
      try {
        const r = await transport('POST', path, req.body);
        const b = r.body;
        if (r.status === 422 && /^([A-Z][A-Z0-9_]{0,79})$/.test(b?.code)) return void fail(422, b.code);
        if (
          r.status !== 503 ||
          !['UNAVAILABLE', 'INSUFFICIENT_EVIDENCE'].includes(b?.status) ||
          b.schema_version !== 1 ||
          !Array.isArray(b.windows) ||
          b.windows.length ||
          b.provenance?.release_authorized !== false ||
          !/^([A-Z][A-Z0-9_]{0,79})$/.test(b.code)
        )
          throw Error();
        let day: undefined | object;
        if (b.day) {
          const d = b.day;
          const start = Date.parse(d.start);
          const end = Date.parse(d.end);
          if (
            d.date !== req.body.target.date ||
            d.timezone !== req.body.target.timezone ||
            !Number.isFinite(start) ||
            !Number.isFinite(end) ||
            end - start < 72000000 ||
            end - start > 100800000 ||
            d.elapsed_seconds !== (end - start) / 1000
          )
            throw Error();
          day = {
            date: d.date,
            timezone: d.timezone,
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            elapsed_seconds: d.elapsed_seconds,
          };
        }
        return void res.status(503).json({
          ...unavailable,
          status: b.status,
          code: b.code,
          activity: req.body.activity,
          provenance,
          ...(day ? { day } : {}),
        });
      } catch {
        return void fail(503, 'TIMING_SERVICE_UNAVAILABLE');
      }
    }

    // Default Closed Gate in Production: preserve exact fail-closed 503 response without personal birth echoes
    const qaCookieUnlocked = isQaSessionUnlocked(req.headers.cookie);
    const effectivePolicy: DailyTimingGatePolicy = {
      releaseAuthorized: gatePolicy.releaseAuthorized,
      taraBalaAuthorized: gatePolicy.taraBalaAuthorized || qaCookieUnlocked,
      provisionalEvaluationMode: gatePolicy.provisionalEvaluationMode || qaCookieUnlocked,
    };

    if (!effectivePolicy.releaseAuthorized && !effectivePolicy.provisionalEvaluationMode) {
      const provenance = {
        calculation_version: TIMING_VERSION,
        rule_version: TIMING_RULE_VERSION,
        ephemeris_mode: 'UNAVAILABLE',
        requested_ephemeris_mode: req.body.ephemeris_mode,
        source: 'NATIVE_SWISS_CONTRACT_UNAVAILABLE',
        calculated_at: new Date().toISOString(),
        accuracy_status: 'NOT_VERIFIED',
        release_authorized: false,
      };
      return void res.status(503).json({
        ...unavailable,
        ...(req.body.birth.certainty !== 'EXACT' ? { status: 'INSUFFICIENT_EVIDENCE', code: 'BIRTH_TIME_EVIDENCE_INSUFFICIENT' } : {}),
        activity: req.body.activity,
        provenance,
      });
    }

    // Gate Open (post-exit-test authorization) OR QA/Staging Pre-Authorization Evaluation Mode:
    // Executes real Panchang + Hora + Choghadiya + Tara Bala windows engine
    try {
      const computed = calculateRealDailyTimingWindows(req.body, effectivePolicy);
      return void res.status(computed.httpStatus).json(computed.body);
    } catch (err) {
      if (err instanceof CalculationInputError) {
        return void fail(422, err.code);
      }
      return void fail(503, 'TIMING_SERVICE_UNAVAILABLE');
    }
  };
}

export function timingGatewayFromEnvironment(): RequestHandler {
  const isProd = process.env.NODE_ENV === 'production';
  const allowStagingQa = !isProd || process.env.APP_STAGE === 'staging' || process.env.APP_STAGE === 'qa';
  const qaToken = (process.env.TIMING_QA_PREVIEW_TOKEN || '').trim();
  const qaPreview =
    allowStagingQa && process.env.TIMING_QA_PREVIEW_ENABLED === '1' && qaToken.length >= 16
      ? { enabled: true, token: qaToken }
      : undefined;

  // Production stays strictly locked (releaseAuthorized: false, taraBalaAuthorized: false) until exit tests & Jyotishi sign-off.
  const raw = process.env.TIMING_INTERNAL_URL;
  if (!raw) {
    return createTimingGateway({
      releaseAuthorized: false,
      taraBalaAuthorized: false,
      provisionalEvaluationMode: false,
      qaPreview,
    });
  }
  const base = new URL(raw);
  if (
    base.protocol !== 'https:' ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== '/' ||
    !(base.hostname === 'localhost' || base.hostname.endsWith('.internal') || base.hostname.endsWith('.svc.cluster.local'))
  )
    throw Error('TIMING_TRANSPORT_CONFIGURATION_INVALID');
  const agent = new https.Agent({
    ca: readFileSync(process.env.TIMING_INTERNAL_CA_FILE || ''),
    cert: readFileSync(process.env.TIMING_INTERNAL_CERT_FILE || ''),
    key: readFileSync(process.env.TIMING_INTERNAL_KEY_FILE || ''),
    rejectUnauthorized: true,
    maxSockets: 4,
    keepAlive: true,
  });
  const transport: TimingTransport = (method, path, body) =>
    new Promise((resolve, reject) => {
      if (method !== 'POST' || path !== '/api/v1/timing/daily') return reject(Error());
      const bytes = Buffer.from(JSON.stringify(body));
      const request = https.request(
        new URL(path, base),
        { method, agent, timeout: 3500, headers: { 'content-type': 'application/json', 'content-length': bytes.length } },
        (r) => {
          let size = 0;
          const chunks: Buffer[] = [];
          r.on('data', (chunk) => {
            size += chunk.length;
            if (size > 65536) {
              r.destroy();
              reject(Error());
            } else chunks.push(chunk);
          });
          r.on('error', reject);
          r.on('end', () => {
            try {
              resolve({ status: r.statusCode || 503, body: JSON.parse(Buffer.concat(chunks).toString()) });
            } catch {
              reject(Error());
            }
          });
        }
      );
      const deadline = setTimeout(() => request.destroy(Error()), 4000);
      request.once('close', () => clearTimeout(deadline));
      request.on('timeout', () => request.destroy(Error()));
      request.on('error', reject);
      request.end(bytes);
    });
  return createTimingGateway({ transport, releaseAuthorized: false, taraBalaAuthorized: false, qaPreview });
}
