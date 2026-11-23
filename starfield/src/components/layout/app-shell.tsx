"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  Compass,
  Database,
  LayoutDashboard,
  Radar,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { APP_NAME_SHORT } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "工作台", icon: LayoutDashboard },
  { href: "/scan", label: "需求扫描", icon: Sparkles },
  { href: "/radar", label: "市场雷达", icon: Radar },
  { href: "/signals", label: "信号中心", icon: Compass },
  { href: "/search", label: "决策人搜索", icon: Search },
  { href: "/opportunities", label: "机会池", icon: Target },
  { href: "/agent", label: "成交智能体", icon: Bot },
  { href: "/actions", label: "行动中心", icon: Activity },
  { href: "/data-sources", label: "数据源", icon: Database },
];

const MOBILE = [
  { href: "/", label: "工作台", icon: LayoutDashboard },
  { href: "/radar", label: "雷达", icon: Radar },
  { href: "/signals", label: "信号", icon: Compass },
  { href: "/opportunities", label: "机会", icon: Target },
  { href: "/agent", label: "智能体", icon: Bot },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-dvh star-grid">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[232px] flex-col border-r border-white/10 bg-[#07182c]/90 backdrop-blur-md p-4">
        <div className="mb-6 px-2">
          <div className="text-xs tracking-[0.22em] text-cyan">STARFIELD</div>
          <div className="mt-1 text-lg font-semibold leading-tight">{APP_NAME_SHORT}</div>
          <div className="text-xs text-muted mt-1">市场需求 × 成交智能体</div>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const on = active(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-[14px] px-3 text-sm transition",
                  on
                    ? "bg-primary/15 text-foreground border border-primary/30"
                    : "text-muted hover:text-foreground hover:bg-white/5",
                )}
              >
                <Icon className={cn("size-4", on && "text-cyan")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="rounded-[14px] border border-cyan/20 bg-cyan/5 p-3 text-xs text-muted">
          演示数据已标记。Apollo / 大模型密钥仅存在服务端。
        </div>
      </aside>

      <div className="lg:pl-[232px]">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-[#061426]/80 px-4 py-3 backdrop-blur-md lg:hidden">
          <div>
            <div className="text-[10px] tracking-[0.2em] text-cyan">STARFIELD</div>
            <div className="text-sm font-semibold">{APP_NAME_SHORT}</div>
          </div>
          <Link
            href="/scan"
            className="min-h-11 rounded-[14px] bg-primary px-3 text-sm flex items-center"
          >
            扫描
          </Link>
        </header>
        <main className="px-4 py-4 pb-24 lg:px-8 lg:py-6 lg:pb-8">{children}</main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-[#07182c]/95 backdrop-blur-md safe-bottom">
        <div className="grid grid-cols-5">
          {MOBILE.map((item) => {
            const Icon = item.icon;
            const on = active(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px]",
                  on ? "text-cyan" : "text-muted",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  extra,
}: {
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {extra}
    </div>
  );
}

export function DemoTag({ show = true }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span className="ml-2 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] text-warning">
      演示数据
    </span>
  );
}
