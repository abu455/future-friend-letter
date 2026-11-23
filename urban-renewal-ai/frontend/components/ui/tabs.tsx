"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type TabsProps = {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
  children: ReactNode;
};

export function Tabs({ tabs, active, onChange, children }: TabsProps) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 rounded-2xl bg-white/5 p-1">
        {tabs.map((tab) => (
          <button
            className={cn(
              "rounded-xl px-4 py-2 text-sm text-slate-300 transition",
              active === tab && "bg-white/15 text-white shadow-glow"
            )}
            key={tab}
            onClick={() => onChange(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
