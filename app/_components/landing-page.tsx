import {
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  CreditCard,
  FileText,
  GitBranch,
  Globe,
  Home,
  Layers,
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
  Sparkles,
  Timer,
  TrendingUp,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

/* ------------------------------------------------------------------ */
/*  HERO                                                              */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/40">
      {/* Gradient background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-150 w-225 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-75 w-100 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 sm:pt-28 lg:pt-32">
        <div className="flex flex-col items-center text-center">
          <Badge className="mb-6 gap-1.5 border-blue-500/20 bg-blue-500/10 text-blue-400">
            <Sparkles className="size-3" />
            Payment follow-up automation
          </Badge>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Turn what&apos;s due into{" "}
            <span className="bg-linear-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              paid
            </span>{" "}
            — automatically.
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            DueFlow automates your payment follow-ups with intelligent email,
            SMS, and voice reminders. Get paid faster, improve cash flow, and
            never send another awkward &ldquo;just checking in&rdquo; email.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
              Start free trial
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2">
              <Play className="size-4" />
              Book a demo
            </Button>
          </div>

          <div className="mt-12 flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:gap-8">
            <span className="flex items-center gap-2">
              <Zap className="size-4 text-blue-400" />
              Connects to your billing stack in minutes
            </span>
            <span className="flex items-center gap-2">
              <Workflow className="size-4 text-blue-400" />
              Visual workflows for email, SMS &amp; voice
            </span>
            <span className="flex items-center gap-2">
              <Code2 className="size-4 text-blue-400" />
              Zero coding required
            </span>
          </div>
        </div>

        {/* Hero visual — workflow mockup */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="rounded-xl border border-border/60 bg-card/60 p-1 shadow-2xl shadow-black/30 backdrop-blur-sm">
            <div className="rounded-lg bg-background/80 p-6">
              {/* Fake workflow UI */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                <div className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1">
                  <Workflow className="size-3" />
                  Workflow Builder
                </div>
                <span className="text-border">|</span>
                <span>Invoice Follow-up Sequence</span>
              </div>
              <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2">
                <WorkflowNode icon={<FileText className="size-4" />} label="Invoice Overdue" sublabel="Day 3" color="amber" />
                <WorkflowArrow />
                <WorkflowNode icon={<Mail className="size-4" />} label="Email Reminder" sublabel="Sent" color="blue" />
                <WorkflowArrow />
                <WorkflowNode icon={<Smartphone className="size-4" />} label="SMS Reminder" sublabel="Day 7" color="violet" />
                <WorkflowArrow />
                <WorkflowNode icon={<CheckCircle2 className="size-4" />} label="Payment Received" sublabel="Resolved" color="green" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkflowNode({
  icon,
  label,
  sublabel,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  color: "amber" | "blue" | "violet" | "green";
}) {
  const colors = {
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    violet: "border-violet-500/30 bg-violet-500/10 text-violet-400",
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  };
  return (
    <div className={`flex flex-col items-center gap-2 rounded-lg border p-4 min-w-30 ${colors[color]}`}>
      {icon}
      <span className="text-xs font-medium text-foreground">{label}</span>
      <span className="text-[10px] text-muted-foreground">{sublabel}</span>
    </div>
  );
}

function WorkflowArrow() {
  return <ChevronRight className="size-5 shrink-0 text-muted-foreground/50" />;
}

/* ------------------------------------------------------------------ */
/*  PROBLEM                                                           */
/* ------------------------------------------------------------------ */
function Problem() {
  return (
    <section className="border-b border-border/40 bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            You run a business. Not a collections agency.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Chasing late payments is the silent killer of growing businesses. Every
            ignored invoice means unpredictable cash flow, wasted hours, and
            strained client relationships.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          <ProblemCard
            icon={<Clock className="size-6" />}
            title="Lost Time"
            description="Hours spent manually tracking spreadsheets, cross-referencing bank accounts, and drafting follow-up emails."
          />
          <ProblemCard
            icon={<TrendingUp className="size-6" />}
            title="Cash Flow Stress"
            description="Growth stalls and payroll becomes stressful when your money is stuck in accounts receivable."
          />
          <ProblemCard
            icon={<Bell className="size-6" />}
            title="Manual Follow-ups"
            description="The constant, uncomfortable friction of reminding your clients to pay what they owe."
          />
        </div>
      </div>
    </section>
  );
}

function ProblemCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-border/60 bg-card/60">
      <CardContent className="p-6">
        <div className="flex size-11 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          {icon}
        </div>
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  SOLUTION — 3 STEPS                                                */
/* ------------------------------------------------------------------ */
function Solution() {
  return (
    <section className="border-b border-border/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-4 gap-1.5 border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <Zap className="size-3" />
            How it works
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Put your accounts receivable on autopilot.
          </h2>
        </div>

        <div className="mt-16 grid gap-12 sm:grid-cols-3">
          <StepCard
            step="01"
            icon={<Layers className="size-6" />}
            title="Connect your invoices"
            description="Sync DueFlow securely with your existing accounting or billing software in just a few clicks."
          />
          <StepCard
            step="02"
            icon={<Workflow className="size-6" />}
            title="Automate reminders"
            description="Build custom sequences that trigger the right message, on the right channel, at exactly the right time."
          />
          <StepCard
            step="03"
            icon={<CreditCard className="size-6" />}
            title="Get paid faster"
            description="Watch your DSO drop as payments arrive automatically with one-click payment links."
          />
        </div>
      </div>
    </section>
  );
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex size-14 items-center justify-center rounded-full border border-border bg-muted/50">
        {icon}
      </div>
      <span className="mt-4 text-xs font-bold uppercase tracking-widest text-blue-400">
        Step {step}
      </span>
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FEATURES                                                          */
/* ------------------------------------------------------------------ */
function Features() {
  const features = [
    {
      icon: <Workflow className="size-6" />,
      title: "Visual Workflow Builder",
      description: "Design your collection strategy visually.",
      bullets: [
        "Drag-and-drop interface to map out exact follow-up sequences",
        "Set custom delays and triggers without writing a single line of code",
        "Reusable templates for common collection scenarios",
      ],
      visual: "workflow",
    },
    {
      icon: <MessageSquare className="size-6" />,
      title: "Automated Email + SMS Reminders",
      description: "Reach them where they actually look.",
      bullets: [
        "Personalized, branded emails that look like they came from you",
        "High-converting SMS reminders with secure, one-click payment links",
        "Smart send-time optimization based on open rates",
      ],
      visual: "messaging",
    },
    {
      icon: <Mic className="size-6" />,
      title: "AI Voice Escalation",
      description: "Escalate intelligently when messages are ignored.",
      bullets: [
        "Professional, AI-driven voice calls for severely overdue accounts",
        "Polite, compliant, and highly effective at breaking through the noise",
        "Automatic call logging and transcript recording",
      ],
      visual: "voice",
    },
    {
      icon: <BarChart3 className="size-6" />,
      title: "Real-Time Payment Tracking",
      description: "Know exactly where your money is.",
      bullets: [
        "Live dashboards showing sent reminders, open rates, and payments",
        "Instantly see which invoices are at risk and which are resolved",
        "Export data for your accounting team in one click",
      ],
      visual: "tracking",
    },
    {
      icon: <GitBranch className="size-6" />,
      title: "Smart Branching Logic",
      description: "Adapt to your customer's actions instantly.",
      bullets: [
        "Stop all reminders the exact second an invoice is paid",
        "Route high-value clients to a softer, white-glove follow-up",
        "Create conditional paths based on payment amount or client tier",
      ],
      visual: "branching",
    },
    {
      icon: <LayoutDashboard className="size-6" />,
      title: "Detailed Reporting & Insights",
      description: "Turn cash flow into predictable data.",
      bullets: [
        "Track collection rates and average time-to-pay across customers",
        "Identify chronic late payers before they become a liability",
        "DSO trend analysis over customizable time periods",
      ],
      visual: "reporting",
    },
  ];

  return (
    <section className="border-b border-border/40 bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-4 gap-1.5 border-violet-500/20 bg-violet-500/10 text-violet-400">
            <Layers className="size-3" />
            Features
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to get paid on time.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Powerful tools that work together to automate your entire accounts
            receivable workflow.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  bullets,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  bullets: string[];
  visual: string;
}) {
  return (
    <Card className="border-border/60 bg-card/60 transition-colors hover:border-border">
      <CardContent className="p-6">
        <div className="flex size-11 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
          {icon}
        </div>
        <h3 className="mt-4 text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <ul className="mt-4 space-y-2">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  HOW IT WORKS — DETAILED TIMELINE                                  */
/* ------------------------------------------------------------------ */
function HowItWorks() {
  const steps = [
    {
      day: "Day 0",
      title: "Invoice Sent",
      description: "Invoice is generated and sent. DueFlow silently starts tracking the due date.",
      icon: <FileText className="size-5" />,
      status: "neutral" as const,
    },
    {
      day: "Day 3",
      title: "Email Reminder",
      description: "A polite, automated email reminder is sent with a direct payment link.",
      icon: <Mail className="size-5" />,
      status: "blue" as const,
    },
    {
      day: "Day 7",
      title: "SMS Escalation",
      description: "No payment detected. A friendly SMS reminder is sent directly to the client's phone.",
      icon: <Smartphone className="size-5" />,
      status: "violet" as const,
    },
    {
      day: "Day 14",
      title: "Voice Escalation",
      description: "Still unpaid. A professional AI voice call is initiated to resolve the block.",
      icon: <Phone className="size-5" />,
      status: "amber" as const,
    },
    {
      day: "Day 15",
      title: "Payment Received",
      description: "Payment arrives. DueFlow halts all future reminders and sends an automated receipt.",
      icon: <CheckCircle2 className="size-5" />,
      status: "green" as const,
    },
  ];

  const statusColors = {
    neutral: "border-border bg-muted/50 text-muted-foreground",
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    violet: "border-violet-500/30 bg-violet-500/10 text-violet-400",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  };

  return (
    <section className="border-b border-border/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-4 gap-1.5 border-blue-500/20 bg-blue-500/10 text-blue-400">
            <Timer className="size-3" />
            Detailed walkthrough
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            The anatomy of a perfect follow-up.
          </h2>
          <p className="mt-4 text-muted-foreground">
            See exactly how DueFlow handles an overdue invoice from start to finish.
          </p>
        </div>

        <div className="relative mx-auto mt-16 max-w-2xl">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border/60 sm:left-8" />

          <div className="space-y-8">
            {steps.map((s, i) => (
              <div key={s.day} className="relative flex gap-4 sm:gap-6">
                <div
                  className={`relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full border sm:size-16 ${statusColors[s.status]}`}
                >
                  {s.icon}
                </div>
                <div className="pt-2 sm:pt-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {s.day}
                  </span>
                  <h3 className="mt-1 font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {s.description}
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
/*  USE CASES                                                         */
/* ------------------------------------------------------------------ */
function UseCases() {
  const cases = [
    {
      icon: <Users className="size-5" />,
      title: "Freelancers",
      description:
        "Protect your personal cash flow. Professional, automated reminders ensure you get paid for your time without the awkwardness.",
    },
    {
      icon: <Briefcase className="size-5" />,
      title: "Agencies",
      description:
        "Stop playing bad cop with your clients. Let DueFlow handle the follow-ups while you focus on the creative work.",
    },
    {
      icon: <Globe className="size-5" />,
      title: "SaaS Companies",
      description:
        "Recover failed payments and reduce involuntary churn with smart, multi-channel dunning campaigns.",
    },
    {
      icon: <Home className="size-5" />,
      title: "Property Managers",
      description:
        "Automate rent collection reminders across hundreds of tenants without lifting a finger.",
    },
    {
      icon: <Building2 className="size-5" />,
      title: "Professional Services",
      description:
        "Maintain premium client relationships while ensuring your retainers and hourly bills are settled on time.",
    },
  ];

  return (
    <section className="border-b border-border/40 bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-4 gap-1.5 border-amber-500/20 bg-amber-500/10 text-amber-400">
            <Briefcase className="size-3" />
            Use cases
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for modern finance teams and founders.
          </h2>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <Card key={c.title} className="border-border/60 bg-card/60">
              <CardContent className="p-6">
                <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                  {c.icon}
                </div>
                <h3 className="mt-3 font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {c.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  SOCIAL PROOF                                                      */
/* ------------------------------------------------------------------ */
function SocialProof() {
  const metrics = [
    { value: "35%", label: "Reduction in DSO", icon: <TrendingUp className="size-5" /> },
    { value: "15+", label: "Hours saved per week", icon: <Clock className="size-5" /> },
    { value: "22%", label: "Higher collection rate", icon: <BarChart3 className="size-5" /> },
  ];

  const testimonials = [
    {
      quote:
        "DueFlow completely removed the friction of asking for money. Our invoices are getting paid two weeks faster, and I haven't sent a manual reminder in months.",
      name: "Sarah Chen",
      role: "Founder",
      company: "Pixel & Co.",
    },
    {
      quote:
        "The visual builder is incredible. We set up our SMS and email sequences in 20 minutes, and it just runs in the background. It's like having a full-time AR clerk.",
      name: "Marcus Williams",
      role: "VP of Finance",
      company: "ScaleGrid",
    },
  ];

  return (
    <section className="border-b border-border/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Trusted by businesses that value their time.
          </h2>
        </div>

        {/* Metrics */}
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="flex flex-col items-center rounded-xl border border-border/60 bg-card/60 p-8 text-center"
            >
              <div className="flex size-11 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                {m.icon}
              </div>
              <span className="mt-4 text-4xl font-bold tracking-tight">{m.value}</span>
              <span className="mt-1 text-sm text-muted-foreground">{m.label}</span>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {testimonials.map((t) => (
            <Card key={t.name} className="border-border/60 bg-card/60">
              <CardContent className="p-8">
                <p className="text-sm leading-relaxed text-muted-foreground italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-bold">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.role}, {t.company}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  PRICING                                                           */
/* ------------------------------------------------------------------ */
function Pricing() {
  const tiers = [
    {
      name: "Starter",
      description: "For freelancers and small teams automating their first invoices.",
      highlights: [
        "Email & SMS workflows",
        "Up to 50 invoices/month",
        "Basic analytics dashboard",
        "One-click payment links",
      ],
      cta: "Start free trial",
      featured: false,
    },
    {
      name: "Growth",
      description: "For scaling businesses with higher invoice volumes.",
      highlights: [
        "Everything in Starter",
        "Advanced branching logic",
        "AI voice escalation",
        "Custom branding",
        "Priority support",
      ],
      cta: "Start free trial",
      featured: true,
    },
    {
      name: "Pro",
      description: "For finance teams needing enterprise-grade control.",
      highlights: [
        "Everything in Growth",
        "Unlimited invoices",
        "Custom integrations & API",
        "Advanced reporting & exports",
        "Dedicated account manager",
      ],
      cta: "Contact sales",
      featured: false,
    },
  ];

  return (
    <section className="border-b border-border/40 bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-4 gap-1.5 border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <CreditCard className="size-3" />
            Pricing
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple pricing that pays for itself.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start free. Upgrade when you need more power.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {tiers.map((t) => (
            <Card
              key={t.name}
              className={`relative border-border/60 bg-card/60 ${
                t.featured ? "border-blue-500/40 shadow-lg shadow-blue-500/5" : ""
              }`}
            >
              {t.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs">
                    Most popular
                  </Badge>
                </div>
              )}
              <CardContent className="p-8">
                <h3 className="text-lg font-bold">{t.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>
                <Separator className="my-6" />
                <ul className="space-y-3">
                  {t.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                      {h}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`mt-8 w-full ${
                    t.featured
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : ""
                  }`}
                  variant={t.featured ? "default" : "outline"}
                  size="lg"
                >
                  {t.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  SECURITY & COMPLIANCE                                             */
/* ------------------------------------------------------------------ */
function Security() {
  const items = [
    {
      icon: <Lock className="size-5" />,
      title: "Secure Payment Integrations",
      description:
        "Industry-leading payment gateways. We route the payments — we never hold your funds.",
    },
    {
      icon: <Shield className="size-5" />,
      title: "Opt-Out Compliance",
      description:
        "Built-in TCPA and CAN-SPAM compliance for all SMS and email communications.",
    },
    {
      icon: <Receipt className="size-5" />,
      title: "Data Protection",
      description:
        "End-to-end encryption ensures your financial data and customer details stay confidential.",
    },
    {
      icon: <Globe className="size-5" />,
      title: "US-Focused Reliability",
      description:
        "Hosted on secure US-based servers with 99.99% uptime guarantees.",
    },
  ];

  return (
    <section className="border-b border-border/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-4 gap-1.5 border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <Shield className="size-3" />
            Security
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Bank-grade security. Fully compliant.
          </h2>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-6 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.title} className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                {item.icon}
              </div>
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {item.description}
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
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-100 w-175 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Stop waiting on your own money.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Join thousands of businesses automating their accounts receivable
            with DueFlow.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
              Start free trial
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2">
              <Play className="size-4" />
              Book a demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  NAVBAR                                                            */
/* ------------------------------------------------------------------ */
function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Zap className="size-5 text-blue-400" />
          DueFlow
        </div>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href="/sign-in">Sign in</a>
          </Button>
          <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" asChild>
            <a href="/sign-in">Start free trial</a>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  FOOTER                                                            */
/* ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer className="border-t border-border/40 bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2 font-bold">
            <Zap className="size-4 text-blue-400" />
            DueFlow
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} DueFlow, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  LANDING PAGE — COMPOSED                                           */
/* ------------------------------------------------------------------ */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <div id="features">
          <Features />
        </div>
        <div id="how-it-works">
          <HowItWorks />
        </div>
        <UseCases />
        <SocialProof />
        <div id="pricing">
          <Pricing />
        </div>
        <Security />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
