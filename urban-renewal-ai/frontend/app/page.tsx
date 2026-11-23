"use client";

import { motion } from "framer-motion";
import { Activity, BrainCircuit, Database, Layers3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CausalPanel, ModelPanel, ShapPanel, ThresholdPanel, UeiCharts } from "@/components/ResearchCharts";
import { DashboardShell } from "@/components/DashboardShell";
import { ExportDock } from "@/components/ExportDock";
import { MapPanel } from "@/components/MapPanel";
import { MetricCard } from "@/components/MetricCard";
import { UploadPanel } from "@/components/UploadPanel";
import { caseCards } from "@/lib/mock-data";

export default function Home() {
  return (
    <DashboardShell>
      <div className="space-y-5">
        <Hero />
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Database} label="Panel samples" value={1000} detail="500 spatial units x before/after" />
          <MetricCard icon={Layers3} label="UEI dimensions" value={6} detail="Vitality, function, environment, perception, economy, heritage" />
          <MetricCard icon={BrainCircuit} label="XAI variables" value={32} detail="Built environment, accessibility, governance, heritage" />
          <MetricCard icon={Activity} label="Mean UEI" value={0.75} detail="Quantile classified into Low to Very High" />
        </section>
        <UploadPanel />
        <UeiCharts />
        <MapPanel />
        <ModelPanel />
        <ShapPanel />
        <ThresholdPanel />
        <CausalPanel />
        <ExportDock />
      </div>
    </DashboardShell>
  );
}

function Hero() {
  return (
    <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]" id="home">
      <Card className="relative overflow-hidden p-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <Badge>Urban computing · explainable machine learning · causal evaluation</Badge>
        <motion.h1
          className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          Urban Renewal Intelligence Lab
        </motion.h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
          Multi-source Urban Data · Explainable Machine Learning · Causal Evaluation
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {["UEI index construction", "SHAP threshold detection", "DID / PSM-DID inference"].map((item) => (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300" key={item}>{item}</div>
          ))}
        </div>
      </Card>
      <div className="grid gap-5">
        {caseCards.map((caseCard) => (
          <Card className="overflow-hidden" key={caseCard.name}>
            <div className={`mb-5 h-2 rounded-full bg-gradient-to-r ${caseCard.accent}`} />
            <p className="text-2xl font-semibold">{caseCard.name}</p>
            <p className="mt-2 text-sm text-slate-400">{caseCard.subtitle}</p>
            <div className="mt-5 flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Current UEI</p>
                <p className="text-4xl font-semibold">{caseCard.score}</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-cyan-100">Very High cluster detected</span>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
