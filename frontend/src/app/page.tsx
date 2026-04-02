import Link from "next/link";
import { ArrowRight, Search, Zap, Users, FileText, History } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Duplication Detection",
    description: "Finds overlapping work across roles using AI embeddings and LLM judgement — not just keyword matching.",
    color: "text-rose-500",
    bg: "bg-rose-50",
    border: "border-rose-100",
  },
  {
    icon: Zap,
    title: "Automation Scoring",
    description: "Re-scores every activity for automation potential regardless of what the employee self-reported.",
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  {
    icon: Users,
    title: "Resource Load Analysis",
    description: "Maps time allocation per employee and flags roles where Admin work exceeds 60% of capacity.",
    color: "text-orange-500",
    bg: "bg-orange-50",
    border: "border-orange-100",
  },
  {
    icon: FileText,
    title: "Executive Narrative",
    description: "Synthesises all three analyses into a plain-language summary with prioritised action items.",
    color: "text-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl">
      {/* Hero */}
      <div className="relative -mx-6 -mt-8 mb-12 overflow-hidden animated-gradient px-6 py-20 text-center">
        {/* Decorative grid */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

        <span className="relative inline-block rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 font-heading text-xs font-semibold text-blue-300">
          Head Office Role &amp; Activity Review
        </span>
        <h1 className="relative mt-5 font-heading text-4xl font-bold leading-tight text-white sm:text-5xl">
          Understand how your team
          <br />
          <span className="bg-gradient-to-r from-blue-300 via-violet-300 to-pink-300 bg-clip-text text-transparent">
            actually spends its time
          </span>
        </h1>
        <p className="relative mx-auto mt-5 max-w-xl text-base text-slate-400">
          Upload completed Activity Capture Templates from all head office employees.
          Four AI agents run in parallel to surface duplication, automation opportunities,
          and resource overload — in under two minutes.
        </p>
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/upload"
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-7 py-3 font-heading text-sm font-semibold text-white shadow-xl shadow-blue-600/40 hover:bg-blue-500 transition-all hover:shadow-blue-500/50 hover:-translate-y-0.5"
          >
            Analyse your data
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/history"
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-7 py-3 font-heading text-sm font-semibold text-slate-300 backdrop-blur-sm hover:bg-white/12 hover:text-white transition-all"
          >
            <History className="size-4" />
            Previous Analyses
          </Link>
          <a
            href="#how-it-works"
            className="flex min-h-[44px] items-center rounded-xl border border-white/15 bg-white/8 px-7 py-3 font-heading text-sm font-semibold text-slate-300 backdrop-blur-sm hover:bg-white/12 hover:text-white transition-all"
          >
            How it works
          </a>
        </div>
      </div>

      {/* How it works */}
      <div id="how-it-works" className="border-t border-slate-200 py-14">
        <p className="mb-8 text-center font-heading text-xs font-semibold uppercase tracking-widest text-slate-400">
          How it works
        </p>
        <ol className="grid gap-5 sm:grid-cols-3">
          {[
            { step: "01", title: "Collect files", body: "The MD distributes the Activity Capture Template. Each employee fills in their Survey sheet and returns their copy." },
            { step: "02", title: "Batch upload", body: "Upload all returned Excel files at once. The system reads only the Survey sheet from each file." },
            { step: "03", title: "AI analysis", body: "Four agents run — Duplication, Automation, Resource, Narrative — and deliver a full report in under 90 seconds." },
          ].map(({ step, title, body }) => (
            <li key={step} className="glow-card rounded-2xl border border-slate-200 bg-white p-6">
              <p className="font-heading text-3xl font-bold text-blue-600/20">{step}</p>
              <p className="mt-2 font-heading text-sm font-semibold text-slate-800">{title}</p>
              <p className="mt-1.5 text-sm text-slate-500">{body}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Feature grid */}
      <div className="border-t border-slate-200 py-14">
        <p className="mb-8 text-center font-heading text-xs font-semibold uppercase tracking-widest text-slate-400">
          What the AI analyses
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, description, color, bg, border }) => (
            <div
              key={title}
              className={`glow-card rounded-2xl border bg-white p-6 ${border}`}
            >
              <div className={`mb-3 flex size-10 items-center justify-center rounded-xl border ${bg} ${border}`}>
                <Icon className={`size-5 ${color}`} strokeWidth={1.5} />
              </div>
              <p className="font-heading text-sm font-semibold text-slate-800">{title}</p>
              <p className="mt-1.5 text-sm text-slate-500">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-slate-200 py-14 text-center">
        <h2 className="font-heading text-2xl font-bold text-slate-800">Ready to start?</h2>
        <p className="mt-2 text-sm text-slate-500">
          Upload all employee files and get your analysis in under two minutes.
        </p>
        <Link
          href="/upload"
          className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 font-heading text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 hover:-translate-y-0.5 transition-all"
        >
          Analyse your data
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
