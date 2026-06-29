"use client";

import { AlertTriangle, CheckCircle2, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const requiredFields = [
  "unit_id",
  "case_name",
  "city",
  "longitude",
  "latitude",
  "treat",
  "post",
  "year",
  "update_type",
  "update_intensity",
  "poi_density",
  "green_view_index",
  "ndvi",
  "lst",
  "night_light",
  "road_density",
  "transit_accessibility",
  "cultural_facility_density",
  "commercial_density",
  "sentiment_score",
  "heritage_integrity",
  "pedestrian_accessibility"
];

export function UploadPanel() {
  const [fileNames, setFileNames] = useState<string[]>([]);
  const missingFields = useMemo(() => (fileNames.length ? [] : requiredFields.slice(0, 8)), [fileNames]);
  return (
    <Card id="data">
      <CardHeader>
        <CardTitle>Data management · field validation</CardTitle>
        <span className="rounded-full bg-violet-400/10 px-3 py-1 text-xs text-violet-100">CSV / GeoJSON</span>
      </CardHeader>
      <CardContent>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-cyan-200/25 bg-white/[0.04] p-8 text-center transition hover:bg-white/[0.07]">
          <UploadCloud className="mb-3 text-cyan-200" size={36} />
          <span className="text-lg font-semibold">Upload city_units, indicators, project ledger, and GeoJSON</span>
          <span className="mt-2 text-sm text-slate-400">Advanced validation cards keep missing fields visible without breaking the workflow.</span>
          <input
            className="hidden"
            multiple
            type="file"
            accept=".csv,.geojson,.json"
            onChange={(event) => setFileNames(Array.from(event.target.files ?? []).map((file) => file.name))}
          />
        </label>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ValidationCard label="Sample units" value={fileNames.length ? "Ready" : "1000 rows"} ok />
          <ValidationCard label="Completeness" value={fileNames.length ? "Validated locally" : "98.4% demo"} ok />
          <ValidationCard label="Time span" value="2018-2024" ok />
        </div>
        <div className="mt-5 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-amber-100">
            {missingFields.length ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span className="font-medium">{missingFields.length ? "Missing field preview" : "Required fields detected"}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(missingFields.length ? missingFields : requiredFields.slice(0, 10)).map((field) => (
              <span className="rounded-full bg-slate-950/40 px-3 py-1 text-xs text-slate-200" key={field}>{field}</span>
            ))}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button>Run preprocessing</Button>
          <Button variant="outline">Calculate UEI</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ValidationCard({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-2 flex items-center gap-2 text-sm text-slate-300">
        {ok ? <CheckCircle2 className="text-emerald-300" size={16} /> : <AlertTriangle className="text-amber-300" size={16} />}
        {label}
      </div>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
