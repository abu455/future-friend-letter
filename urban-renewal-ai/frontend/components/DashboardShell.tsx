"use client";

import { motion } from "framer-motion";
import { BarChart3, BrainCircuit, Database, FileText, Gauge, GitBranch, Home, Map, Network, Workflow } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  ["Home", Home],
  ["Data", Database],
  ["UEI", Gauge],
  ["Map", Map],
  ["Models", BarChart3],
  ["SHAP", BrainCircuit],
  ["Threshold", Workflow],
  ["Causal", GitBranch],
  ["Report", FileText],
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-aurora text-slate-100">
      <div className="fixed inset-0 -z-10 opacity-70">
        <div className="absolute left-1/3 top-16 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-24 right-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      </div>
      <aside className="fixed left-4 top-4 z-20 hidden h-[calc(100vh-2rem)] w-64 rounded-[2rem] border border-white/10 bg-slate-950/55 p-4 backdrop-blur-2xl xl:block">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500">
            <Network size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold">Urban Renewal</p>
            <p className="text-xs text-slate-400">AI Lab Platform</p>
          </div>
        </div>
        <nav className="space-y-2">
          {nav.map(([label, Icon]) => (
            <a className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white" href={`#${label.toLowerCase()}`} key={label}>
              <Icon size={18} />
              {label}
            </a>
          ))}
        </nav>
      </aside>
      <section className="mx-auto max-w-[1500px] px-4 py-4 xl:pl-72">
        <TopNav />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          {children}
        </motion.div>
      </section>
    </main>
  );
}

function TopNav() {
  return (
    <header className="sticky top-3 z-10 mb-5 flex items-center justify-between rounded-3xl border border-white/10 bg-slate-950/45 px-5 py-3 backdrop-blur-xl">
      <div>
        <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/80">SCI empirical platform</p>
        <p className="text-sm text-slate-400">Multi-source data · XAI · Thresholds · DID / PSM-DID</p>
      </div>
      <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">MVP Ready</div>
    </header>
  );
}
