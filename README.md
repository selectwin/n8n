# n8n-nodes-selectwin

Official **Selectwin** community node for [n8n](https://n8n.io) — operate the Selectwin
payments API (PIX, card, boleto, customers, products, payment links, subscriptions) and
**react to webhooks**, without writing code.

> Status: **early / work in progress** (`0.1.0`). Two nodes: **Selectwin** (API operations)
> and **Selectwin Trigger** (signed webhook events).

## What it is

- **Selectwin** node — declarative API node covering the curated day-to-day surface of the
  API: create charges, manage customers/products/payment links, read balance, receivables
  and withdrawals.
- **Selectwin Trigger** node — registers a webhook on the API for the events you pick,
  verifies every delivery's signature (constant-time, replay-proof) and emits the full
  event envelope into your workflow.
- **Zero runtime dependencies.** Auth is your SelectKey; every POST carries an automatic
  `X-Idempotency-Key`.

## Install

### n8n GUI (community nodes)

1. In n8n go to **Settings → Community Nodes → Install**.
2. Enter `n8n-nodes-selectwin` and confirm.

### Manual (self-hosted)

```bash
cd ~/.n8n/nodes   # your n8n custom/community nodes folder
npm install n8n-nodes-selectwin
```

Restart n8n afterwards.

## Credentials

Create a **Selectwin API** credential:

| Field | Value |
|-------|-------|
| API Key | your SelectKey — `sk_test_…` (sandbox) or `sk_live_…` (production) |
| Base URL | `https://api.selectwin.io` (default; leave as is) |

The environment is decided by the key prefix, not the URL. The credential test calls
`GET /v1/balance`. Requests authenticate with the `selectkey` header.

## The Selectwin node

| Resource | Operations |
|----------|------------|
| Transaction | Create (PIX / boleto / saved card, customer by ID or inline), Get, Get Many (status/method/customer filters), Refund, Capture |
| Customer | Create, Get, Get Many, Update, Delete |
| Product | Create, Get, Get Many, Update, Delete |
| Variant | Get, Get Many, Get Many by Product |
| Payment Link | Create (the response's `accessFullUrl` is the shareable URL), Get, Get Many, Update, Delete |
| Checkout Session | Create (JSON body pass-through), Get, Get Many |
| Subscription | Get, Get Many, Cancel, Pause, Resume |
| Coupon | Validate, Get, Get Many |
| Balance | Get, Get History |
| Receivable | Get, Get Many |
| Withdrawal | Get, Get Many |

List operations page with `Limit`/`Offset`; the API answers with a
`{ data[], hasMore, total, page }` envelope.

## The Selectwin Trigger

Pick one or more events from the full API catalog (`transaction.approved`,
`transaction.refunded`, `subscription.canceled`, `checkout.session.completed`, …). On
activation the node registers the webhook via `POST /v1/webhooks` and stores the returned
secret; on deactivation it deletes it.

Every delivery is verified before your workflow runs:

- `x-selectwin-signature-v1: t=<unix>,v1=<hmac-sha256-hex("<t>.<body>", secret)>` —
  preferred, replay-proof (default tolerance 300 s, configurable under **Options**);
- `x-selectwin-signature: sha256=<hmac-sha256-hex(body, secret)>` — legacy fallback.

Verification runs over the raw received bytes with constant-time comparison. Invalid or
unsigned deliveries are rejected with `401` and never reach your workflow.

## Custom API Call

The **Selectwin API** credential is also usable as a *predefined credential type* in n8n's
built-in **HTTP Request** node — an escape hatch to reach any endpoint of the API that the
curated node does not cover yet.

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest (webhook signature verification)
npm run build       # tsc + copy node icons into dist/
```

## Roadmap

- Auto-pagination (Return All) for list operations.
- Subscription create (catalog-strict model needs recurring variants).
- Withdrawal create (financial write — gated for a later phase).
- Submission as an n8n verified community node.
