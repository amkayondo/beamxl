# DUEFLOW — Master AI Build Document
Version: 1.0 | February 2026
This is the single source of truth for building DueFlow.
Read this entire file before generating any code.

---

## WHAT IS DUEFLOW?

DueFlow is an AI-powered invoice follow-up and accounts receivable
automation platform for US SMBs, freelancers, agencies, and
accounting firms.

It is NOT an accounting tool.
It is a collections automation platform that gets businesses paid
faster — on autopilot, with full owner control.

Core tagline: "Agents do the chasing. You stay in control."

---

## WHO IS IT FOR?

Primary: US-based SMBs sending 50–10,000 invoices/month
Industries:
- Professional services (lawyers, consultants, accountants)
- Construction & contractors
- Agencies & creative services
- Healthcare & medical practices
- Logistics & transportation
- Real estate & property management
- IT & software services
- Education & tutoring
- Events & entertainment
- Staffing & recruitment
- Home services
- Wholesale & distribution

A business is a DueFlow customer if they answer YES to:
- Do you send more than 20 invoices/month?
- Do you have clients who pay late?
- Do you spend 2+ hours/week chasing payments?

---

## TECH STACK

Frontend:        Next.js 14+ (App Router), TypeScript, Tailwind CSS
Mobile:          React Native
Backend:         Next.js API routes + Node.js microservices
Database:        PostgreSQL (Neon/Supabase) + Drizzle ORM
Auth:            Clerk or Privy
Payments:        Stripe (subscriptions + metered billing + links)
SMS/WA/Voice:    Bird (MessageBird)
AI Voice:        ElevenLabs
Email:           AWS SES / SendGrid
Workflow UI:     React Flow (node canvas)
Hosting:         Vercel (frontend) + AWS (backend)
Monorepo:        Turborepo

---

## PRICING

### Plans
Starter    $49/mo   500 invoices   200 SMS   10k emails   15 voice min   1 user    3 workflows
Growth+    $79/mo   3,000          1,500      20k          90 min         3 users   15 workflows  ⭐ DEFAULT
Pro        $149/mo  Unlimited      5,000      50k          200 min        5 users   Unlimited
Enterprise Custom   Unlimited      Custom     Custom       Custom         Unlimited Unlimited

### Trial
- 14-day free trial, full Growth+ access
- No credit card at signup
- Card required at Day 14 or to activate SMS/voice

### Overages
SMS:   $0.012/msg
Voice: $0.030/min
Email: Included (no overage)

### Top-Up Packs
Mini     +200 SMS  —          +2,000 email   $7
Business +1,000    +60 min    +10,000        $29
Power    +5,000    +200 min   +50,000        $99

### Margin Targets
Starter:   ~76% gross margin
Growth+:   ~68% gross margin
Pro:       ~70% gross margin

---

## PRODUCT MODULES

### [MODULE 1] AUTH & ONBOARDING
- Email signup (no card required)
- Phone verification before SMS/voice unlocks
- Onboarding wizard (6 steps):
  1. Business name + type + timezone
  2. Connect Stripe
  3. Import or create first invoice
  4. Set up first workflow (from template)
  5. Send first reminder (aha moment)
  6. Mission briefing (goals, tone, alert preferences)
- Trial email sequence:
  Day 0:  Welcome + workflow setup
  Day 3:  "Have you run your first workflow?"
  Day 7:  "Halfway — here's what you've collected"
  Day 12: Upgrade prompt (pre-select Growth+ $79)
  Day 14: Hard gate — card required

---

### [MODULE 2] INVOICE MANAGEMENT
Fields: client name, email, phone, amount, due date,
        line items, notes, currency (USD), tags

Statuses:
  Draft | Sent | Viewed | Partial | Paid |
  Overdue | Cancelled | In Dispute | Written Off

Features:
- Create manually or import (CSV, QuickBooks, Xero)
- Bulk CSV upload
- Auto-generate Stripe payment link per invoice
- Conditional payment links:
    Expiry date
    Early payment discount (e.g. 2% off in 48hrs)
    Partial payment option
- Payment reconciliation via Stripe webhook
- Invoice bundles (merge multiple invoices → one payment)
- Recurring invoice automation (weekly/monthly auto-generate)
- Invoice health score: 🟢 Healthy / 🟡 At Risk / 🔴 Critical
- Predictive payment date (AI, based on client history)
- Anomaly detection (unusual payment behavior flagged)
- Write-off predictions (< 20% collection probability)
- Full audit log per invoice

---

