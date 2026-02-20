# DueFlow

DueFlow is a multi-tenant payment follow-up automation SaaS built on the T3 stack.

## Monorepo Migration Status

This repository now includes Turborepo workspace scaffolding:

- `apps/web` (migration stub)
- `apps/worker` (migration stub)
- `apps/mobile` (React Native scaffold)
- `apps/extension` (Chrome extension scaffold)
- `packages/*` shared package placeholders

Current production web and worker runtimes still execute from the root app during migration.

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
- Billing settings: `/{orgSlug}/settings/billing`
- Stripe Connect OAuth:
  - `/api/stripe/connect`
  - `/api/stripe/callback`
- Webhooks:
  - `/api/webhooks/stripe/platform`
  - `/api/webhooks/stripe/connect`
  - `/api/webhooks/payments`
  - `/api/webhooks/whatsapp`
  - `/api/webhooks/calls`
- New API domains:
  - `agent`
  - `analytics`
  - `portal`
- Hourly scheduler endpoint: `/api/cron/hourly`

## Secrets Strategy

Integration secrets are `.env`-referenced in MVP (`INTEGRATION_SECRET_STRATEGY=env-ref`).
`integration_settings.secretKeyRef` stores environment variable names, not raw secrets.

## Current Scope

This implementation ships core MVP flows:

- Multi-org auth + org membership RBAC
- Contacts, plans, invoices, conversations, settings APIs
- Dual-context Stripe flow (platform billing + connected-account invoice checkout)
- Split platform/connect Stripe webhooks with idempotency table
- Reminder/receipt queue scaffolding and worker runtime
