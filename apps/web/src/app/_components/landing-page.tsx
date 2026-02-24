"use client";

import {
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  GitBranch,
  Globe,
  Home,
  LayoutDashboard,
  Lock,
  Mail,
  MessageSquare,
  Mic,
  Phone,
  Play,
  Receipt,
  Shield,
  Smartphone,
  TrendingUp,
  Users,
  Workflow,
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
          {["Features", "How it works", "Pricing"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
              className="relative rounded-md px-3 py-1.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-900 after:absolute after:bottom-1 after:left-3 after:right-3 after:h-px after:origin-left after:scale-x-0 after:bg-zinc-900 after:transition-transform after:duration-200 hover:after:scale-x-100"
            >
              {item}
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
            className="group flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-[13px] font-medium text-white transition-all hover:bg-zinc-800 hover:shadow-lg hover:shadow-zinc-900/15"
          >
            Get started for free
            <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  HERO                                                              */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative pt-32 pb-20 sm:pt-36 sm:pb-24 overflow-hidden">
      {/* Radial gradient — the psychological halo starts here */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,rgba(0,0,0,0.04),transparent)]" />
      <div className="mx-auto max-w-6xl px-6">
        {/* Top pill */}
        <div className="flex justify-center mb-6">
          <div className="group flex cursor-default items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-1.5 transition-all duration-200 hover:border-zinc-300 hover:bg-white hover:shadow-sm">
            <span className="flex size-5 items-center justify-center rounded-full bg-zinc-900 transition-transform duration-200 group-hover:scale-110">
              <Zap className="size-3 text-white" />
            </span>
            <span className="text-[13px] text-zinc-600">
              Payment follow-up automation
            </span>
            <ArrowRight className="size-3 text-zinc-400 transition-transform duration-200 group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-3xl text-center text-[2.75rem] font-bold leading-[1.08] tracking-tight text-zinc-900 sm:text-5xl lg:text-[4rem]">
          Turn what&apos;s due into paid — automatically
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-center text-base leading-relaxed text-zinc-500 sm:text-lg">
          Intelligent email, SMS, and voice reminders that get you paid faster.
          Stop chasing invoices. Start collecting automatically.
        </p>

        {/* CTAs */}
        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="/sign-in"
            className="group flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-[14px] font-medium text-white transition-all hover:bg-zinc-800 hover:shadow-xl hover:shadow-zinc-900/20 hover:-translate-y-px active:translate-y-0"
          >
            Get started for free
            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>
          <a
            href="#how-it-works"
            className="group flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-6 py-3 text-[14px] font-medium text-zinc-700 transition-all hover:bg-zinc-50 hover:border-zinc-300 hover:-translate-y-px hover:shadow-sm active:translate-y-0"
          >
            <Play className="size-3.5 text-zinc-400 transition-colors group-hover:text-zinc-600" />
            Book a demo
          </a>
        </div>

        {/* Product mockup */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-200/50">
            <div className="rounded-xl bg-zinc-50 p-6 sm:p-8">
              {/* Toolbar */}
              <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-7 items-center justify-center rounded-md bg-zinc-100">
                    <Workflow className="size-3.5 text-zinc-600" />
                  </div>
                  <span className="text-[13px] font-medium text-zinc-700">
                    Invoice Follow-up Sequence
                  </span>
                </div>
                <div className="rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-600">
                  Active
                </div>
              </div>

              {/* Flow nodes */}
              <div className="flex items-center gap-3 overflow-x-auto pb-2 sm:gap-4">
                <FlowNode
                  icon={<FileText className="size-4" />}
                  label="Invoice Overdue"
                  sublabel="Day 3"
                  bgColor="bg-amber-50"
                  iconColor="text-amber-600"
                  borderColor="border-amber-200"
                />
                <FlowConnector />
                <FlowNode
                  icon={<Mail className="size-4" />}
                  label="Email Reminder"
                  sublabel="Sent"
                  bgColor="bg-blue-50"
                  iconColor="text-blue-600"
                  borderColor="border-blue-200"
                />
                <FlowConnector />
                <FlowNode
                  icon={<Smartphone className="size-4" />}
                  label="SMS Reminder"
                  sublabel="Day 7"
                  bgColor="bg-violet-50"
                  iconColor="text-violet-600"
                  borderColor="border-violet-200"
                />
                <FlowConnector />
                <FlowNode
                  icon={<Check className="size-4" />}
                  label="Paid"
                  sublabel="Resolved"
                  bgColor="bg-emerald-50"
                  iconColor="text-emerald-600"
                  borderColor="border-emerald-200"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowNode({
  icon,
  label,
  sublabel,
  bgColor,
  iconColor,
  borderColor,
}: {
  icon: ReactNode;
  label: string;
  sublabel: string;
  bgColor: string;
  iconColor: string;
  borderColor: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-28 flex-col items-center gap-2.5 rounded-xl border p-4 sm:min-w-32 transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-default",
        bgColor,
        borderColor
      )}
    >
      <div className={iconColor}>{icon}</div>
      <span className="text-xs font-medium text-zinc-800 whitespace-nowrap">
        {label}
      </span>
      <span className="text-[10px] text-zinc-500">{sublabel}</span>
    </div>
  );
}

function FlowConnector() {
  return (
    <div className="flex items-center shrink-0">
      <div className="h-px w-4 bg-zinc-200 sm:w-6" />
      <ChevronRight className="size-3.5 text-zinc-300" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TRUST BAR                                                         */
/* ------------------------------------------------------------------ */
function TrustBar() {
  return (
    <section className="border-y border-zinc-100 bg-zinc-50/50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="mb-7 text-center text-[12px] font-medium uppercase tracking-[0.2em] text-zinc-400">
          Trusted by finance teams everywhere
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {[
            "Agencies",
            "SaaS",
            "Freelancers",
            "Property Mgmt",
            "Professional Services",
          ].map((name) => (
            <span key={name} className="text-[14px] font-medium text-zinc-400">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  CAPABILITIES ROW  (Secoda-style icon cards)                       */
/* ------------------------------------------------------------------ */
function Capabilities() {
  const items = [
    {
      icon: <Workflow className="size-5" />,
      title: "Automate",
      desc: "Visual workflows for email, SMS, and voice follow-ups.",
      color: "bg-violet-50 text-violet-600",
    },
    {
      icon: <BarChart3 className="size-5" />,
      title: "Track",
      desc: "Real-time dashboards for every invoice and payment.",
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: <GitBranch className="size-5" />,
      title: "Adapt",
      desc: "Smart branching logic that responds to client actions.",
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: <Shield className="size-5" />,
      title: "Comply",
      desc: "Built-in TCPA and CAN-SPAM compliance at every step.",
      color: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Meet the payment follow-up
            <br />
            platform built for speed
          </h2>
          <p className="mt-4 text-base text-zinc-500">
            Connect your invoices and let DueFlow handle the rest — from gentle
            reminders to smart escalation.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.title} className="text-center">
              <div
                className={cn(
                  "mx-auto flex size-12 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-110",
                  item.color
                )}
              >
                {item.icon}
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-zinc-900">
                {item.title}
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FEATURES — ACCORDION + SCREENSHOT (Secoda-style)                  */
/* ------------------------------------------------------------------ */
function FeaturesAccordion() {
  const [openIndex, setOpenIndex] = useState(0);

  const features = [
    {
      title: "Visual Workflow Builder",
      desc: "Design your collection strategy with drag-and-drop. Set custom delays, triggers, and conditions — no code required. Reuse templates for common scenarios.",
      cta: "Learn more",
    },
    {
      title: "Email + SMS Reminders",
      desc: "Send personalized, branded emails and high-converting SMS reminders with one-click payment links. Smart send-time optimization maximizes open rates.",
      cta: "Learn more",
    },
    {
      title: "AI Voice Escalation",
      desc: "When emails and texts are ignored, escalate with professional AI-driven voice calls. Polite, fully TCPA-compliant, and highly effective at breaking through.",
      cta: "Learn more",
    },
    {
      title: "Smart Branching Logic",
      desc: "Auto-stop reminders the instant payment lands. Route VIP clients to softer sequences. Create conditional paths based on amount, tier, or response.",
      cta: "Learn more",
    },
  ];

  return (
    <section id="features" className="border-t border-zinc-100 bg-zinc-50">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionLabel>Features</SectionLabel>
        <h2 className="mt-4 text-center text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Everything you need to get paid on time
        </h2>

        <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
          {/* Accordion */}
          <div className="space-y-0 divide-y divide-zinc-200">
            {features.map((f, i) => (
              <div key={f.title}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(i === openIndex ? -1 : i)}
                  className="flex w-full items-center justify-between py-5 text-left"
                >
                  <span
                    className={cn(
                      "text-[15px] font-semibold transition-colors",
                      openIndex === i ? "text-zinc-900" : "text-zinc-500"
                    )}
                  >
                    {f.title}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 text-zinc-400 transition-transform duration-200",
                      openIndex === i && "rotate-180"
                    )}
                  />
                </button>
                {openIndex === i && (
                  <div className="pb-5">
                    <p className="text-[14px] leading-relaxed text-zinc-500">
                      {f.desc}
                    </p>
                    <a
                      href="#"
                      className="group mt-4 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-[13px] font-medium text-zinc-700 transition-all hover:bg-zinc-50 hover:border-zinc-300 hover:shadow-sm"
                    >
                      {f.cta}
                      <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Static product screenshot mockup */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-lg shadow-zinc-200/40">
            <div className="rounded-xl bg-zinc-50 p-5">
              {/* Mock dashboard */}
              <div className="flex items-center gap-2 mb-4">
                <div className="size-2.5 rounded-full bg-zinc-200" />
                <div className="size-2.5 rounded-full bg-zinc-200" />
                <div className="size-2.5 rounded-full bg-zinc-200" />
                <div className="ml-auto h-5 w-16 rounded bg-zinc-200" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg bg-white p-3 border border-zinc-100">
                  <div className="flex size-8 items-center justify-center rounded-md bg-amber-50">
                    <FileText className="size-3.5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="h-3 w-28 rounded bg-zinc-200" />
                    <div className="mt-1.5 h-2 w-20 rounded bg-zinc-100" />
                  </div>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                    Overdue
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-white p-3 border border-zinc-100">
                  <div className="flex size-8 items-center justify-center rounded-md bg-blue-50">
                    <Mail className="size-3.5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="h-3 w-32 rounded bg-zinc-200" />
                    <div className="mt-1.5 h-2 w-24 rounded bg-zinc-100" />
                  </div>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                    Sent
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-white p-3 border border-zinc-100">
                  <div className="flex size-8 items-center justify-center rounded-md bg-emerald-50">
                    <Check className="size-3.5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="h-3 w-24 rounded bg-zinc-200" />
                    <div className="mt-1.5 h-2 w-16 rounded bg-zinc-100" />
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                    Paid
                  </span>
                </div>
              </div>

              {/* Mini chart */}
              <div className="mt-5 rounded-lg bg-white border border-zinc-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-medium text-zinc-500">
                    Collection Rate
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600">
                    +22%
                  </span>
                </div>
                <div className="flex items-end gap-1.5 h-16">
                  {[35, 42, 38, 55, 60, 52, 68, 72, 65, 78, 82, 88].map(
                    (h, i) => (
                      <div
                        key={`bar-${i}`}
                        className="flex-1 rounded-sm bg-zinc-900"
                        style={{ height: `${h}%` }}
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FEATURES GRID (Additional features)                               */
/* ------------------------------------------------------------------ */
function FeaturesGrid() {
  const features = [
    {
      icon: <BarChart3 className="size-5" />,
      title: "Real-Time Tracking",
      desc: "Live dashboards showing every reminder, open rate, and incoming payment across your portfolio.",
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: <LayoutDashboard className="size-5" />,
      title: "Reporting & Insights",
      desc: "Track collection rates, DSO trends, and time-to-pay across your entire customer base.",
      color: "bg-violet-50 text-violet-600",
    },
    {
      icon: <CreditCard className="size-5" />,
      title: "Payment Links",
      desc: "Generate one-click payment links embedded in every reminder. Clients pay in seconds.",
      color: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-5 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-200 hover:border-zinc-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl",
                  f.color
                )}
              >
                {f.icon}
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-zinc-900">
                {f.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  HOW IT WORKS — TIMELINE                                           */
/* ------------------------------------------------------------------ */
function HowItWorks() {
  const steps = [
    {
      day: "Day 0",
      title: "Invoice Sent",
      desc: "Invoice generated and sent. DueFlow silently starts tracking the due date.",
      icon: <FileText className="size-4" />,
      color: "bg-zinc-100 text-zinc-500",
    },
    {
      day: "Day 3",
      title: "Email Reminder",
      desc: "Polite, automated email with a direct payment link. Branded to match your business.",
      icon: <Mail className="size-4" />,
      color: "bg-blue-50 text-blue-600",
    },
    {
      day: "Day 7",
      title: "SMS Escalation",
      desc: "No payment detected. A friendly SMS reminder sent directly to the client's phone.",
      icon: <Smartphone className="size-4" />,
      color: "bg-violet-50 text-violet-600",
    },
    {
      day: "Day 14",
      title: "Voice Escalation",
      desc: "Still unpaid. Professional AI voice call initiated to resolve the block.",
      icon: <Phone className="size-4" />,
      color: "bg-amber-50 text-amber-600",
    },
    {
      day: "Day 15",
      title: "Payment Received",
      desc: "Payment arrives. All reminders halt. Automated receipt sent instantly.",
      icon: <Check className="size-4" />,
      color: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <section id="how-it-works" className="border-t border-zinc-100 bg-zinc-50">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionLabel>How it works</SectionLabel>
        <h2 className="mt-4 text-center text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          The anatomy of a perfect follow-up
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-center text-[15px] text-zinc-500">
          See how DueFlow handles an overdue invoice from first reminder to
          final receipt.
        </p>

        <div className="mx-auto mt-16 max-w-2xl">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-zinc-200 sm:left-7" />

            <div className="space-y-8">
              {steps.map((s) => (
                <div key={s.day} className="relative flex gap-5 sm:gap-7">
                  <div
                    className={cn(
                      "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full sm:size-14",
                      s.color
                    )}
                  >
                    {s.icon}
                  </div>
                  <div className="pt-1 sm:pt-3">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                      {s.day}
                    </span>
                    <h3 className="mt-1 text-[15px] font-semibold text-zinc-900">
                      {s.title}
                    </h3>
                    <p className="mt-1 text-[14px] leading-relaxed text-zinc-500">
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  PROBLEM                                                           */
/* ------------------------------------------------------------------ */
function Problem() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>The problem</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            You run a business — not a collections agency
          </h2>
          <p className="mt-4 text-base text-zinc-500">
            Chasing late payments kills growth. Every ignored invoice means
            unpredictable cash flow, wasted hours, and strained relationships.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          {[
            {
              icon: <Clock className="size-5" />,
              title: "Lost Time",
              desc: "Hours spent tracking spreadsheets, cross-referencing bank accounts, and drafting follow-up emails.",
              stat: "15+ hrs/week",
              color: "bg-red-50 text-red-600",
            },
            {
              icon: <TrendingUp className="size-5" />,
              title: "Cash Flow Stress",
              desc: "Growth stalls when your money is stuck in accounts receivable. Payroll becomes a guessing game.",
              stat: "42 day avg DSO",
              color: "bg-amber-50 text-amber-600",
            },
            {
              icon: <Bell className="size-5" />,
              title: "Manual Follow-ups",
              desc: "The constant, uncomfortable friction of reminding clients to pay what they owe. Again and again.",
              stat: "6+ touchpoints",
              color: "bg-orange-50 text-orange-600",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-zinc-300"
            >
              <div className="flex items-center justify-between mb-5">
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl",
                    card.color
                  )}
                >
                  {card.icon}
                </div>
                <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
                  {card.stat}
                </span>
              </div>
              <h3 className="text-[15px] font-semibold text-zinc-900">
                {card.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  USE CASES                                                         */
/* ------------------------------------------------------------------ */
function UseCases() {
  const cases = [
    {
      icon: <Users className="size-5" />,
      title: "Freelancers",
      desc: "Get paid for your time with professional, automated reminders — without the awkward conversations.",
    },
    {
      icon: <Briefcase className="size-5" />,
      title: "Agencies",
      desc: "Stop chasing clients. Let DueFlow handle follow-ups while you focus on the creative work.",
    },
    {
      icon: <Globe className="size-5" />,
      title: "SaaS Companies",
      desc: "Recover failed payments and reduce involuntary churn with smart dunning campaigns.",
    },
    {
      icon: <Home className="size-5" />,
      title: "Property Managers",
      desc: "Automate rent collection reminders across hundreds of tenants effortlessly.",
    },
    {
      icon: <Building2 className="size-5" />,
      title: "Professional Services",
      desc: "Maintain premium relationships while ensuring retainers and hourly bills are settled on time.",
    },
  ];

  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionLabel>Use cases</SectionLabel>
        <h2 className="mt-4 text-center text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Built for teams that value their time
        </h2>

        <div className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <div
              key={c.title}
              className="group rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-200 hover:border-zinc-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 transition-transform duration-200 group-hover:scale-110">
                {c.icon}
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-zinc-900">
                {c.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
                {c.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  SOCIAL PROOF / METRICS                                            */
/* ------------------------------------------------------------------ */
function SocialProof() {
  return (
    <section className="border-t border-zinc-100 bg-zinc-50">
      <div className="mx-auto max-w-6xl px-6 py-24">
        {/* Metrics row */}
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            {
              value: "35%",
              label: "Reduction in DSO",
              icon: <TrendingUp className="size-5" />,
            },
            {
              value: "15+",
              label: "Hours saved per week",
              icon: <Clock className="size-5" />,
            },
            {
              value: "22%",
              label: "Higher collection rate",
              icon: <BarChart3 className="size-5" />,
            },
          ].map((m) => (
            <div
              key={m.label}
              className="flex flex-col items-center rounded-2xl border border-zinc-200 bg-white p-8 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-zinc-300"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                {m.icon}
              </div>
              <span className="mt-4 text-4xl font-bold tracking-tight text-zinc-900">
                {m.value}
              </span>
              <span className="mt-1 text-[13px] text-zinc-500">{m.label}</span>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {[
            {
              quote:
                "DueFlow completely removed the friction of asking for money. Our invoices get paid two weeks faster, and I haven't sent a manual reminder in months.",
              name: "Sarah Chen",
              role: "Founder, Pixel & Co.",
            },
            {
              quote:
                "We set up our SMS and email sequences in 20 minutes. It just runs in the background — like having a full-time AR clerk that never takes a break.",
              name: "Marcus Williams",
              role: "VP Finance, ScaleGrid",
            },
          ].map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-zinc-300"
            >
              <p className="text-[15px] leading-relaxed text-zinc-600">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-[13px] font-bold text-zinc-600">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-zinc-900">
                    {t.name}
                  </p>
                  <p className="text-[12px] text-zinc-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  PRICING (landing page summary — links to /pricing)                */
/* ------------------------------------------------------------------ */
function Pricing() {
  const tiers = [
    {
      name: "Starter",
      desc: "For freelancers and small teams automating their first invoices.",
      price: "$49",
      priceNote: "/month",
      highlights: [
        "500 invoices/month",
        "Email + SMS workflows",
        "200 SMS + 15 min voice included",
        "Basic branching (2 conditions)",
      ],
      cta: "Start 14-day free trial",
      featured: false,
    },
    {
      name: "Growth+",
      desc: "Full-featured for growing teams. The default trial plan.",
      price: "$79",
      priceNote: "/month",
      highlights: [
        "3,000 invoices/month",
        "Email + SMS + Voice + WhatsApp",
        "1,500 SMS + 90 min voice included",
        "Full branching & template library",
        "Custom branding",
      ],
      cta: "Start 14-day free trial",
      featured: true,
    },
    {
      name: "Pro",
      desc: "For finance teams needing enterprise-grade control.",
      price: "$149",
      priceNote: "/month",
      highlights: [
        "Unlimited invoices",
        "All channels + API & webhooks",
        "5,000 SMS + 200 min voice included",
        "Full white-label",
        "QuickBooks, Xero, Slack integrations",
      ],
      cta: "Start 14-day free trial",
      featured: false,
    },
  ];

  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionLabel>Pricing</SectionLabel>
        <h2 className="mt-4 text-center text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Simple pricing that pays for itself
        </h2>
        <p className="mx-auto mt-4 max-w-md text-center text-[15px] text-zinc-500">
          Start with a 14-day free trial — full Growth+ access, no card
          required.
        </p>

        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={cn(
                "relative rounded-2xl border p-7 transition-colors",
                t.featured
                  ? "border-zinc-900 bg-white shadow-sm"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              )}
            >
              {t.featured && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <span className="rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-semibold text-white">
                    Most popular
                  </span>
                </div>
              )}

              <h3 className="text-lg font-semibold text-zinc-900">
                {t.name}
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
                {t.desc}
              </p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-zinc-900">
                  {t.price}
                </span>
                <span className="text-[13px] text-zinc-400">
                  {t.priceNote}
                </span>
              </div>

              <div className="my-6 h-px bg-zinc-100" />

              <ul className="space-y-2.5">
                {t.highlights.map((h) => (
                  <li
                    key={h}
                    className="flex items-center gap-2.5 text-[13px] text-zinc-600"
                  >
                    <Check className="size-3.5 shrink-0 text-zinc-400" />
                    {h}
                  </li>
                ))}
              </ul>

              <a
                href="/sign-in"
                className={cn(
                  "group mt-7 flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-[14px] font-medium transition-all",
                  t.featured
                    ? "bg-zinc-900 text-white hover:bg-zinc-800 hover:shadow-lg hover:shadow-zinc-900/20"
                    : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300"
                )}
              >
                {t.cta}
                <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
            </div>
          ))}
        </div>

        {/* Enterprise + Full comparison link */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <p className="text-[14px] text-zinc-500">
            <span className="font-medium text-zinc-700">Enterprise</span>{" "}
            — Custom pricing from $499/mo for high-volume teams.{" "}
            <a href="/pricing" className="underline underline-offset-4 hover:text-zinc-900 transition-colors">
              Learn more
            </a>
          </p>
          <a
            href="/pricing"
            className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Compare all plans in detail
            <ArrowRight className="size-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  SECURITY                                                          */
/* ------------------------------------------------------------------ */
function Security() {
  const items = [
    {
      icon: <Lock className="size-5" />,
      title: "Secure Integrations",
      desc: "Industry-leading gateways. We route payments — never hold your funds.",
    },
    {
      icon: <Shield className="size-5" />,
      title: "Opt-Out Compliance",
      desc: "Built-in TCPA and CAN-SPAM compliance for SMS and email.",
    },
    {
      icon: <Receipt className="size-5" />,
      title: "Data Protection",
      desc: "End-to-end encryption for all financial and customer data.",
    },
    {
      icon: <Globe className="size-5" />,
      title: "US-Based Reliability",
      desc: "Hosted on secure US servers with 99.99% uptime guarantee.",
    },
  ];

  return (
    <section className="border-t border-zinc-100 bg-zinc-50">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Security &amp; compliance</SectionLabel>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Bank-grade security. Fully compliant.
        </h2>

        <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.title} className="group flex gap-3.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-transform duration-200 group-hover:scale-110">
                {item.icon}
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-zinc-900">
                  {item.title}
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FINAL CTA                                                         */
/* ------------------------------------------------------------------ */
function FinalCta() {
  return (
    <section className="py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl">
            Stop waiting on your own money
          </h2>
          <p className="mt-5 text-base text-zinc-500 sm:text-lg">
            Join thousands of businesses automating their accounts receivable
            with DueFlow.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="/sign-in"
              className="group flex items-center gap-2 rounded-full bg-zinc-900 px-7 py-3.5 text-[15px] font-medium text-white transition-all hover:bg-zinc-800 hover:shadow-2xl hover:shadow-zinc-900/25 hover:-translate-y-px active:translate-y-0"
            >
              Get started for free
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
            </a>
            <a
              href="#"
              className="group flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-7 py-3.5 text-[15px] font-medium text-zinc-700 transition-all hover:bg-zinc-50 hover:border-zinc-300 hover:-translate-y-px hover:shadow-sm active:translate-y-0"
            >
              <Play className="size-4 text-zinc-400 transition-colors group-hover:text-zinc-600" />
              Book a demo
            </a>
          </div>
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
            <a href="/pricing" className="hover:text-zinc-600 transition-colors">
              Pricing
            </a>
            <a href="#" className="hover:text-zinc-600 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-zinc-600 transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-zinc-600 transition-colors">
              Support
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
/*  SHARED                                                            */
/* ------------------------------------------------------------------ */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-center text-[12px] font-medium uppercase tracking-[0.2em] text-zinc-400">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/*  LANDING PAGE — EXPORT                                             */
/* ------------------------------------------------------------------ */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 antialiased">
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <Capabilities />
        <Problem />
        <FeaturesAccordion />
        <FeaturesGrid />
        <HowItWorks />
        <UseCases />
        <SocialProof />
        <Pricing />
        <Security />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