### [MODULE 3] WORKFLOW ENGINE (CORE OF PLATFORM)
Visual node-based canvas. Built with React Flow.

#### Triggers
- Invoice created
- Invoice sent
- X days before due date
- Invoice overdue by X days
- Payment partially received
- Client reply received
- Manual trigger
- Webhook (external)
- Recurring schedule

#### Conditions
- Invoice amount > / < $X
- Client paid before (yes/no)
- Client risk score (low/medium/high/critical)
- Number of previous reminders
- Days since last contact
- Client opened email / replied / clicked link
- Survey/poll answer received
- Time of day / day of week
- Client tag
- Payment intent score

#### Actions
- Send email
- Send SMS
- Send WhatsApp
- Trigger AI voice call
- Send interactive message (yes/no, poll, survey, rating)
- Generate + send payment link
- Send early payment discount offer
- Notify owner (SMS/WhatsApp/email/voice)
- Update invoice status
- Add/remove client tag
- Pause workflow X days
- Snooze (client-requested)
- Escalate to human queue
- Stop workflow
- Trigger another workflow

#### Interactive Message Node
Types: Yes/No | Multiple choice (4 options) | Rating 1–5 or 1–10
       Open text | Schedule picker | Opt-in consent

Response handling:
  Expected reply     → route to branch
  Unexpected reply   → AI intent detection + re-prompt once
  No reply after Xh  → fallback branch
  STOP/opt-out       → immediate halt (TCPA)
  Negative sentiment → pause + escalate
  "Already paid"     → payment verification flow
  "Lawyer/dispute"   → halt + legal risk flag

#### Workflow States
Active | Paused | Completed | Errored | Awaiting Approval | Escalated

#### Pre-Built Templates (ship day 1)
1. Gentle Reminder         Email → Email → SMS
2. Standard Follow-up      Email → SMS → Voice
3. Aggressive Recovery     SMS → Voice → Voice → Escalate
4. Large Invoice VIP       Personal email → SMS → Scheduled call
5. Repeat Late Payer       Skip email, start SMS
6. Final Notice            Legal-tone email + SMS simultaneously
7. Payment Confirmation    Post-payment survey + NPS
8. Early Payment Incentive Discount offer before due date
9. Payment Plan            Interactive negotiation flow
10. Dispute Resolution     Structured capture + escalation

#### Builder UI
- Drag-and-drop canvas (React Flow)
- Left sidebar: triggers / conditions / actions palette
- Right panel: node config
- Top bar: name, save, activate, pause, test
- Preview/simulate mode
- A/B testing (Pro+): test 2 templates, auto-adopt winner
- Workflow cloning

---

### [MODULE 4] COMMUNICATION ENGINE

#### Email (AWS SES / SendGrid)
Merge tags: {{client_name}} {{invoice_number}} {{amount}}
            {{due_date}} {{payment_link}} {{business_name}}
            {{early_discount}} {{survey_link}}
- HTML + plain text
- Open tracking
- Click tracking
- Unsubscribe (CAN-SPAM)
- Custom sender domain

#### SMS (Bird)
- 160 chars/segment
- Merge tags
- Interactive replies
- STOP opt-out
- Delivery webhooks
- A2P 10DLC registered
- Rate limit: 50 SMS/hour/account

#### AI Voice (Bird + ElevenLabs)
- Script templates + merge tags
- Custom voice persona per business
- Voicemail detection + auto-leave voicemail
- Call transcription + sentiment analysis
- Call recording (optional, compliance-flagged)
- TCPA: DNC list, 8am–9pm local time only
- Post-call webhook: answered/voicemail/no answer/failed
- Rate limit: 10 calls/hour/account

#### WhatsApp (Bird — WhatsApp Business API)
- Meta pre-approved templates
- Interactive buttons (yes/no, multiple choice)
- Payment link in body
- Read receipts
- PDF invoice attachment
- WhatsApp Business verified

#### Two-Way Inbox
- Unified: all replies across SMS/WhatsApp/email
- Agent categorizes: paid/dispute/question/extension/opt-out
- Suggested responses
- Owner can reply directly
- AI intent on freeform replies
- Full conversation history per client/invoice

---

### [MODULE 5] AI AGENT LAYER

#### Philosophy
Agents are structured execution engines — not black box AI.
They execute within defined permission boundaries, follow hard
policy rails, and surface every decision to the owner.

Never say "AI agent" in marketing.
Always say: "Autopilot Collections"

#### Autopilot Modes

Mode 1: Manual
  Agent drafts only. Human clicks send.
  UI: Drafts queue.

