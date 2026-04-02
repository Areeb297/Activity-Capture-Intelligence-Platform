import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Activity Analyser | Ebttikar",
  description: "Head Office Role & Activity Review — AI-powered analysis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-[#F8FAFC] text-[#1E293B] antialiased">
        {/* Dark glass header */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0f172a]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
            <div className="flex items-center gap-3">
              {/* Logo mark */}
              <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
                <span className="font-heading text-xs font-bold text-white">AA</span>
              </div>
              <Link
                href="/"
                className="font-heading text-sm font-semibold tracking-tight text-white hover:text-blue-300 transition-colors"
                aria-label="Activity Analyser home"
              >
                Activity Analyser
              </Link>
              <span className="hidden sm:block h-4 w-px bg-white/20" />
              <span className="hidden sm:block text-xs text-slate-400">Ebttikar Head Office Review</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/history"
                className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 font-heading text-xs font-semibold text-slate-300 hover:text-white hover:border-white/30 transition-colors"
              >
                <History className="size-3.5" />
                History
              </Link>
              <Link
                href="/upload"
                className="rounded-lg bg-blue-600 px-3.5 py-1.5 font-heading text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-colors"
              >
                New Analysis
              </Link>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
