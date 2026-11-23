"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => <div className="grid h-[420px] place-items-center rounded-3xl bg-white/[0.04] text-slate-400">Loading spatial layers...</div>
});

export function MapPanel() {
  return (
    <Card id="map">
      <CardHeader>
        <CardTitle>Spatial map · UEI and local SHAP layers</CardTitle>
        <div className="flex gap-2 text-xs text-slate-300">
          {["UEI", "Vitality", "Environment", "Heritage", "SHAP"].map((layer) => (
            <span className="rounded-full bg-white/10 px-3 py-1" key={layer}>{layer}</span>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <LeafletMap />
      </CardContent>
    </Card>
  );
}
