/**
 * Mock of the Selectwin public API for n8n plugin E2E tests.
 *
 * Faithful to the real contract where the plugin touches it:
 *   - `selectkey` header auth (sk_test_* / sk_live_*).
 *   - POST /v1/webhooks — name 1..100 required; endpoint MUST be https:// (the
 *     real API enforces this with a Zod refine that the public spec loses);
 *     events must belong to the catalog enum, and events[] or forceActive is
 *     required. 201 carries the `secret` exactly once.
 *   - GET/DELETE /v1/webhooks/:id, GET /v1/balance (credential test).
 *   - Deliveries reproduce the real dispatcher byte-for-byte: canonical JSON
 *     (recursively sorted keys) + `x-selectwin-signature: sha256=<hex>` (legacy,
 *     primary) + `x-selectwin-signature-v1: t=<unix>,v1=<hex>` + timestamp.
 *
 * Control endpoints (no auth, never part of the public API):
 *   POST /_mock/fire   {type?, object?, mode?: both|v1|legacy|bad, endpointId?}
 *   POST /_mock/echo   sink the workflow POSTs to — proves an execution ran
 *   GET  /_mock/state  endpoints + received echoes + request log
 *   POST /_mock/reset
 */
import { createServer } from 'node:http';
import { createHmac, randomBytes } from 'node:crypto';

const PORT = Number(process.env.PORT ?? 3999);
// Deliveries registered against the public-looking https host are rewritten to
// the n8n container address (the https-only API rule vs docker-network reality).
const REWRITE_FROM = process.env.DELIVERY_REWRITE_FROM ?? '';
const REWRITE_TO = process.env.DELIVERY_REWRITE_TO ?? '';

const EVENT_CATALOG = new Set([
  ...['created', 'pending', 'failed', 'approved', 'canceled', 'chargeback', 'refunded', 'fraud-review', 'pre-authorized', 'unauthorized', 'awaiting', 'dispute'].map((s) => `transaction.${s}`),
  'customer.created', 'customer.updated', 'customer.deleted',
  'customer.address.created', 'customer.address.updated', 'customer.address.deleted',
  ...['created', 'updated', 'deleted', 'expired'].map((s) => `card.${s}`),
  ...['created', 'pending', 'active', 'canceled', 'pastdue', 'unpaid', 'trialing', 'paused', 'updated'].map((s) => `subscription.${s}`),
  ...['created', 'pending', 'paid', 'canceled', 'chargeback', 'refunded', 'dispute', 'scheduled', 'fraud-hold'].map((s) => `receivable.${s}`),
  ...['created', 'deleted', 'pending', 'disabled', 'enabled'].map((s) => `wallet.${s}`),
  ...['created', 'updated', 'analyzing', 'approved', 'refused', 'blocked', 'disabled', 'reinstated'].map((s) => `seller.${s}`),
  ...['created', 'pending', 'confirmed', 'canceled', 'refused', 'processing', 'analysis'].map((s) => `withdrawal.${s}`),
  ...['created', 'updated', 'deleted', 'disabled'].map((s) => `webhook.${s}`),
  ...['created', 'updated', 'abandoned', 'recovered', 'reactivated', 'expired', 'completed'].map((s) => `checkout.session.${s}`),
  'webhook.ping',
]);

/** Stable JSON for signing — keys sorted recursively (mirror of the API). */
function canonicalJson(value) {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}
const hmacHex = (payload, secret) => createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
const publicId = (prefix) => `${prefix}_${randomBytes(8).toString('hex')}`;

const state = { endpoints: new Map(), echoes: [], log: [] };

function errorEnvelope(statusCode, code, message) {
  return { error: { statusCode, code, message, resource: 'webhook' } };
}

