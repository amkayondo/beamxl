# BeamFlow

BeamFlow is a multi-tenant payment follow-up automation SaaS built on the T3 stack.

## Stack

- Next.js App Router
- TypeScript + tRPC
- Better Auth (Google + magic link)
- PostgreSQL + Drizzle ORM
- BullMQ + Redis for background jobs
- Stripe payment adapter (with dev mock fallback)
- Bird WhatsApp adapter

## Quick Start

1. Install dependencies:

```bash
bun install
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Generate and run migrations:

```bash
bun db:generate
bun db:migrate
```

4. Run web app:

```bash
bun run dev:web
```

5. Run worker (separate terminal):

```bash
bun run dev:worker
```

## Important Routes

- Auth: `/sign-in`, `/verify`
- Dashboard: `/{orgSlug}/overview`
- Public payment page: `/pay/i/{invoiceId}`
- Webhooks:
  - `/api/webhooks/payments`
  - `/api/webhooks/whatsapp`
  - `/api/webhooks/calls`
- Hourly scheduler endpoint: `/api/cron/hourly`

## Secrets Strategy

Integration secrets are `.env`-referenced in MVP (`INTEGRATION_SECRET_STRATEGY=env-ref`).
`integration_settings.secretKeyRef` stores environment variable names, not raw secrets.

## Current Scope

This implementation ships core MVP flows:

- Multi-org auth + org membership RBAC
- Contacts, plans, invoices, conversations, settings APIs
- Pay-link flow with Stripe adapter
- Payment + messaging webhook handlers with idempotency table
- Reminder/receipt queue scaffolding and worker runtime