Mode 2: Guarded Autopilot ⭐ (Default)
  Agent sends within approved templates.
  Human gets daily digest.
  Agent pauses + alerts on exceptions.
  Override button on every sent item.

Mode 3: Full Autopilot
  Agent sends + escalates automatically.
  Human notified on exceptions only.
  Requires: verified templates + policy set + card on file.

#### Human Handoff Triggers
"I already paid"        → Pause + "Verify payment"
"Wrong amount"          → Pause + "Invoice dispute"
"Stop contacting me"    → Halt immediately
Angry/aggressive tone   → Pause + flag human needed
"Lawyer/legal/sue"      → Halt + "Legal risk"
Chargeback (Stripe)     → Halt + notify owner all channels
3+ unanswered calls     → Pause + "Unreachable"
Payment plan request    → Pause + "Negotiation needed"

#### Owner Communication Layer
Owner preferred channel (configurable):
  SMS       → urgent alerts, approval requests
  WhatsApp  → rich updates, daily digest, approve/deny
  Email     → reports, non-urgent summaries
  Voice     → critical only (legal, chargeback)
  In-app    → always logged

Notification types:
  1. Real-time alerts
  2. Approval requests (reply YES/NO/SKIP/STOP/SNOOZE)
  3. Daily digest
  4. Weekly report
  5. Critical escalations (all channels simultaneously)

Approval commands (SMS/WhatsApp):
  YES    → execute next step
  NO     → skip step, continue
  STOP   → pause workflow for this client
  SNOOZE → delay 24h
  NOTE   → log note + pause

Approvals expire after 2 hours (agent skips if no reply).

#### Task Assignment (Natural Language)
Owner sends tasks via WhatsApp/SMS/in-app chat.
Agent confirms plan → executes on approval.

Examples:
"Chase all invoices overdue 7+ days"
"Pause reminders for [client] — meeting tomorrow"
"Who owes me the most right now?"
"Send friendly reminder to everyone due Friday"
"Write off Invoice #1089"
"Stop all voice calls this week"

#### Goal Setting
Owner sets outcome. Agent plans + executes to hit it.

Goal types:
  Monthly collection target ($amount)
  DSO target (days)
  Recovery rate target (%)
  "Clear all overdue before [date]"

Agent:
  Prioritizes invoices by collection likelihood + goal impact
  Suggests workflow adjustments if off track
  Reports daily progress
  Alerts if goal at risk

#### Mission Briefing (Onboarding — Agent Standing Instructions)
  Monthly collection target
  Acceptable DSO
  Priority: speed vs relationship
  Default tone: Friendly / Professional / Firm
  Escalation thresholds
  Contact restrictions
  Preferred update channel + frequency

#### Compliance Guardrails (Always Enforced — Cannot Be Bypassed)
Before every outbound action:
  ✓ Client not on DNC list
  ✓ Client has not opted out
  ✓ Within quiet hours (client timezone)
  ✓ Under weekly contact frequency limit
  ✓ Minimum gap since last contact
  ✓ Template approved for channel
  ✓ No active dispute on invoice
  ✓ No chargeback on account
  ✓ A2P 10DLC number used (SMS)
  ✓ TCPA mode passed (if enabled)

If ANY check fails → block action, log, notify owner.

---

### [MODULE 6] SURVEY BUILDER
Multi-step surveys via WhatsApp/SMS/email.

Trigger: After payment / after call / manual / workflow node

Types:
  Post-payment satisfaction (CSAT)
  NPS (Net Promoter Score)
  Dispute capture
  Payment intent qualifier
  Referral trigger

Routing:
  NPS 9–10  → "Leave a Google review? [link]"
  NPS ≤ 6   → Owner alert "At-risk client"
  Dispute   → Capture + workflow pause
  All       → Logged to client profile + analytics

---

### [MODULE 7] PAYMENT LINKS
- Stripe payment links per invoice
- Branded payment page (logo, colors, name)
- Partial payment support
- Payment plan (split invoices)
- Early payment discount (e.g. 2% off in 48hrs)
- Auto-reconcile on payment (Stripe webhook)
- Payment confirmation email auto-sent to client
- Embeddable in email/SMS/WhatsApp/voicemail

---

### [MODULE 8] DASHBOARD & ANALYTICS

Main Dashboard:
  Total outstanding
  Total collected this month vs target
  Goal progress bar ($31,200 / $50,000)
  Overdue invoices count + value
  Average DSO
  Collection rate %
  Active workflows
  Credit meters (SMS/Voice/Email)
  Recent activity feed
  Exception inbox
  Agent status