function json(res, statusCode, body) {
  const raw = JSON.stringify(body, null, 2);
  res.writeHead(statusCode, { 'content-type': 'application/json' });
  res.end(raw);
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

function validateCreate(body) {
  if (typeof body.name !== 'string' || body.name.length < 1 || body.name.length > 100) {
    return 'name must be a string of 1..100 characters';
  }
  if (typeof body.endpoint !== 'string') return 'endpoint is required';
  try {
    new URL(body.endpoint);
  } catch {
    return 'endpoint must be a valid URL';
  }
  if (!body.endpoint.startsWith('https://')) return 'endpoint must be an https URL';
  if (body.events !== undefined) {
    if (!Array.isArray(body.events)) return 'events must be an array';
    const unknown = body.events.filter((e) => !EVENT_CATALOG.has(e));
    if (unknown.length > 0) return `unknown event types: ${unknown.join(', ')}`;
  }
  if (!body.forceActive && (!body.events || body.events.length === 0)) {
    return 'provide events[] or set forceActive';
  }
  return null;
}

async function deliver(endpoint, { type, object, mode }) {
  const now = new Date().toISOString();
  const envelope = {
    id: publicId('wbh'),
    type,
    source: 'api',
    payload: { object },
    correlationId: publicId('cor'),
    updatedAt: now,
    createdAt: now,
  };
  const rawBody = canonicalJson(envelope);
  const secret = mode === 'bad' ? 'whsec_wrong_secret_on_purpose' : endpoint.secret;
  const t = Math.floor(Date.now() / 1000);
  const headers = {
    'content-type': 'application/json',
    'user-agent': 'Selectwin-Webhook/1.0',
    'x-selectwin-event': type,
    'x-selectwin-event-id': envelope.id,
    'x-selectwin-delivery': publicId('wdi'),
  };
  if (mode !== 'v1') headers['x-selectwin-signature'] = `sha256=${hmacHex(rawBody, secret)}`;
  if (mode !== 'legacy') {
    headers['x-selectwin-timestamp'] = String(t);
    headers['x-selectwin-signature-v1'] = `t=${t},v1=${hmacHex(`${t}.${rawBody}`, secret)}`;
  }

  let url = endpoint.endpoint;
  if (REWRITE_FROM && url.startsWith(REWRITE_FROM)) url = REWRITE_TO + url.slice(REWRITE_FROM.length);

  try {
    const res = await fetch(url, { method: 'POST', headers, body: rawBody });
    const text = await res.text();
    return { endpointId: endpoint.id, url, eventId: envelope.id, statusCode: res.status, response: text.slice(0, 2000) };
  } catch (err) {
    return { endpointId: endpoint.id, url, eventId: envelope.id, statusCode: null, response: String(err) };
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const raw = await readBody(req);
  let body = {};
  if (raw) {
    try { body = JSON.parse(raw); } catch { body = { __unparsed: raw }; }
  }
  state.log.push({ at: new Date().toISOString(), method: req.method, path, body: raw ? body : undefined });
  console.log(`[mock] ${req.method} ${path}${raw ? ` ${raw.slice(0, 400)}` : ''}`);

  // ── control (no auth) ──
  if (path === '/_mock/echo' && req.method === 'POST') {
    state.echoes.push({ at: new Date().toISOString(), headers: req.headers, body });
    return json(res, 200, { received: true });
  }
  if (path === '/_mock/state') {
    return json(res, 200, {
      endpoints: [...state.endpoints.values()],
      echoes: state.echoes,
      log: state.log.slice(-50),
    });
  }
  if (path === '/_mock/reset' && req.method === 'POST') {
    state.endpoints.clear();
    state.echoes.length = 0;
    state.log.length = 0;
    return json(res, 200, { reset: true });
  }
  if (path === '/_mock/fire' && req.method === 'POST') {
    const targets = body.endpointId
      ? [state.endpoints.get(body.endpointId)].filter(Boolean)
      : [...state.endpoints.values()];
    if (targets.length === 0) return json(res, 400, { error: 'no registered endpoints to fire at' });
    const type = body.type ?? 'transaction.approved';
    const object = body.object ?? { id: publicId('trx'), amount: 1290, status: 'approved', payment: { method: 'pix' } };
    const results = [];
    for (const endpoint of targets) {
      results.push(await deliver(endpoint, { type, object, mode: body.mode ?? 'both' }));
    }
    return json(res, 200, { fired: results });
  }

  // ── public API surface (selectkey auth) ──
  const key = req.headers.selectkey;
  if (typeof key !== 'string' || !/^sk_(test|live)_/.test(key)) {
    return json(res, 401, errorEnvelope(401, 'unauthorized', 'missing or invalid selectkey header'));
  }

  if (path === '/v1/balance' && req.method === 'GET') {
    return json(res, 200, { available: 0, pending: 0, currency: 'BRL' });
  }

  if (path === '/v1/webhooks' && req.method === 'POST') {
    const problem = validateCreate(body);
    if (problem) return json(res, 400, errorEnvelope(400, 'validation_failed', problem));
    const now = new Date().toISOString();
    const resource = {
      id: publicId('wbe'),
      name: body.name,
      endpoint: body.endpoint,
      enabled: body.enabled ?? true,
      events: body.events ?? null,
      forceActive: body.forceActive ?? false,
      shotsQty: 0,
      failedShotsQty: 0,
      lastDeliveryAt: null,
      metadata: body.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    };
    const secret = `whsec_${randomBytes(32).toString('hex')}`;
    state.endpoints.set(resource.id, { ...resource, secret });
    return json(res, 201, { ...resource, secret }); // secret carried exactly once
  }

  const endpointMatch = path.match(/^\/v1\/webhooks\/(wb[eh]_[a-z0-9]+)$/);
  if (endpointMatch) {
    const found = state.endpoints.get(endpointMatch[1]);
    if (req.method === 'GET') {
      if (!found) return json(res, 404, errorEnvelope(404, 'not_found', 'webhook endpoint not found'));
      const { secret, ...resource } = found;
      return json(res, 200, resource);
    }
    if (req.method === 'DELETE') {
      if (!found) return json(res, 404, errorEnvelope(404, 'not_found', 'webhook endpoint not found'));
      state.endpoints.delete(found.id);
      return json(res, 200, { deleted: true, id: found.id });
    }
  }

  return json(res, 404, errorEnvelope(404, 'not_found', `no mock route for ${req.method} ${path}`));
});

server.listen(PORT, () => console.log(`[mock] Selectwin mock API listening on :${PORT}`));
