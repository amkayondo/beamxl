"use client";

import {
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  Globe,
  Lock,
  Mail,
  MessageSquare,
  Mic,
  Phone,
  Shield,
  Smartphone,
  Users,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  UTILS                                                             */
/* ------------------------------------------------------------------ */
function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/*  NAVBAR                                                            */
/* ------------------------------------------------------------------ */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-200",
        scrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-zinc-200"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-zinc-900">
            <Zap className="size-3.5 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900">
            DueFlow
          </span>
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {[
            { label: "Features", href: "/#features" },
            { label: "How it works", href: "/#how-it-works" },
            { label: "Pricing", href: "/pricing" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-[13px] transition-colors hover:text-zinc-900",
                item.href === "/pricing"
                  ? "text-zinc-900 font-medium"
                  : "text-zinc-500"
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="/sign-in"
            className="hidden text-[13px] text-zinc-500 transition-colors hover:text-zinc-900 sm:block"
          >
            Log in
          </a>
          <a
            href="/sign-in"
            className="rounded-full bg-zinc-900 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Get started free
          </a>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  SECTION LABEL                                                     */
/* ------------------------------------------------------------------ */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-center text-[12px] font-medium uppercase tracking-[0.2em] text-zinc-400">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/*  HERO                                                              */
/* ------------------------------------------------------------------ */
function PricingHero() {
  return (
    <section className="pt-32 pb-16 sm:pt-36">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <SectionLabel>Pricing</SectionLabel>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          Simple pricing that pays for itself
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-zinc-500 sm:text-lg">
          Subscription + communication credits. Start with a{" "}
          <span className="font-medium text-zinc-700">14-day free trial</span>{" "}
          — full Growth+ access, no card required.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  PLAN CARDS                                                        */
/* ------------------------------------------------------------------ */
interface PlanTier {
  name: string;
  desc: string;
  price: string;
  priceNote: string;
  featured: boolean;
  cta: string;
  ctaHref: string;
  features: string[];
  comms: { label: string; value: string }[];
}

const PLANS: PlanTier[] = [
  {
    name: "Starter",
    desc: "For freelancers and small teams automating their first invoices.",
    price: "$49",
    priceNote: "/month",
    featured: false,
    cta: "Start 14-day free trial",
    ctaHref: "/sign-in",
    features: [
      "500 invoices/month",
      "1 user",
      "3 workflows (basic branching, 2 conditions)",
      "Email + SMS only",
      "DueFlow branded",
      "Basic analytics",
      "One-click payment links",
    ],
    comms: [
      { label: "SMS", value: "200/month" },
      { label: "Email", value: "10,000/month" },
      { label: "Voice", value: "15 min/month" },
    ],
  },
  {
    name: "Growth+",
    desc: "Full-featured for growing teams. The default trial plan.",
    price: "$79",
    priceNote: "/month",
    featured: true,
    cta: "Start 14-day free trial",
    ctaHref: "/sign-in",
    features: [
      "3,000 invoices/month",
      "3 users",
      "15 workflows (full branching, unlimited conditions)",
      "Email + SMS + Voice + WhatsApp + Internal alerts",
      "Custom branding",
      "Pre-built template library",
      "Limited API access",
    ],
    comms: [
      { label: "SMS", value: "1,500/month" },
      { label: "Email", value: "20,000/month" },
      { label: "Voice", value: "90 min/month" },
      { label: "WhatsApp", value: "Included" },
    ],
  },
  {
    name: "Pro",
    desc: "For finance teams needing enterprise-grade control and integrations.",
    price: "$149",
    priceNote: "/month",
    featured: false,
    cta: "Start 14-day free trial",
    ctaHref: "/sign-in",
    features: [
      "Unlimited invoices",
      "5 users (+$15/seat/month)",
      "Unlimited workflows",
      "All channels + API triggers + Webhooks",
      "Full white-label",
      "Full REST API",
      "QuickBooks, Xero, Slack, Zapier/Make",
      "4hr SLA + onboarding call",
    ],
    comms: [
      { label: "SMS", value: "5,000/month" },
      { label: "Email", value: "50,000/month" },
      { label: "Voice", value: "200 min/month" },
      { label: "WhatsApp", value: "Priority routing" },
    ],
  },
];

function PlanCards() {
  return (
    <section className="pb-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-2xl border p-7",
                plan.featured
                  ? "border-zinc-900 bg-white shadow-sm"
                  : "border-zinc-200 bg-white"
              )}
            >
              {plan.featured && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <span className="rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-semibold text-white">
                    Most popular
                  </span>
                </div>
              )}

              <h3 className="text-lg font-semibold text-zinc-900">
                {plan.name}
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
                {plan.desc}
              </p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-zinc-900">
                  {plan.price}
                </span>
                <span className="text-[13px] text-zinc-400">
                  {plan.priceNote}
                </span>
              </div>

              <a
                href={plan.ctaHref}
                className={cn(
                  "mt-6 flex w-full items-center justify-center rounded-full py-2.5 text-[14px] font-medium transition-colors",
                  plan.featured
                    ? "bg-zinc-900 text-white hover:bg-zinc-800"
                    : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                )}
              >
                {plan.cta}
              </a>

              <div className="my-6 h-px bg-zinc-100" />

              {/* Platform features */}
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                Platform
              </p>
              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-[13px] text-zinc-600"
                  >
                    <Check className="mt-0.5 size-3.5 shrink-0 text-zinc-400" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Communication bundle */}
              <div className="mt-5 h-px bg-zinc-100" />
              <p className="mb-3 mt-5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                Included credits
              </p>
              <ul className="space-y-2">
                {plan.comms.map((c) => (
                  <li
                    key={c.label}
                    className="flex items-center justify-between text-[13px]"
                  >
                    <span className="text-zinc-500">{c.label}</span>
                    <span className="font-medium text-zinc-700">{c.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  ENTERPRISE BANNER                                                 */
/* ------------------------------------------------------------------ */
function EnterpriseBanner() {
  return (
    <section className="pb-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 sm:p-10">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-zinc-900">Enterprise</h3>
              <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-zinc-500">
                Custom pricing from{" "}
                <span className="font-medium text-zinc-700">$499/month</span>.
                Multi-workspace, SSO, SAML/OAuth, RBAC, HIPAA-ready, SOC 2 ready.
                Dedicated CSM, 1hr SLA, quarterly reviews.
              </p>
            </div>
            <a
              href="mailto:sales@dueflow.com"
              className="shrink-0 rounded-full bg-zinc-900 px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-zinc-800"
            >
              Contact sales
            </a>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: <Users className="size-4" />,
                title: "Unlimited everything",
                desc: "Invoices, users, workflows — no caps.",
              },
              {
                icon: <Shield className="size-4" />,
                title: "Compliance toolkit",
                desc: "TCPA/FDCPA tools, HIPAA-ready, SOC 2.",
              },
              {
                icon: <Globe className="size-4" />,
                title: "Custom integrations",
                desc: "ERP (SAP, Oracle, NetSuite), custom webhooks.",
              },
              {
                icon: <Lock className="size-4" />,
                title: "Security controls",
                desc: "SSO, IP whitelisting, custom data retention.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-600 border border-zinc-200">
                  {item.icon}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-zinc-800">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-zinc-500">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  CREDIT TOP-UP PACKS                                               */
/* ------------------------------------------------------------------ */
function CreditPacks() {
  const packs = [
    {
      name: "Mini",
      price: "$7",
      items: [
        { label: "SMS", value: "+200" },
        { label: "Email", value: "+2,000" },
        { label: "Voice", value: "—" },
      ],
    },
    {
      name: "Business",
      price: "$29",
      items: [
        { label: "SMS", value: "+1,000" },
        { label: "Email", value: "+10,000" },
        { label: "Voice", value: "+60 min" },
      ],
    },
    {
      name: "Power",
      price: "$99",
      items: [
        { label: "SMS", value: "+5,000" },
        { label: "Email", value: "+50,000" },
        { label: "Voice", value: "+200 min" },
      ],
    },
  ];

  return (
    <section className="border-t border-zinc-100 bg-zinc-50">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Top-up packs</SectionLabel>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Need more credits? Buy anytime.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-center text-[14px] text-zinc-500">
          One-time purchases — add credits from your dashboard at any point.
          Credits expire at end of billing cycle.
        </p>

        <div className="mx-auto mt-12 grid max-w-3xl gap-5 sm:grid-cols-3">
          {packs.map((pack) => (
            <div
              key={pack.name}
              className="rounded-2xl border border-zinc-200 bg-white p-6 text-center"
            >
              <h3 className="text-lg font-semibold text-zinc-900">
                {pack.name}
              </h3>
              <div className="mt-2 flex items-baseline justify-center gap-1">
                <span className="text-2xl font-bold text-zinc-900">
                  {pack.price}
                </span>
                <span className="text-[13px] text-zinc-400">one-time</span>
              </div>

              <div className="my-5 h-px bg-zinc-100" />

              <ul className="space-y-2.5">
                {pack.items.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between text-[13px]"
                  >
                    <span className="text-zinc-500">{item.label}</span>
                    <span className="font-medium text-zinc-700">
                      {item.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  OVERAGE PRICING                                                   */
/* ------------------------------------------------------------------ */
function OveragePricing() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionLabel>Overages</SectionLabel>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Transparent overage pricing
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-[14px] text-zinc-500">
          Only pay for what you use beyond your included bundle. Set a monthly
          spending cap or choose hard-stop mode — you&apos;re always in control.
        </p>

        <div className="mx-auto mt-12 max-w-2xl">
          <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-6 py-3.5 text-[12px] font-semibold uppercase tracking-widest text-zinc-400">
                    Channel
                  </th>
                  <th className="px-6 py-3.5 text-[12px] font-semibold uppercase tracking-widest text-zinc-400">
                    Rate
                  </th>
                  <th className="px-6 py-3.5 text-[12px] font-semibold uppercase tracking-widest text-zinc-400">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                <tr>
                  <td className="px-6 py-3.5 font-medium text-zinc-700">SMS</td>
                  <td className="px-6 py-3.5 text-zinc-600">$0.012/msg</td>
                  <td className="px-6 py-3.5 text-zinc-500">
                    Volume discounts on Pro
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-3.5 font-medium text-zinc-700">
                    Voice
                  </td>
                  <td className="px-6 py-3.5 text-zinc-600">$0.03/min</td>
                  <td className="px-6 py-3.5 text-zinc-500">
                    Volume discounts on Pro
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-3.5 font-medium text-zinc-700">
                    Email
                  </td>
                  <td className="px-6 py-3.5 text-zinc-600">Included</td>
                  <td className="px-6 py-3.5 text-zinc-500">
                    No overage charges
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <CreditCard className="size-4" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-zinc-800">
                  Spending cap
                </p>
                <p className="mt-0.5 text-[12px] text-zinc-500">
                  Set a monthly max. We alert at $10, $25, $50 thresholds.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <X className="size-4" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-zinc-800">
                  Hard-stop mode
                </p>
                <p className="mt-0.5 text-[12px] text-zinc-500">
                  Choose to stop sending when credits run out — no surprise
                  charges.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FEATURE COMPARISON TABLE                                          */
/* ------------------------------------------------------------------ */
type CellValue = boolean | string;

interface ComparisonRow {
  feature: string;
  starter: CellValue;
  growth: CellValue;
  pro: CellValue;
}

const COMPARISON: { category: string; rows: ComparisonRow[] }[] = [
  {
    category: "Platform",
    rows: [
      {
        feature: "Max invoices/month",
        starter: "500",
        growth: "3,000",
        pro: "Unlimited",
      },
      { feature: "Users", starter: "1", growth: "3", pro: "5 (+$15/seat)" },
      { feature: "Workflows", starter: "3", growth: "15", pro: "Unlimited" },
      {
        feature: "Custom branding",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        feature: "Full white-label",
        starter: false,
        growth: false,
        pro: true,
      },
      { feature: "API access", starter: false, growth: "Limited", pro: "Full REST API" },
      {
        feature: "Template library",
        starter: false,
        growth: true,
        pro: true,
      },
    ],
  },
  {
    category: "Channels",
    rows: [
      { feature: "Email", starter: true, growth: true, pro: true },
      { feature: "SMS", starter: true, growth: true, pro: true },
      {
        feature: "AI Voice calls",
        starter: false,
        growth: true,
        pro: true,
      },
      { feature: "WhatsApp", starter: false, growth: true, pro: "Priority" },
      {
        feature: "Internal alerts",
        starter: false,
        growth: true,
        pro: true,
      },
      {
        feature: "API triggers & webhooks",
        starter: false,
        growth: false,
        pro: true,
      },
    ],
  },
  {
    category: "Included credits",
    rows: [
      { feature: "SMS/month", starter: "200", growth: "1,500", pro: "5,000" },
      {
        feature: "Email/month",
        starter: "10,000",
        growth: "20,000",
        pro: "50,000",
      },
      {
        feature: "Voice min/month",
        starter: "15",
        growth: "90",
        pro: "200",
      },
    ],
  },
  {
    category: "Integrations",
    rows: [
      {
        feature: "QuickBooks / Xero",
        starter: false,
        growth: false,
        pro: true,
      },
      {
        feature: "Slack notifications",
        starter: false,
        growth: false,
        pro: true,
      },
      {
        feature: "Zapier / Make",
        starter: false,
        growth: false,
        pro: true,
      },
    ],
  },
  {
    category: "Support",
    rows: [
      {
        feature: "Support level",
        starter: "Email",
        growth: "Priority email",
        pro: "4hr SLA + onboarding",
      },
    ],
  },
];

function ComparisonTable() {
  return (
    <section className="border-t border-zinc-100 bg-zinc-50">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <SectionLabel>Compare plans</SectionLabel>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Full feature comparison
        </h2>

        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-150 text-left text-[13px]">
            {/* Header */}
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="pb-3 pr-4 text-[12px] font-semibold uppercase tracking-widest text-zinc-400 w-2/5">
                  Feature
                </th>
                <th className="pb-3 px-4 text-center text-[12px] font-semibold uppercase tracking-widest text-zinc-400 w-1/5">
                  Starter
                </th>
                <th className="pb-3 px-4 text-center text-[12px] font-semibold uppercase tracking-widest text-zinc-900 w-1/5">
                  Growth+
                </th>
                <th className="pb-3 pl-4 text-center text-[12px] font-semibold uppercase tracking-widest text-zinc-400 w-1/5">
                  Pro
                </th>
              </tr>
            </thead>

            <tbody>
              {COMPARISON.map((group) => (
                <>
                  <tr key={`cat-${group.category}`}>
                    <td
                      colSpan={4}
                      className="pt-6 pb-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400"
                    >
                      {group.category}
                    </td>
                  </tr>
                  {group.rows.map((row) => (
                    <tr
                      key={row.feature}
                      className="border-b border-zinc-100"
                    >
                      <td className="py-3 pr-4 text-zinc-600">
                        {row.feature}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <CellDisplay value={row.starter} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <CellDisplay value={row.growth} />
                      </td>
                      <td className="py-3 pl-4 text-center">
                        <CellDisplay value={row.pro} />
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>

            {/* Price row */}
            <tfoot>
              <tr className="border-t border-zinc-200">
                <td className="pt-5 pr-4 text-[13px] font-semibold text-zinc-700">
                  Monthly price
                </td>
                <td className="pt-5 px-4 text-center text-lg font-bold text-zinc-900">
                  $49
                </td>
                <td className="pt-5 px-4 text-center text-lg font-bold text-zinc-900">
                  $79
                </td>
                <td className="pt-5 pl-4 text-center text-lg font-bold text-zinc-900">
                  $149
                </td>
              </tr>
              <tr>
                <td />
                <td className="px-4 pt-3 pb-1 text-center">
                  <a
                    href="/sign-in"
                    className="inline-flex rounded-full border border-zinc-200 px-4 py-2 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                  >
                    Start trial
                  </a>
                </td>
                <td className="px-4 pt-3 pb-1 text-center">
                  <a
                    href="/sign-in"
                    className="inline-flex rounded-full bg-zinc-900 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-zinc-800"
                  >
                    Start trial
                  </a>
                </td>
                <td className="pl-4 pt-3 pb-1 text-center">
                  <a
                    href="/sign-in"
                    className="inline-flex rounded-full border border-zinc-200 px-4 py-2 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                  >
                    Start trial
                  </a>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}

function CellDisplay({ value }: { value: CellValue }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center">
        <Check className="size-4 text-emerald-500" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center">
        <X className="size-3.5 text-zinc-300" />
      </span>
    );
  }
  return <span className="text-zinc-700 font-medium">{value}</span>;
}

/* ------------------------------------------------------------------ */
/*  TRIAL DETAILS                                                     */
/* ------------------------------------------------------------------ */
function TrialDetails() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionLabel>Free trial</SectionLabel>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          14 days of full Growth+ access
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-[14px] text-zinc-500">
          No credit card required to start. Full access to every Growth+
          feature, including email, SMS, voice, and WhatsApp.
        </p>

        <div className="mx-auto mt-12 max-w-2xl">
          <div className="space-y-0 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white overflow-hidden">
            {[
              {
                day: "Day 0",
                title: "Welcome + setup",
                desc: "Welcome email and workflow setup prompt to get your first sequence live.",
              },
              {
                day: "Day 3",
                title: "Setup check-in",
                desc: '"Have you set up your first workflow?" — gentle nudge to maximize trial value.',
              },
              {
                day: "Day 7",
                title: "Halfway stats",
                desc: '"Here\'s what you\'ve collected so far" — real metrics from your trial.',
              },
              {
                day: "Day 12",
                title: "Upgrade prompt",
                desc: "Pre-select Growth+ at $79/mo — keep everything you've built.",
              },
              {
                day: "Day 14",
                title: "Card required",
                desc: "Hard gate — add a payment method to continue. All data preserved.",
              },
            ].map((step) => (
              <div key={step.day} className="flex gap-5 p-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-bold text-zinc-600">
                  {step.day.replace("Day ", "D")}
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-zinc-800">
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-[13px] text-zinc-500">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ                                                               */
/* ------------------------------------------------------------------ */
function FAQ() {
  const [openIndex, setOpenIndex] = useState(-1);

  const faqs = [
    {
      q: "Do I need a credit card to start the trial?",
      a: "No. You get 14 days of full Growth+ access with no card required. A payment method is only needed to continue after the trial or to activate SMS/voice sending at any point.",
    },
    {
      q: "What happens when my credits run out?",
      a: "You choose: either continue sending and pay overages at the end of the billing cycle, or enable hard-stop mode where sending pauses until you top up or the next cycle begins. You're always in control.",
    },
    {
      q: "Can I change plans mid-cycle?",
      a: "Yes. Upgrades take effect immediately and are prorated. Downgrades take effect at the start of your next billing cycle.",
    },
    {
      q: "What are the overage rates?",
      a: "SMS: $0.012/message. Voice: $0.03/minute. Email is always included with no overage charges. Pro plans get volume discounts on SMS and voice.",
    },
    {
      q: "Is there an annual discount?",
      a: "Enterprise plans require an annual commitment (minimum 12 months). For Starter, Growth+, and Pro, we offer monthly billing — contact us for annual pricing.",
    },
    {
      q: "How does the credit meter work?",
      a: "Your dashboard shows real-time usage per channel with progress bars. You get a yellow warning at 80% usage and a hard stop at 100% (if enabled). You can top-up credits or upgrade your plan at any time.",
    },
  ];

  return (
    <section className="border-t border-zinc-100 bg-zinc-50">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <SectionLabel>FAQ</SectionLabel>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Common questions
        </h2>

        <div className="mt-10 divide-y divide-zinc-200">
          {faqs.map((faq, i) => (
            <div key={faq.q}>
              <button
                type="button"
                onClick={() => setOpenIndex(i === openIndex ? -1 : i)}
                className="flex w-full items-center justify-between py-5 text-left"
              >
                <span
                  className={cn(
                    "text-[14px] font-medium transition-colors pr-4",
                    openIndex === i ? "text-zinc-900" : "text-zinc-600"
                  )}
                >
                  {faq.q}
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-zinc-400 transition-transform duration-200",
                    openIndex === i && "rotate-180"
                  )}
                />
              </button>
              {openIndex === i && (
                <p className="pb-5 text-[14px] leading-relaxed text-zinc-500">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  CTA                                                               */
/* ------------------------------------------------------------------ */
function FinalCta() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Stop waiting on your own money
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base text-zinc-500">
          Start your 14-day free trial today. Full Growth+ access, no card
          required.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="/sign-in"
            className="flex items-center gap-2 rounded-full bg-zinc-900 px-7 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Get started for free
            <ArrowRight className="size-4" />
          </a>
          <a
            href="mailto:sales@dueflow.com"
            className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-7 py-3.5 text-[15px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Contact sales
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FOOTER                                                            */
/* ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer className="border-t border-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-zinc-900">
              <Zap className="size-3 text-white" />
            </div>
            <span className="text-[14px] font-semibold text-zinc-900">
              DueFlow
            </span>
          </div>

          <div className="flex items-center gap-6 text-[13px] text-zinc-400">
            <a href="/" className="hover:text-zinc-600 transition-colors">
              Home
            </a>
            <a href="/pricing" className="hover:text-zinc-600 transition-colors">
              Pricing
            </a>
            <a href="#" className="hover:text-zinc-600 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-zinc-600 transition-colors">
              Terms
            </a>
          </div>

          <p className="text-[12px] text-zinc-400">
            &copy; {new Date().getFullYear()} DueFlow, Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE EXPORT                                                       */
/* ------------------------------------------------------------------ */
export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 antialiased">
      <Navbar />
      <main>
        <PricingHero />
        <PlanCards />
        <EnterpriseBanner />
        <CreditPacks />
        <OveragePricing />
        <ComparisonTable />
        <TrialDetails />
        <FAQ />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