Cash Flow Forecasting:
  Projected 30/60/90-day collections
  At-risk invoice alerts
  Rolling chart

Client Intelligence:
  Risk scores (Low/Medium/High/Critical)
  Predictive payment dates
  Client lifetime value (CLV)
  Invoice health scores
  Anomaly detection
  Write-off predictions

Reports:
  Invoice aging (0–30/31–60/61–90/90+ days)
  Client payment behavior
  Workflow performance
  Channel effectiveness (email vs SMS vs voice)
  Interactive message response rates
  NPS/CSAT trends
  Revenue recovered by DueFlow
  Industry benchmarking
  Export: CSV, PDF

---

### [MODULE 9] CLIENT MANAGEMENT
Fields: name, email, phone, company, address, timezone
Tags: VIP / At-risk / Repeat late / DNC / High CLV
Data: payment history, avg days to pay, risk score, CLV,
      payment intent history, notes, activity log,
      full conversation history (all channels)
Bulk actions: pause, tag, reassign workflow

---

### [MODULE 10] CLIENT SELF-SERVICE PORTAL
Branded link per client.

Client can:
  View invoices (paid + outstanding)
  Download receipts + PDFs
  Pay (Stripe)
  Partial payment
  Request payment plan
  Dispute invoice
  Update contact preferences
  Opt out of channels

Dispute flow:
  1. Submit dispute reason
  2. Owner notified immediately
  3. All reminders paused
  4. Evidence captured
  5. Resolution timeline set
  6. Invoice → "In Dispute"
  7. Owner resolves → workflow resumes or cancelled

---

### [MODULE 11] CREDIT & BILLING SYSTEM
- Credit meter in dashboard header (always visible)
- Progress bars: SMS / Voice / Email
- Warning banner at 80% (yellow)
- Hard stop modal at 100% (red — no silent overruns)
- "Add credits" + "Upgrade plan" CTAs in meter
- Overage billing: Stripe metered
- Top-up packs: one-time Stripe charges
- Overage spending cap (user-configurable)
- Notify owner at $10/$25/$50 overage thresholds

---

### [MODULE 12] SETTINGS
  Business profile (name, logo, address, timezone, currency)
  Custom branding (colors, email sender, SMS sender ID)
  Team members (Owner/Admin/Member/View-only)
  Notification preferences
  Integrations management
  Billing + subscription
  API keys (Pro+)
  Autopilot mode selector
  Policy center:
    Quiet hours
    Channel permissions
    Contact frequency limits
    Tone policy
    Escalation thresholds
    DNC list upload
    TCPA toggle
  Compliance (opt-out list, HIPAA mode)

---

### [MODULE 13] INTEGRATIONS

Phase 1 (Launch):
  Stripe, Bird, AWS SES, ElevenLabs

Phase 2:
  QuickBooks Online (two-way), Xero (two-way),
  Zapier/Make, Slack, Google Calendar

Phase 3 (Enterprise):
  NetSuite, SAP, Oracle, SSO (SAML/OAuth),
  Custom ERP, Custom data retention

---

### [MODULE 14] MOBILE APP (React Native)
  Full dashboard
  Invoice creation + status
  Approve/deny agent actions (push notification)
  Invoice timeline
  Two-way inbox
  Exception inbox
  Credit meter
  Goal progress widget
  Agent task chat
  Push: payments, escalations, alerts

---

### [MODULE 15] CHROME EXTENSION
  Create invoice from any webpage or Gmail thread
  "Turn this email into an invoice"
  Capture client details from LinkedIn
  Send payment link without opening DueFlow
  View client payment status inline

---

## DATABASE SCHEMA (Drizzle / PostgreSQL)

users                  -- auth, profile, role, preferred_channel
organizations          -- business account, mission_briefing jsonb
invoices               -- records, status, health_score, risk_flag
clients                -- profiles, risk_score, clv, payment_intent
workflows              -- definitions (JSON nodes), mode, status
workflow_runs          -- execution log per invoice
workflow_nodes         -- individual node configs
communications         -- every SMS/email/voice/WhatsApp sent
communication_events   -- delivery/open/click/reply/sentiment
interactive_messages   -- surveys, polls, yes/no nodes
survey_responses       -- client answers + routing decisions
payments               -- Stripe payment events
subscriptions          -- plan, billing status, trial dates
usage_credits          -- monthly usage per channel
credit_topups          -- one-time pack purchases
integrations           -- connected third-party accounts
client_portal_sessions -- portal access + activity
disputes               -- dispute records + resolution log
goals                  -- owner goals + agent progress
agent_tasks            -- NL tasks + execution log
audit_logs             -- all user + agent actions

