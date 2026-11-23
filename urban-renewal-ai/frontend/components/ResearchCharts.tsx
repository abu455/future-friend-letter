"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { balanceData, dimensionData, eventStudy, heatmapData, modelMetrics, shapImportance, thresholdCards } from "@/lib/mock-data";

export function UeiCharts() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]" id="uei">
      <Card>
        <CardHeader>
          <CardTitle>Six-dimension UEI radar</CardTitle>
        </CardHeader>
        <ChartCanvas className="h-80">
            <RadarChart data={dimensionData}>
              <PolarGrid stroke="rgba(148,163,184,.25)" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
              <Radar dataKey="Shanghai" stroke="#4fd1ff" fill="#4fd1ff" fillOpacity={0.28} />
              <Radar dataKey="Quzhou" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.24} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
        </ChartCanvas>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Case effectiveness comparison</CardTitle>
        </CardHeader>
        <ChartCanvas className="h-80">
            <BarChart data={dimensionData}>
              <CartesianGrid stroke="rgba(148,163,184,.14)" vertical={false} />
              <XAxis dataKey="dimension" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" domain={[0, 1]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="Shanghai" fill="#4fd1ff" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Quzhou" fill="#9f7aea" radius={[8, 8, 0, 0]} />
            </BarChart>
        </ChartCanvas>
      </Card>
    </div>
  );
}

export function ModelPanel() {
  return (
    <Card id="models">
      <CardHeader>
        <CardTitle>Model performance · best model auto-selection</CardTitle>
        <span className="text-sm text-cyan-100">Best: XGBoostRegressor</span>
      </CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-[1fr_.9fr]">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/10 text-slate-300">
              <tr>
                {["Model", "R2", "RMSE", "MAE", "MAPE"].map((header) => <th className="p-3" key={header}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {modelMetrics.map((row) => (
                <tr className="border-t border-white/10" key={row.model}>
                  <td className="p-3 text-cyan-100">{row.model}</td>
                  <td className="p-3">{row.r2}</td>
                  <td className="p-3">{row.rmse}</td>
                  <td className="p-3">{row.mae}</td>
                  <td className="p-3">{row.mape}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ChartCanvas className="h-72">
            <BarChart data={modelMetrics}>
              <CartesianGrid stroke="rgba(148,163,184,.14)" vertical={false} />
              <XAxis dataKey="model" stroke="#94a3b8" tick={{ fontSize: 10 }} />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="r2" radius={[8, 8, 0, 0]}>
                {modelMetrics.map((_, index) => <Cell fill={index === 2 ? "#4fd1ff" : "#8b5cf6"} key={index} />)}
              </Bar>
            </BarChart>
        </ChartCanvas>
      </CardContent>
    </Card>
  );
}

export function ShapPanel() {
  return (
    <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]" id="shap">
      <Card>
        <CardHeader>
          <CardTitle>Global SHAP importance</CardTitle>
        </CardHeader>
        <ChartCanvas className="h-96">
            <BarChart data={shapImportance} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid stroke="rgba(148,163,184,.14)" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" />
              <YAxis type="category" dataKey="feature_name" width={150} stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="mean_abs_shap" fill="#4fd1ff" radius={[0, 8, 8, 0]} />
            </BarChart>
        </ChartCanvas>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>SHAP interaction heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {heatmapData.map(([a, b, value]) => (
              <div className="grid grid-cols-[1fr_1fr_90px] items-center gap-3 rounded-2xl bg-white/[0.04] p-3" key={`${a}-${b}`}>
                <span className="text-sm text-slate-300">{a}</span>
                <span className="text-sm text-slate-300">{b}</span>
                <span className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-3 py-2 text-center text-sm font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ThresholdPanel() {
  const curve = Array.from({ length: 30 }, (_, index) => {
    const x = index / 29;
    return { x: Number(x.toFixed(2)), shap: Number((Math.tanh((x - 0.42) * 5) * 0.08 - Math.max(0, x - 0.78) * 0.12).toFixed(3)) };
  });
  return (
    <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]" id="threshold">
      <Card>
        <CardHeader>
          <CardTitle>Threshold cards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {thresholdCards.map((item) => (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4" key={item.feature_name}>
              <p className="font-semibold text-cyan-100">{item.feature_name}</p>
              <p className="mt-1 text-sm text-slate-400">{item.interpretation}</p>
              <p className="mt-3 text-xs text-violet-100">Range: {item.threshold_low} - {item.threshold_high} · {item.effect_type}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Dependence curve · waterfront_accessibility</CardTitle>
        </CardHeader>
        <ChartCanvas className="h-80">
            <LineChart data={curve}>
              <CartesianGrid stroke="rgba(148,163,184,.14)" />
              <XAxis dataKey="x" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="shap" stroke="#4fd1ff" strokeWidth={3} dot={false} />
            </LineChart>
        </ChartCanvas>
      </Card>
    </div>
  );
}

export function CausalPanel() {
  return (
    <div className="grid gap-5 lg:grid-cols-2" id="causal">
      <Card>
        <CardHeader>
          <CardTitle>DID dynamic effects</CardTitle>
          <span className="text-sm text-emerald-100">Treat x Post = 0.126 · p &lt; 0.01</span>
        </CardHeader>
        <ChartCanvas className="h-80">
            <LineChart data={eventStudy}>
              <CartesianGrid stroke="rgba(148,163,184,.14)" />
              <XAxis dataKey="event_time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="coefficient" stroke="#9f7aea" strokeWidth={3} />
            </LineChart>
        </ChartCanvas>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>PSM balance before / after</CardTitle>
        </CardHeader>
        <ChartCanvas className="h-80">
            <BarChart data={balanceData}>
              <CartesianGrid stroke="rgba(148,163,184,.14)" vertical={false} />
              <XAxis dataKey="covariate" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="smd_before" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              <Bar dataKey="smd_after" fill="#4fd1ff" radius={[8, 8, 0, 0]} />
            </BarChart>
        </ChartCanvas>
      </Card>
    </div>
  );
}

const tooltipStyle = {
  background: "rgba(15, 23, 42, .92)",
  border: "1px solid rgba(148,163,184,.2)",
  borderRadius: 16,
  color: "#e2e8f0"
};

function ChartCanvas({ children, className }: { children: ReactNode; className: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <CardContent className={className}>
      {mounted ? (
        <ResponsiveContainer>{children}</ResponsiveContainer>
      ) : (
        <div className="grid h-full place-items-center rounded-2xl bg-white/[0.04] text-sm text-slate-500">Rendering chart...</div>
      )}
    </CardContent>
  );
}
