import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exportUrl } from "@/lib/api";

const exports = [
  "model_metrics.csv",
  "uei_result.csv",
  "shap_importance.csv",
  "threshold_results.csv",
  "did_results.csv",
  "final_report.md"
];

export function ExportDock() {
  return (
    <Card id="report">
      <CardHeader>
        <CardTitle>Paper conclusion generator · exports</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-lg font-semibold">Automatically generated SCI-style conclusion</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            The report integrates UEI spatial distribution, key XAI drivers, threshold intervals, heterogeneity by spatial type, DID / PSM-DID evidence, and planning policy implications.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {exports.map((fileName) => (
            <a href={exportUrl(fileName)} key={fileName}>
              <Button variant="outline">
                <Download className="mr-2" size={16} />
                {fileName}
              </Button>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