---

## API DESIGN (REST — Base: /api/v1/)

POST/GET/PATCH/DELETE  /invoices
POST                   /invoices/:id/bundle
POST                   /invoices/bulk

POST/GET/PATCH         /workflows
POST                   /workflows/:id/activate
POST                   /workflows/:id/pause
POST                   /workflows/:id/test
POST                   /workflows/:id/clone

POST/GET/PATCH         /clients
GET                    /clients/:id/history

POST                   /agent/task
POST                   /agent/goal
GET                    /agent/goals
POST                   /agent/approve
GET                    /agent/activity

POST                   /send/email
POST                   /send/sms
POST                   /send/voice
POST                   /send/whatsapp
POST                   /send/interactive

POST/GET               /surveys
GET                    /surveys/:id/results

GET                    /analytics/dashboard
GET                    /analytics/cashflow
GET                    /analytics/reports/:type
GET                    /analytics/benchmarks

GET                    /usage/credits
POST                   /usage/topup

POST                   /webhooks/stripe
POST                   /webhooks/bird
POST                   /webhooks/bird/voice
POST                   /webhooks/bird/whatsapp

---

## COMPLIANCE

CAN-SPAM:  Unsubscribe link in all emails
TCPA:      STOP opt-out, DNC list, 8am–9pm local only
FDCPA:     Tone guidelines in templates
A2P 10DLC: Register all SMS campaigns
GDPR:      Data export + deletion endpoints
HIPAA:     On-request (Enterprise)
Consent:   Per-client, per-channel, fully logged

---

## PERFORMANCE TARGETS

Dashboard load:              < 1.5s
Workflow trigger → action:   < 30s
SMS delivery:                < 60s
Voice call initiation:       < 90s
Interactive reply processing: < 5s
API response (p99):          < 300ms
Uptime:                      99.9%

---

## USER ROLES

Owner     Full access to everything
Admin     Full except billing full control
Member    Create invoices, use workflows, own reports
View-only View only — no actions

---

## BUILD ORDER

### Phase 1 — MVP
1. Auth + onboarding wizard + mission briefing
2. Invoice CRUD + status + health score
3. Stripe payment links + reconciliation
4. Basic email reminders (template engine)
5. Credit meter + Stripe subscriptions
6. Dashboard (basic metrics + goal widget)
7. Trial expiry flow + upgrade prompts
8. Manual autopilot mode (draft queue)

### Phase 2 — Core Product
9.  Workflow builder (React Flow canvas)
10. Workflow engine (trigger → condition → action)
11. SMS (Bird)
12. Guarded Autopilot + owner approval via SMS/WhatsApp
13. 10 pre-built workflow templates
14. Two-way inbox
15. Client profiles + risk scoring
16. Human handoff + exception inbox
17. Interactive message node
18. Policy center (quiet hours, DNC, frequency limits)

### Phase 3 — Full Platform
19. AI voice (Bird + ElevenLabs)
20. WhatsApp + interactive buttons
21. Full Autopilot mode
22. Survey builder
23. Cash flow forecasting
24. Advanced analytics + reports
25. Client self-service portal
26. Dispute management
27. Recurring invoices + invoice bundles
28. QuickBooks/Xero two-way sync
29. Natural language task assignment
30. Goal setting + progress tracking
31. Mobile app (React Native)
32. A/B testing for templates
33. Predictive payment date + anomaly detection

### Phase 4 — Enterprise
34. Multi-workspace / multi-tenant
35. SSO + RBAC
36. White-label
37. ERP integrations
38. TCPA compliance dashboard
39. Payment plan conversational negotiator
40. Chrome extension
41. DueFlow Marketplace
42. Referral program
43. Industry benchmarking

---

## HOW TO USE THIS FILE IN CURSOR

Reference this file before any build session:
@DUEFLOW.md

Example prompts:
"@DUEFLOW.md — Build Module 3 (Workflow Engine).
Start with the React Flow canvas, node types,
and the trigger → condition → action runner."

"@DUEFLOW.md — Build the credit meter UI component.
Use the credit billing spec in Module 11."

"@DUEFLOW.md — Build the Stripe subscription integration.
Use the pricing table and trial logic in the Pricing section."

"@DUEFLOW.md — Scaffold the full database schema
using Drizzle ORM and PostgreSQL."

This is the single source of truth.
Do not deviate from this spec without updating this file first.
