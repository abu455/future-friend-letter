"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Bot,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Cloud,
  Database,
  ExternalLink,
  Filter,
  Gauge,
  Grid2X2,
  Inbox,
  LayoutDashboard,
  List,
  Loader2,
  Menu,
  MoreHorizontal,
  Network,
  PanelLeftClose,
  Play,
  Plus,
  Radar,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Signal,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  UserRoundSearch,
  Users,
  WandSparkles,
  WifiOff,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MarketTrend } from "@/components/market-trend";
import { OpportunityAgent } from "@/components/opportunity-agent";
import { RadarVisual } from "@/components/radar-visual";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, idempotencyKey } from "@/lib/client-api";
import {
  STAGE_LABELS,
  type Company,
  type Contact,
  type DataSource,
  type FollowUpTask,
  type MarketSignal,
  type Opportunity,
  type OpportunityStage,
  type ScanCriteria,
  type ScanJob,
} from "@/lib/domain";
import { cn } from "@/lib/utils";

type ViewId =
  | "overview"
  | "radar"
  | "signals"
  | "people"
  | "opportunities"
  | "actions"
  | "sources";

const NAV_ITEMS: {
  id: ViewId;
  label: string;
  mobileLabel?: string;
  icon: typeof Radar;
}[] = [
  { id: "overview", label: "总览工作台", mobileLabel: "总览", icon: LayoutDashboard },
  { id: "radar", label: "需求扫描", mobileLabel: "雷达", icon: Radar },
  { id: "signals", label: "市场信号", mobileLabel: "信号", icon: Signal },
  { id: "people", label: "企业与决策人", icon: UserRoundSearch },
  {
    id: "opportunities",
    label: "机会池",
    mobileLabel: "机会",
    icon: Target,
  },
  { id: "actions", label: "行动中心", mobileLabel: "行动", icon: Zap },
  { id: "sources", label: "数据源中心", icon: Database },
];

const MOBILE_NAV = ["overview", "radar", "signals", "opportunities", "actions"];

type AppData = {
  signals: MarketSignal[];
  companies: Company[];
  contacts: Contact[];
  opportunities: Opportunity[];
  tasks: FollowUpTask[];
  dataSources: DataSource[];
};

const emptyData: AppData = {
  signals: [],
  companies: [],
  contacts: [],
  opportunities: [],
  tasks: [],
  dataSources: [],
};

export function RadarApp() {
  const [view, setView] = useState<ViewId>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [data, setData] = useState<AppData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedSignal, setSelectedSignal] = useState<MarketSignal>();
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity>();
  const [agentOpen, setAgentOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [signals, companies, contacts, opportunities, tasks, dataSources] =
        await Promise.all([
          apiRequest<MarketSignal[]>("/api/signals"),
          apiRequest<Company[]>("/api/companies"),
          apiRequest<Contact[]>("/api/contacts"),
          apiRequest<Opportunity[]>("/api/opportunities"),
          apiRequest<FollowUpTask[]>("/api/tasks"),
          apiRequest<DataSource[]>("/api/data-sources"),
        ]);
      setData({
        signals: signals.data,
        companies: companies.data,
        contacts: contacts.data,
        opportunities: opportunities.data,
        tasks: tasks.data,
        dataSources: dataSources.data,
      });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  function navigate(next: ViewId) {
    setView(next);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateOpportunityLocal(opportunity: Opportunity) {
    setData((current) => ({
      ...current,
      opportunities: current.opportunities.map((item) =>
        item.id === opportunity.id ? opportunity : item,
      ),
    }));
    setSelectedOpportunity(opportunity);
  }

  function openAgent(opportunity: Opportunity) {
    setSelectedOpportunity(opportunity);
    setAgentOpen(true);
  }

  const activeNav = NAV_ITEMS.find((item) => item.id === view)!;

  return (
    <div className="min-h-dvh bg-transparent text-[#F2F7FF]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-white/[0.07] bg-[#07182B]/95 backdrop-blur-xl transition-[width] duration-300 lg:flex lg:flex-col",
          sidebarCollapsed ? "w-[82px]" : "w-[248px]",
        )}
      >
        <div className="flex h-[76px] items-center border-b border-white/[0.06] px-5">
          <button
            type="button"
            onClick={() => navigate("overview")}
            className="flex min-h-11 min-w-0 items-center gap-3 text-left"
          >
            <span className="relative grid size-10 shrink-0 place-items-center rounded-2xl border border-[#2F9BFF]/25 bg-[#1677FF]/15 shadow-[0_0_24px_rgba(22,119,255,.16)]">
              <Radar className="size-5 text-[#3DDCFF]" />
              <i className="absolute right-1 top-1 size-1.5 rounded-full bg-[#38D996] shadow-[0_0_8px_#38D996]" />
            </span>
            {!sidebarCollapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold tracking-wide">
                  星域需求雷达
                </span>
                <span className="mt-0.5 block text-[10px] uppercase tracking-[0.16em] text-[#5E7E9F]">
                  Demand Intelligence
                </span>
              </span>
            )}
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                type="button"
                key={item.id}
                title={sidebarCollapsed ? item.label : undefined}
                onClick={() => navigate(item.id)}
                className={cn(
                  "relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm transition active:scale-[0.98]",
                  active
                    ? "bg-[#1677FF]/14 text-white"
                    : "text-[#86A3C3] hover:bg-white/[0.04] hover:text-white",
                  sidebarCollapsed && "justify-center px-0",
                )}
              >
                {active && (
                  <motion.i
                    layoutId="active-nav"
                    className="absolute -left-3 h-6 w-0.5 rounded-full bg-[#3DDCFF] shadow-[0_0_10px_#3DDCFF]"
                  />
                )}
                <Icon
                  className={cn(
                    "size-[18px] shrink-0",
                    active && "text-[#62C5FF]",
                  )}
                />
                {!sidebarCollapsed && item.label}
                {!sidebarCollapsed && item.id === "actions" && (
                  <Badge className="ml-auto h-5 min-w-5 justify-center bg-[#FF647C]/15 px-1 text-[10px] text-[#FF8C9D]">
                    {data.tasks.filter((task) => task.status === "PENDING").length}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-white/[0.06] p-3">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((value) => !value)}
            className={cn(
              "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-xs text-[#6E8BAA] transition hover:bg-white/[0.04] hover:text-white",
              sidebarCollapsed && "justify-center px-0",
            )}
          >
            <PanelLeftClose
              className={cn(
                "size-4 transition-transform",
                sidebarCollapsed && "rotate-180",
              )}
            />
            {!sidebarCollapsed && "收起导航"}
          </button>
          <div
            className={cn(
              "mt-2 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-2.5",
              sidebarCollapsed && "justify-center border-0 bg-transparent",
            )}
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-[#1677FF]/20 text-xs text-[#8CCBFF]">
                林晓
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">林晓</p>
                  <p className="truncate text-[10px] text-[#5E7E9F]">
                    星域科技 · 演示空间
                  </p>
                </div>
                <MoreHorizontal className="size-4 text-[#5E7E9F]" />
              </>
            )}
          </div>
        </div>
      </aside>

      <div
        className={cn(
          "min-h-dvh transition-[padding] duration-300 lg:pl-[248px]",
          sidebarCollapsed && "lg:pl-[82px]",
        )}
      >
        <header className="sticky top-0 z-30 flex h-[64px] items-center border-b border-white/[0.07] bg-[#061426]/88 px-4 backdrop-blur-xl sm:px-6 lg:h-[76px] lg:px-8">
          <button
            type="button"
            onClick={() => setMobileMenu(true)}
            className="grid size-11 place-items-center rounded-xl text-[#86A3C3] hover:bg-white/5 lg:hidden"
            aria-label="打开导航"
          >
            <Menu className="size-5" />
          </button>
          <div className="ml-2 min-w-0 lg:ml-0">
            <p className="truncate text-sm font-semibold sm:text-base">
              {activeNav.label}
            </p>
            <p className="mt-0.5 hidden text-[10px] text-[#5E7E9F] sm:block">
              市场需求雷达 × AI 成交智能体
            </p>
          </div>
          <Badge
            variant="outline"
            className="ml-3 border-[#FFB547]/20 bg-[#FFB547]/[0.08] text-[10px] text-[#FFD08A]"
          >
            演示数据
          </Badge>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-11 text-[#86A3C3] hover:bg-white/5"
              aria-label="通知"
              onClick={() => {
                navigate("actions");
                toast.info("已打开待处理行动");
              }}
            >
              <Bell />
            </Button>
            <Button
              onClick={() => navigate("radar")}
              className="hidden h-10 bg-[#1677FF] shadow-[0_0_20px_rgba(22,119,255,.18)] sm:flex"
            >
              <Plus />
              快速创建需求
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-10">
          {loading ? (
            <AppLoading />
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={loadData} />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                {view === "overview" && (
                  <Overview
                    data={data}
                    navigate={navigate}
                    onSignal={setSelectedSignal}
                    onAgent={openAgent}
                  />
                )}
                {view === "radar" && (
                  <ScannerView
                    signals={data.signals}
                    onSignal={setSelectedSignal}
                    onComplete={() => {
                      toast.success("市场扫描完成，发现 6 条演示需求信号");
                      void loadData();
                    }}
                  />
                )}
                {view === "signals" && (
                  <SignalsView
                    signals={data.signals}
                    onSignal={setSelectedSignal}
                    onNavigate={navigate}
                    onOpportunity={(opportunity) =>
                      setData((current) => ({
                        ...current,
                        opportunities: [
                          opportunity,
                          ...current.opportunities.filter(
                            (item) => item.id !== opportunity.id,
                          ),
                        ],
                      }))
                    }
                  />
                )}
                {view === "people" && (
                  <PeopleView
                    contacts={data.contacts}
                    companies={data.companies}
                    opportunities={data.opportunities}
                    onOpportunityUpdated={updateOpportunityLocal}
                    onAgent={openAgent}
                  />
                )}
                {view === "opportunities" && (
                  <OpportunitiesView
                    opportunities={data.opportunities}
                    onUpdated={updateOpportunityLocal}
                    onAgent={openAgent}
                  />
                )}
                {view === "actions" && (
                  <ActionsView
                    tasks={data.tasks}
                    opportunities={data.opportunities}
                    onTasksChange={(tasks) =>
                      setData((current) => ({ ...current, tasks }))
                    }
                    onOpportunity={(opportunity) => {
                      setSelectedOpportunity(opportunity);
                      navigate("opportunities");
                    }}
                    onAgent={openAgent}
                  />
                )}
                {view === "sources" && (
                  <SourcesView
                    sources={data.dataSources}
                    onChange={(sources) =>
                      setData((current) => ({ ...current, dataSources: sources }))
                    }
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/[0.08] bg-[#07182B]/95 px-1 pt-1.5 backdrop-blur-xl lg:hidden">
        {NAV_ITEMS.filter((item) => MOBILE_NAV.includes(item.id)).map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => navigate(item.id)}
              className={cn(
                "relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] transition active:scale-95",
                active ? "text-[#62C5FF]" : "text-[#6E8BAA]",
              )}
            >
              {active && (
                <motion.span
                  layoutId="mobile-active"
                  className="absolute inset-x-3 top-0 h-px bg-[#3DDCFF] shadow-[0_0_8px_#3DDCFF]"
                />
              )}
              <Icon className="size-[19px]" />
              {item.mobileLabel}
            </button>
          );
        })}
      </nav>

      <Sheet open={mobileMenu} onOpenChange={setMobileMenu}>
        <SheetContent
          side="left"
          className="w-[86vw] border-r-white/10 bg-[#07182B] p-4 sm:max-w-sm"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>系统导航</SheetTitle>
            <SheetDescription>选择功能页面</SheetDescription>
          </SheetHeader>
          <div className="mb-7 flex items-center gap-3 pt-3">
            <span className="grid size-10 place-items-center rounded-2xl border border-[#2F9BFF]/25 bg-[#1677FF]/15">
              <Radar className="size-5 text-[#3DDCFF]" />
            </span>
            <div>
              <p className="text-sm font-semibold">星域需求雷达</p>
              <p className="text-[10px] text-[#5E7E9F]">演示工作空间</p>
            </div>
          </div>
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={cn(
                    "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm",
                    view === item.id
                      ? "bg-[#1677FF]/15 text-white"
                      : "text-[#86A3C3]",
                  )}
                >
                  <Icon className="size-5" />
                  {item.label}
                  <ChevronRight className="ml-auto size-4" />
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <SignalDetail
        signal={selectedSignal}
        open={Boolean(selectedSignal)}
        onOpenChange={(open) => !open && setSelectedSignal(undefined)}
        onOpportunity={(opportunity) => {
          setData((current) => ({
            ...current,
            opportunities: [
              opportunity,
              ...current.opportunities.filter(
                (item) => item.id !== opportunity.id,
              ),
            ],
          }));
          setSelectedSignal(undefined);
          navigate("opportunities");
        }}
        onPeople={() => {
          setSelectedSignal(undefined);
          navigate("people");
        }}
      />

      <OpportunityAgent
        opportunity={selectedOpportunity}
        open={agentOpen}
        onOpenChange={setAgentOpen}
        onOpportunityUpdated={updateOpportunityLocal}
      />
    </div>
  );
}

function Overview({
  data,
  navigate,
  onSignal,
  onAgent,
}: {
  data: AppData;
  navigate: (view: ViewId) => void;
  onSignal: (signal: MarketSignal) => void;
  onAgent: (opportunity: Opportunity) => void;
}) {
  const pending = data.tasks.filter((task) => task.status === "PENDING").length;
  const amount = data.opportunities.reduce(
    (sum, item) => sum + item.estimatedAmount,
    0,
  );
  const averageProbability = Math.round(
    data.opportunities.reduce((sum, item) => sum + item.probability, 0) /
      Math.max(1, data.opportunities.length),
  );
  const stats = [
    {
      label: "今日新增需求",
      value: "24",
      suffix: "条",
      change: "+18.2%",
      icon: Signal,
      color: "#3DDCFF",
      view: "signals" as ViewId,
    },
    {
      label: "高潜机会",
      value: data.opportunities.filter((item) => item.score >= 85).length,
      suffix: "个",
      change: "+3",
      icon: Target,
      color: "#38D996",
      view: "opportunities" as ViewId,
    },
    {
      label: "Apollo 目标客户",
      value: data.contacts.length,
      suffix: "人",
      change: "待扩充",
      icon: Users,
      color: "#2F9BFF",
      view: "people" as ViewId,
    },
    {
      label: "预计机会金额",
      value: `¥${(amount / 10000).toFixed(0)}`,
      suffix: "万",
      change: "+12.6%",
      icon: CircleDollarSign,
      color: "#FFB547",
      view: "opportunities" as ViewId,
    },
    {
      label: "平均成交概率",
      value: averageProbability,
      suffix: "%",
      change: "+4.1%",
      icon: Gauge,
      color: "#A88BFF",
      view: "opportunities" as ViewId,
    },
    {
      label: "待处理行动",
      value: pending,
      suffix: "项",
      change: "2项紧急",
      icon: CalendarClock,
      color: "#FF647C",
      view: "actions" as ViewId,
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-[#6E8BAA]">2026年8月31日 · 星期一</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
            早上好，林晓
          </h1>
          <p className="mt-1 text-xs text-[#86A3C3] sm:text-sm">
            雷达发现 2 个高潜信号，今天有 {pending} 项行动待处理。
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant="outline"
            onClick={() => navigate("radar")}
            className="h-11 flex-1 border-white/10 bg-white/[0.03] sm:flex-none"
          >
            <Plus />
            创建需求
          </Button>
          <Button
            onClick={() => navigate("radar")}
            className="h-11 flex-1 bg-[#1677FF] shadow-[0_0_22px_rgba(22,119,255,.2)] sm:flex-none"
          >
            <Play />
            启动扫描
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              key={stat.label}
              onClick={() => navigate(stat.view)}
              className="glass-card group min-h-[132px] rounded-2xl border border-white/[0.07] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#2F9BFF]/25 active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <span
                  className="grid size-8 place-items-center rounded-xl"
                  style={{
                    color: stat.color,
                    backgroundColor: `${stat.color}15`,
                  }}
                >
                  <Icon className="size-4" />
                </span>
                <ArrowRight className="size-3.5 text-[#466583] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
              <p className="mt-3 text-[11px] text-[#86A3C3]">{stat.label}</p>
              <div className="mt-1 flex items-end gap-1">
                <span className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {stat.value}
                </span>
                <span className="mb-0.5 text-[10px] text-[#6E8BAA]">
                  {stat.suffix}
                </span>
              </div>
              <p className="mt-2 text-[10px]" style={{ color: stat.color }}>
                {stat.change}
              </p>
            </motion.button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.07fr_.93fr]">
        <section className="glass-card blue-glow rounded-2xl border border-white/[0.07] p-4 sm:p-5">
          <SectionTitle
            eyebrow="MARKET RADAR"
            title="市场需求雷达"
            action="打开雷达中心"
            onAction={() => navigate("radar")}
          />
          <RadarVisual
            compact
            signals={data.signals}
            onSelect={onSignal}
            onRescan={() => toast.info("雷达已重新校准")}
          />
        </section>
        <section className="glass-card rounded-2xl border border-white/[0.07] p-4 sm:p-5">
          <MarketTrend
            onExplore={() => {
              navigate("signals");
              toast.info("已按趋势行业打开需求信号");
            }}
          />
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <section className="glass-card rounded-2xl border border-white/[0.07] p-4 sm:p-5">
          <SectionTitle
            eyebrow="TOP OPPORTUNITIES"
            title="高潜机会排行榜"
            action="查看全部"
            onAction={() => navigate("opportunities")}
          />
          <div className="mt-4 space-y-2">
            {[...data.opportunities]
              .sort((a, b) => b.score - a.score)
              .slice(0, 4)
              .map((opportunity, index) => (
                <button
                  type="button"
                  key={opportunity.id}
                  onClick={() => onAgent(opportunity)}
                  className="group flex min-h-[72px] w-full items-center gap-3 rounded-xl border border-transparent px-2 text-left transition hover:border-white/[0.07] hover:bg-white/[0.025]"
                >
                  <span className="w-5 font-mono text-xs text-[#5E7E9F]">
                    0{index + 1}
                  </span>
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl text-xs font-semibold",
                      index === 0
                        ? "bg-[#38D996]/12 text-[#38D996]"
                        : "bg-[#1677FF]/12 text-[#72C8FF]",
                    )}
                  >
                    {opportunity.score}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white sm:text-sm">
                      {opportunity.name}
                    </p>
                    <p className="mt-1 truncate text-[10px] text-[#6E8BAA] sm:text-xs">
                      {opportunity.companyName} · {STAGE_LABELS[opportunity.stage]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">
                      ¥{(opportunity.estimatedAmount / 10000).toFixed(0)}万
                    </p>
                    <p className="mt-1 text-[10px] text-[#38D996]">
                      {opportunity.probability}% 成交
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-[#466583] transition group-hover:translate-x-0.5" />
                </button>
              ))}
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <section className="rounded-2xl border border-[#1677FF]/18 bg-[#0B2440] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.03)]">
            <div className="flex items-center gap-2 text-xs text-[#72C8FF]">
              <Sparkles className="size-4" />
              今日 AI 建议
            </div>
            <p className="mt-3 text-sm font-medium leading-6 text-white">
              Aurora 的需求强度上升，但技术评估人尚未覆盖。
            </p>
            <p className="mt-2 text-xs leading-5 text-[#86A3C3]">
              建议先发送材料利用率测算表，再邀请生产与工艺角色共同参加需求诊断。
            </p>
            <Button
              variant="ghost"
              className="mt-3 h-10 px-0 text-xs text-[#72C8FF]"
              onClick={() => data.opportunities[0] && onAgent(data.opportunities[0])}
            >
              让智能体制定方案 <ArrowRight />
            </Button>
          </section>
          <section className="rounded-2xl border border-[#FF647C]/12 bg-[#FF647C]/[0.045] p-5">
            <div className="flex items-center gap-2 text-xs text-[#FF8C9D]">
              <AlertCircle className="size-4" />
              风险机会提醒
            </div>
            <p className="mt-3 text-sm font-medium">2 个机会超过 7 天未推进</p>
            <p className="mt-2 text-xs leading-5 text-[#86A3C3]">
              其中 IberBag 尚未确认预算与关键决策人，停滞风险较高。
            </p>
            <Button
              variant="ghost"
              className="mt-3 h-10 px-0 text-xs text-[#FF8C9D]"
              onClick={() => navigate("actions")}
            >
              查看风险行动 <ArrowRight />
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}

const SCAN_STEPS = [
  "正在理解需求",
  "正在生成 ICP",
  "正在扫描市场信号",
  "正在搜索目标企业",
  "正在匹配决策人",
  "正在计算机会分",
  "扫描完成",
];

function ScannerView({
  signals,
  onSignal,
  onComplete,
}: {
  signals: MarketSignal[];
  onSignal: (signal: MarketSignal) => void;
  onComplete: () => void;
}) {
  const [query, setQuery] = useState(
    "寻找德国100—500人的汽车内饰工厂，重点寻找采购总监、生产总监或工厂负责人，客户可能有柔性材料裁切自动化升级需求。",
  );
  const [criteria, setCriteria] = useState<ScanCriteria>();
  const [parsing, setParsing] = useState(false);
  const [job, setJob] = useState<ScanJob>();
  const [starting, setStarting] = useState(false);
  const [industry, setIndustry] = useState("all");
  const [region, setRegion] = useState("all");
  const [level, setLevel] = useState("all");

  const filteredSignals = signals.filter(
    (signal) =>
      (industry === "all" || signal.industry === industry) &&
      (region === "all" || signal.region.includes(region)) &&
      (level === "all" || signal.level === level),
  );

  const parse = useCallback(async () => {
    setParsing(true);
    try {
      const response = await apiRequest<{
        criteria: ScanCriteria;
        mode: string;
      }>("/api/radar/parse", {
        method: "POST",
        body: JSON.stringify({ query }),
      });
      setCriteria(response.data.criteria);
      toast.success("AI 已拆解市场扫描条件");
      return response.data.criteria;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "需求解析失败");
    } finally {
      setParsing(false);
    }
  }, [query]);

  async function startScan() {
    setStarting(true);
    try {
      const parsed = criteria ?? (await parse());
      if (!parsed) return;
      const response = await apiRequest<ScanJob>("/api/radar/scan", {
        method: "POST",
        body: JSON.stringify({
          query,
          criteria: parsed,
          idempotencyKey: idempotencyKey("scan"),
        }),
      });
      setJob(response.data);
      toast.info("扫描任务已启动");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "扫描启动失败");
    } finally {
      setStarting(false);
    }
  }

  const jobId = job?.id;
  const jobStatus = job?.status;
  useEffect(() => {
    if (!jobId || jobStatus !== "RUNNING") return;
    const timer = window.setInterval(async () => {
      try {
        const response = await apiRequest<ScanJob | null>(
          `/api/radar/status?jobId=${jobId}`,
        );
        if (!response.data) return;
        setJob(response.data);
        if (response.data.status === "COMPLETED") {
          window.clearInterval(timer);
          onComplete();
        }
      } catch {
        window.clearInterval(timer);
        toast.error("扫描状态更新失败");
      }
    }, 650);
    return () => window.clearInterval(timer);
  }, [jobId, jobStatus, onComplete]);

  function updateCriteria(key: keyof ScanCriteria, value: string) {
    if (!criteria) return;
    setCriteria({
      ...criteria,
      [key]:
        key === "employeeRange"
          ? value
          : value
              .split(/[，,]/)
              .map((item) => item.trim())
              .filter(Boolean),
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
        <section className="glass-card rounded-2xl border border-white/[0.07] p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-[#1677FF]/12 text-[#67B7FF]">
              <WandSparkles className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">用自然语言描述目标市场</p>
              <p className="mt-0.5 text-[10px] text-[#6E8BAA]">
                最多 2,000 字 · 输入将进行清洗和提示词注入防护
              </p>
            </div>
          </div>
          <Textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={2000}
            className="mt-4 min-h-[150px] resize-none border-white/10 bg-[#061426]/70 text-sm leading-7 placeholder:text-[#466583]"
            placeholder="例如：寻找德国的汽车内饰工厂…"
          />
          <div className="mt-3 flex items-center justify-between text-[10px] text-[#5E7E9F]">
            <span>描述行业、地区、规模、职位与可能需求</span>
            <span>{query.length}/2000</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={parse}
              disabled={parsing || query.trim().length < 10}
              className="h-11 border-white/10 bg-white/[0.03]"
            >
              {parsing ? <Loader2 className="animate-spin" /> : <Sparkles />}
              AI 解析需求
            </Button>
            <Button
              onClick={startScan}
              disabled={starting || job?.status === "RUNNING"}
              className="h-11 bg-[#1677FF] shadow-[0_0_20px_rgba(22,119,255,.18)]"
            >
              {starting || job?.status === "RUNNING" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Play />
              )}
              {job?.status === "RUNNING" ? "扫描中" : "启动扫描"}
            </Button>
          </div>
        </section>

        <section className="glass-card rounded-2xl border border-white/[0.07] p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">AI 解析结果</p>
              <p className="mt-1 text-[10px] text-[#6E8BAA]">
                解析后可手动修改，再启动市场扫描
              </p>
            </div>
            {criteria && (
              <Badge className="border-[#38D996]/15 bg-[#38D996]/10 text-[#7EE7B8]">
                <Check className="size-3" /> 可编辑
              </Badge>
            )}
          </div>
          {!criteria ? (
            <EmptyMini
              icon={<Sparkles />}
              title="等待解析市场需求"
              description="点击“AI 解析需求”，系统将生成可编辑的 ICP 与信号条件。"
            />
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["industry", "目标行业"],
                  ["keywords", "需求关键词"],
                  ["regions", "国家和地区"],
                  ["employeeRange", "企业人数范围"],
                  ["titles", "目标职位"],
                  ["seniorities", "决策人职级"],
                  ["buyingSignals", "采购信号"],
                  ["painPoints", "预计痛点"],
                  ["exclusions", "排除条件"],
                ] as [keyof ScanCriteria, string][]
              ).map(([key, label]) => (
                <label
                  key={key}
                  className={cn(
                    "text-[10px] text-[#86A3C3]",
                    key === "exclusions" && "sm:col-span-2",
                  )}
                >
                  {label}
                  <Input
                    value={
                      Array.isArray(criteria[key])
                        ? (criteria[key] as string[]).join("，")
                        : (criteria[key] as string)
                    }
                    onChange={(event) => updateCriteria(key, event.target.value)}
                    className="mt-1.5 h-10 border-white/[0.08] bg-[#061426]/55 text-xs"
                  />
                </label>
              ))}
            </div>
          )}
        </section>
      </div>

      {job && (
        <section className="glass-card rounded-2xl border border-[#2F9BFF]/16 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#1677FF]/12 text-[#3DDCFF]">
                {job.status === "COMPLETED" ? (
                  <CheckCircle2 />
                ) : (
                  <Loader2 className="animate-spin" />
                )}
              </span>
              <div>
                <p className="text-sm font-semibold">
                  {job.status === "COMPLETED"
                    ? "市场扫描完成"
                    : SCAN_STEPS[job.currentStep - 1]}
                </p>
                <p className="mt-0.5 text-[10px] text-[#6E8BAA]">
                  任务 {job.id} · 演示数据模式
                </p>
              </div>
            </div>
            <span className="font-mono text-lg text-[#3DDCFF]">{job.progress}%</span>
          </div>
          <Progress value={job.progress} className="mt-4 h-1.5 bg-white/[0.06]" />
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-7">
            {SCAN_STEPS.map((step, index) => {
              const done = index + 1 < job.currentStep || job.status === "COMPLETED";
              const active = index + 1 === job.currentStep && !done;
              return (
                <div
                  key={step}
                  className={cn(
                    "rounded-xl border p-3 text-center transition",
                    done
                      ? "border-[#38D996]/15 bg-[#38D996]/[0.055]"
                      : active
                        ? "border-[#2F9BFF]/25 bg-[#1677FF]/10"
                        : "border-white/[0.055] bg-white/[0.02]",
                  )}
                >
                  <span
                    className={cn(
                      "mx-auto grid size-6 place-items-center rounded-full text-[10px]",
                      done
                        ? "bg-[#38D996]/15 text-[#38D996]"
                        : active
                          ? "bg-[#1677FF]/20 text-[#72C8FF]"
                          : "bg-white/[0.04] text-[#5E7E9F]",
                    )}
                  >
                    {done ? <Check className="size-3" /> : index + 1}
                  </span>
                  <p className="mt-2 text-[10px] leading-4 text-[#86A3C3]">{step}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.08fr_.92fr]">
        <section className="glass-card blue-glow rounded-2xl border border-white/[0.07] p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle eyebrow="LIVE RADAR" title="市场需求雷达" />
            <div className="flex flex-wrap gap-2">
              <MiniSelect value={industry} onChange={setIndustry} label="行业">
                <SelectItem value="all">全部行业</SelectItem>
                {[...new Set(signals.map((item) => item.industry))].map((item) => (
                  <SelectItem value={item} key={item}>
                    {item}
                  </SelectItem>
                ))}
              </MiniSelect>
              <MiniSelect value={region} onChange={setRegion} label="地区">
                <SelectItem value="all">全部地区</SelectItem>
                {["德国", "波兰", "西班牙", "越南", "捷克"].map((item) => (
                  <SelectItem value={item} key={item}>
                    {item}
                  </SelectItem>
                ))}
              </MiniSelect>
              <MiniSelect value={level} onChange={setLevel} label="等级">
                <SelectItem value="all">全部等级</SelectItem>
                <SelectItem value="HIGH">高潜</SelectItem>
                <SelectItem value="MEDIUM">中潜</SelectItem>
                <SelectItem value="LOW">一般</SelectItem>
              </MiniSelect>
            </div>
          </div>
          <RadarVisual signals={filteredSignals} onSelect={onSignal} />
        </section>
        <section className="glass-card rounded-2xl border border-white/[0.07] p-4 sm:p-6">
          <MarketTrend
            onExplore={() => toast.info("点击底部“信号”可查看完整筛选结果")}
          />
        </section>
      </div>
    </div>
  );
}

function SignalsView({
  signals,
  onSignal,
  onNavigate,
  onOpportunity,
}: {
  signals: MarketSignal[];
  onSignal: (signal: MarketSignal) => void;
  onNavigate: (view: ViewId) => void;
  onOpportunity: (opportunity: Opportunity) => void;
}) {
  const [layout, setLayout] = useState<"cards" | "list">("cards");
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [sort, setSort] = useState("score");
  const [selected, setSelected] = useState<string[]>([]);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [confirmIgnore, setConfirmIgnore] = useState<MarketSignal>();
  const [converting, setConverting] = useState("");

  const filtered = signals
    .filter((signal) => !ignored.includes(signal.id))
    .filter(
      (signal) =>
        !search ||
        `${signal.title} ${signal.companyName} ${signal.summary}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .filter((signal) => level === "all" || signal.level === level)
    .sort((a, b) =>
      sort === "time"
        ? b.publishedAt.localeCompare(a.publishedAt)
        : b.score - a.score,
    );

  async function convert(signal: MarketSignal) {
    setConverting(signal.id);
    try {
      const response = await apiRequest<Opportunity>(
        `/api/signals/${signal.id}/opportunity`,
        {
          method: "POST",
          body: JSON.stringify({
            idempotencyKey: idempotencyKey(`signal-${signal.id}`),
          }),
        },
      );
      onOpportunity(response.data);
      toast.success("需求信号已加入机会池");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "转化失败");
    } finally {
      setConverting("");
    }
  }

  async function remind(signal: MarketSignal) {
    try {
      await apiRequest("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: `复核信号：${signal.title}`,
          description: `${signal.companyName} · ${signal.recommendation}`,
          idempotencyKey: idempotencyKey(`signal-reminder-${signal.id}`),
        }),
      });
      toast.success("提醒已添加到行动中心");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "提醒设置失败");
    }
  }

  function batchAdd() {
    const selectedSignals = signals.filter((item) => selected.includes(item.id));
    void Promise.all(selectedSignals.map(convert)).then(() => setSelected([]));
  }

  return (
    <div className="space-y-4">
      <PageHeading
        title="市场信号中心"
        description="集中研判来自官网、协会、展会、招聘与公开媒体的需求信号。"
        action={
          <Button className="h-11 bg-[#1677FF]" onClick={() => onNavigate("radar")}>
            <Radar />
            启动新扫描
          </Button>
        }
      />
      <section className="glass-card rounded-2xl border border-white/[0.07] p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#5E7E9F]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 border-white/[0.08] bg-[#061426]/55 pl-9"
              placeholder="搜索信号、企业或摘要…"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            <Select
              value={level}
              onValueChange={(value) => value && setLevel(value)}
            >
              <SelectTrigger className="h-11 w-[128px] border-white/[0.08] bg-[#061426]/55">
                <Filter />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部等级</SelectItem>
                <SelectItem value="HIGH">高潜信号</SelectItem>
                <SelectItem value="MEDIUM">中潜信号</SelectItem>
                <SelectItem value="LOW">一般信号</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sort}
              onValueChange={(value) => value && setSort(value)}
            >
              <SelectTrigger className="h-11 w-[128px] border-white/[0.08] bg-[#061426]/55">
                <SlidersHorizontal />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">机会分最高</SelectItem>
                <SelectItem value="time">发布时间最新</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex rounded-xl border border-white/[0.08] bg-[#061426]/55 p-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setLayout("cards")}
                className={cn("size-9", layout === "cards" && "bg-[#1677FF]/15")}
              >
                <Grid2X2 />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setLayout("list")}
                className={cn("size-9", layout === "list" && "bg-[#1677FF]/15")}
              >
                <List />
              </Button>
            </div>
          </div>
        </div>
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3"
          >
            <span className="mr-2 text-xs text-[#86A3C3]">
              已选择 {selected.length} 条
            </span>
            <Button size="sm" className="h-9 bg-[#1677FF]" onClick={batchAdd}>
              <Target /> 批量加入机会池
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 border-white/10"
              onClick={() => {
                setIgnored((current) => [...current, ...selected]);
                setSelected([]);
                toast.success("已批量忽略所选信号");
              }}
            >
              <Trash2 /> 批量忽略
            </Button>
          </motion.div>
        )}
      </section>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title="没有符合条件的需求信号"
          description="调整筛选条件，或启动一次新的市场扫描。"
          action="清除筛选"
          onAction={() => {
            setSearch("");
            setLevel("all");
            setIgnored([]);
          }}
        />
      ) : (
        <div
          className={cn(
            layout === "cards"
              ? "grid gap-3 lg:grid-cols-2 2xl:grid-cols-3"
              : "space-y-2",
          )}
        >
          {filtered.map((signal, index) => (
            <motion.article
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.035, 0.2) }}
              key={signal.id}
              className={cn(
                "glass-card group rounded-2xl border border-white/[0.07] transition hover:border-[#2F9BFF]/20",
                layout === "cards" ? "p-4 sm:p-5" : "p-4",
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selected.includes(signal.id)}
                  onCheckedChange={(checked) =>
                    setSelected((current) =>
                      checked
                        ? [...current, signal.id]
                        : current.filter((id) => id !== signal.id),
                    )
                  }
                  className="mt-1 border-white/20"
                  aria-label={`选择 ${signal.title}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SignalBadge level={signal.level} />
                    <span className="text-[10px] text-[#6E8BAA]">
                      {signal.sourceName}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-[#FFB547]/15 bg-[#FFB547]/[0.06] text-[9px] text-[#FFD08A]"
                    >
                      演示
                    </Badge>
                    <span className="ml-auto text-[10px] text-[#5E7E9F]">
                      {formatRelative(signal.publishedAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSignal(signal)}
                    className="mt-2 min-h-11 text-left text-sm font-semibold leading-6 text-white transition hover:text-[#8CCBFF]"
                  >
                    {signal.title}
                  </button>
                  <p className="mt-1 text-xs text-[#8CCBFF]">{signal.companyName}</p>
                </div>
                <div className="shrink-0 text-center">
                  <div
                    className={cn(
                      "grid size-11 place-items-center rounded-xl border font-mono text-sm font-semibold",
                      signal.score >= 90
                        ? "border-[#38D996]/20 bg-[#38D996]/10 text-[#38D996]"
                        : "border-[#2F9BFF]/20 bg-[#1677FF]/10 text-[#72C8FF]",
                    )}
                  >
                    {signal.score}
                  </div>
                  <p className="mt-1 text-[9px] text-[#5E7E9F]">机会分</p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#86A3C3]">
                {signal.summary}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {signal.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-md bg-white/[0.04] px-2 py-1 text-[9px] text-[#7795B4]"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/[0.055] py-3">
                <SignalMetric label="需求强度" value={signal.intensity} />
                <SignalMetric label="紧迫度" value={signal.urgency} />
                <SignalMetric label="可信度" value={signal.confidence} />
              </div>
              <div className="mt-3 rounded-xl bg-[#1677FF]/[0.055] p-3">
                <p className="text-[9px] text-[#5FAEEB]">推荐行动</p>
                <p className="mt-1 text-[11px] leading-5 text-[#ABC3DB]">
                  {signal.recommendation}
                </p>
              </div>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                <Button
                  size="sm"
                  className="h-10 shrink-0 bg-[#1677FF]"
                  disabled={converting === signal.id}
                  onClick={() => convert(signal)}
                >
                  {converting === signal.id ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Target />
                  )}
                  加入机会池
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 shrink-0 border-white/10"
                  onClick={() => onSignal(signal)}
                >
                  <Bot /> AI 分析
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 shrink-0 border-white/10"
                  onClick={() => onNavigate("people")}
                >
                  <UserRoundSearch /> 查找决策人
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-10 shrink-0"
                  onClick={() => remind(signal)}
                  aria-label="设置提醒"
                >
                  <Bell />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-10 shrink-0 text-[#FF8C9D]"
                  onClick={() => setConfirmIgnore(signal)}
                  aria-label="忽略信号"
                >
                  <Trash2 />
                </Button>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(confirmIgnore)}
        onOpenChange={(open) => !open && setConfirmIgnore(undefined)}
      >
        <DialogContent className="border-white/10 bg-[#0B1F36]">
          <DialogHeader>
            <DialogTitle>确认忽略这条需求信号？</DialogTitle>
            <DialogDescription>
              忽略后该信号将从当前列表移除，但不会删除企业或已有机会。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmIgnore(undefined)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmIgnore) {
                  setIgnored((current) => [...current, confirmIgnore.id]);
                  toast.success("信号已忽略");
                }
                setConfirmIgnore(undefined);
              }}
            >
              确认忽略
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type ApolloResult = {
  id: string;
  name: string;
  title: string;
  location: string;
  company: string;
  linkedinUrl?: string;
  email?: string;
  needsEnrichment: boolean;
};

function PeopleView({
  contacts,
  companies,
  opportunities,
  onOpportunityUpdated,
  onAgent,
}: {
  contacts: Contact[];
  companies: Company[];
  opportunities: Opportunity[];
  onOpportunityUpdated: (opportunity: Opportunity) => void;
  onAgent: (opportunity: Opportunity) => void;
}) {
  const [apolloConfigured, setApolloConfigured] = useState<boolean>();
  const [keyword, setKeyword] = useState("汽车内饰");
  const [titles, setTitles] = useState("Procurement Director,Production Director,Plant Manager");
  const [location, setLocation] = useState("Germany");
  const [employeeRange, setEmployeeRange] = useState("100,500");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [results, setResults] = useState<ApolloResult[]>([]);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState(
    opportunities[0]?.id ?? "",
  );

  useEffect(() => {
    void apiRequest<{ configured: boolean }>("/api/apollo-search")
      .then((response) => setApolloConfigured(response.data.configured))
      .catch(() => setApolloConfigured(false));
  }, []);

  async function searchPeople() {
    setSearching(true);
    setSearchError("");
    try {
      const response = await apiRequest<{
        people: ApolloResult[];
        empty: boolean;
      }>("/api/apollo-search", {
        method: "POST",
        body: JSON.stringify({
          q_keywords: keyword,
          person_titles: titles
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          person_seniorities: ["director", "head", "c_suite"],
          organization_locations: [location],
          organization_num_employees_ranges: [employeeRange],
          page: 1,
          per_page: 25,
        }),
      });
      setResults(response.data.people);
      if (response.data.empty) toast.info("Apollo 查询成功，但没有匹配结果");
      else toast.success(`Apollo 返回 ${response.data.people.length} 位联系人`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Apollo 查询失败";
      setSearchError(message);
      toast.error(message);
    } finally {
      setSearching(false);
    }
  }

  async function addDemoContact(contact: Contact) {
    if (!selectedOpportunityId) {
      toast.error("请先选择要加入的销售机会");
      return;
    }
    try {
      const response = await apiRequest<Opportunity>(
        `/api/opportunities/${selectedOpportunityId}/contacts`,
        {
          method: "POST",
          body: JSON.stringify({ contactId: contact.id }),
        },
      );
      onOpportunityUpdated(response.data);
      toast.success(`${contact.name} 已加入机会决策链`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "联系人加入失败");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeading
        title="企业与决策人搜索"
        description="Apollo People Search 通过服务端代理调用；API Key 永不下发浏览器。"
        action={
          <Badge
            className={cn(
              "h-8 border",
              apolloConfigured
                ? "border-[#38D996]/20 bg-[#38D996]/10 text-[#7EE7B8]"
                : "border-[#FFB547]/20 bg-[#FFB547]/10 text-[#FFD08A]",
            )}
          >
            {apolloConfigured ? (
              <Cloud className="size-3.5" />
            ) : (
              <WifiOff className="size-3.5" />
            )}
            {apolloConfigured ? "Apollo 已配置" : "Apollo 未配置"}
          </Badge>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <section className="glass-card h-fit rounded-2xl border border-white/[0.07] p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="size-4 text-[#67B7FF]" />
            搜索条件
          </p>
          <div className="mt-4 space-y-3">
            <Field label="企业或行业关键词">
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                className="h-11 border-white/10 bg-[#061426]/60"
              />
            </Field>
            <Field label="目标职位（逗号分隔）">
              <Textarea
                value={titles}
                onChange={(event) => setTitles(event.target.value)}
                className="min-h-20 border-white/10 bg-[#061426]/60 text-xs"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="企业总部地区">
                <Input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="h-11 border-white/10 bg-[#061426]/60"
                />
              </Field>
              <Field label="员工范围">
                <Input
                  value={employeeRange}
                  onChange={(event) => setEmployeeRange(event.target.value)}
                  className="h-11 border-white/10 bg-[#061426]/60"
                />
              </Field>
            </div>
            <Field label="加入到销售机会">
              <Select
                value={selectedOpportunityId}
                onValueChange={(value) =>
                  value && setSelectedOpportunityId(value)
                }
              >
                <SelectTrigger className="h-11 w-full border-white/10 bg-[#061426]/60">
                  <SelectValue placeholder="选择机会" />
                </SelectTrigger>
                <SelectContent>
                  {opportunities.map((opportunity) => (
                    <SelectItem key={opportunity.id} value={opportunity.id}>
                      {opportunity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Button
            onClick={searchPeople}
            disabled={searching}
            className="mt-5 h-11 w-full bg-[#1677FF]"
          >
            {searching ? <Loader2 className="animate-spin" /> : <Search />}
            搜索 Apollo
          </Button>
          {!apolloConfigured && (
            <div className="mt-4 rounded-xl border border-[#FFB547]/15 bg-[#FFB547]/[0.055] p-3">
              <p className="text-[10px] font-medium text-[#FFD08A]">
                API Key 未配置
              </p>
              <p className="mt-1 text-[10px] leading-5 text-[#9DB1C7]">
                设置服务端 `APOLLO_API_KEY` 后可实时搜索。下方结果明确为 Seed
                演示数据，不包含伪造邮箱或电话。
              </p>
            </div>
          )}
        </section>

        <section className="space-y-3">
          {searchError && (
            <div className="flex items-start gap-3 rounded-2xl border border-[#FF647C]/15 bg-[#FF647C]/[0.05] p-4">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#FF647C]" />
              <div>
                <p className="text-xs font-medium text-[#FFA6B4]">{searchError}</p>
                <p className="mt-1 text-[10px] text-[#86A3C3]">
                  401、403、422、429 与网络异常会显示各自错误，不会降级伪装为实时结果。
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">
                {results.length ? "Apollo 搜索结果" : "演示联系人"}
              </p>
              <p className="mt-1 text-[10px] text-[#6E8BAA]">
                {results.length
                  ? `${results.length} 位实时返回联系人`
                  : `${contacts.length} 位 Seed Data 联系人`}
              </p>
            </div>
          </div>
          {(results.length ? results : contacts).map((person) => {
            const demoContact = "companyId" in person ? (person as Contact) : null;
            const company = demoContact
              ? companies.find((item) => item.id === demoContact.companyId)
              : undefined;
            return (
              <article
                key={person.id}
                className="glass-card rounded-2xl border border-white/[0.07] p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="size-11 border border-[#2F9BFF]/20">
                    <AvatarFallback className="bg-[#1677FF]/12 text-sm text-[#8CCBFF]">
                      {person.name
                        .split(" ")
                        .map((item) => item[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{person.name}</p>
                      <Badge
                        variant="outline"
                        className="border-[#FFB547]/15 bg-[#FFB547]/[0.05] text-[9px] text-[#FFD08A]"
                      >
                        {demoContact ? "演示数据" : "Apollo"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-[#8CCBFF]">{person.title}</p>
                    <p className="mt-1 text-[10px] text-[#6E8BAA]">
                      {demoContact
                        ? `${company?.name} · ${demoContact.location}`
                        : `${(person as ApolloResult).company} · ${person.location}`}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#FFB547]/15 bg-[#FFB547]/[0.055] px-3 py-2 text-center">
                    <p className="text-[9px] text-[#FFD08A]">需要 Enrichment</p>
                    <p className="mt-0.5 text-[9px] text-[#6E8BAA]">
                      无邮箱 / 电话
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2 overflow-x-auto hide-scrollbar">
                  {demoContact ? (
                    <Button
                      size="sm"
                      className="h-10 shrink-0 bg-[#1677FF]"
                      onClick={() => addDemoContact(demoContact)}
                    >
                      <Plus /> 加入机会决策链
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="h-10 shrink-0 bg-[#1677FF]"
                      onClick={() =>
                        toast.info("请先将 Apollo 人员保存为联系人，再加入机会")
                      }
                    >
                      <Plus /> 加入触达名单
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 shrink-0 border-white/10"
                    onClick={() => {
                      const opportunity = opportunities.find(
                        (item) => item.id === selectedOpportunityId,
                      );
                      if (opportunity) onAgent(opportunity);
                      else toast.error("请先选择机会");
                    }}
                  >
                    <Bot /> 交给成交智能体
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-10 shrink-0"
                    onClick={() => toast.info("已打开企业画像（演示）")}
                  >
                    <Building2 /> 查看企业
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}

const BOARD_STAGES: OpportunityStage[] = [
  "NEW",
  "QUALIFY",
  "TO_CONTACT",
  "CONTACTED",
  "NEED_CONFIRMED",
  "SOLUTION",
  "NEGOTIATION",
  "SIGNING",
];

function OpportunitiesView({
  opportunities,
  onUpdated,
  onAgent,
}: {
  opportunities: Opportunity[];
  onUpdated: (opportunity: Opportunity) => void;
  onAgent: (opportunity: Opportunity) => void;
}) {
  const [layout, setLayout] = useState<"board" | "list">("board");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState("");
  const [detail, setDetail] = useState<Opportunity>();
  const [dragging, setDragging] = useState<string>();
  const filtered = opportunities.filter(
    (item) =>
      !search ||
      `${item.name} ${item.companyName}`.toLowerCase().includes(search.toLowerCase()),
  );

  async function move(opportunity: Opportunity, stage: OpportunityStage) {
    if (opportunity.stage === stage) return;
    setUpdating(opportunity.id);
    try {
      const response = await apiRequest<Opportunity>(
        `/api/opportunities/${opportunity.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ stage }),
        },
      );
      onUpdated(response.data);
      setDetail((current) =>
        current?.id === response.data.id ? response.data : current,
      );
      toast.success(`机会已推进至“${STAGE_LABELS[stage]}”，阶段记录已生成`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "阶段更新失败");
    } finally {
      setUpdating("");
      setDragging(undefined);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeading
        title="销售机会池"
        description="从市场信号进入成交工作流；拖动卡片即可推进销售阶段。"
        action={
          <Button
            className="h-11 bg-[#1677FF]"
            onClick={() => toast.info("请从市场信号或企业页面创建新机会")}
          >
            <Plus /> 新建机会
          </Button>
        }
      />
      <section className="glass-card flex flex-col gap-3 rounded-2xl border border-white/[0.07] p-3 sm:flex-row sm:items-center sm:p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#5E7E9F]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索机会或企业…"
            className="h-11 border-white/[0.08] bg-[#061426]/55 pl-9"
          />
        </div>
        <div className="flex rounded-xl border border-white/[0.08] bg-[#061426]/55 p-1">
          <Button
            variant="ghost"
            className={cn(
              "h-9 flex-1 text-xs sm:flex-none",
              layout === "board" && "bg-[#1677FF]/15 text-white",
            )}
            onClick={() => setLayout("board")}
          >
            <Grid2X2 /> 看板
          </Button>
          <Button
            variant="ghost"
            className={cn(
              "h-9 flex-1 text-xs sm:flex-none",
              layout === "list" && "bg-[#1677FF]/15 text-white",
            )}
            onClick={() => setLayout("list")}
          >
            <List /> 列表
          </Button>
        </div>
      </section>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Target />}
          title="机会池还是空的"
          description="前往市场信号中心，将高潜需求转为第一个销售机会。"
          action="去市场信号中心"
          onAction={() => toast.info("请点击底部“信号”进入市场信号中心")}
        />
      ) : layout === "board" ? (
        <div className="overflow-x-auto pb-3 hide-scrollbar">
          <div className="flex min-w-max gap-3">
            {BOARD_STAGES.map((stage) => {
              const stageItems = filtered.filter((item) => item.stage === stage);
              const stageAmount = stageItems.reduce(
                (sum, item) => sum + item.estimatedAmount,
                0,
              );
              return (
                <section
                  key={stage}
                  className={cn(
                    "w-[288px] rounded-2xl border border-white/[0.06] bg-[#07182B]/65 p-3 transition",
                    dragging && "border-dashed hover:border-[#2F9BFF]/45",
                  )}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    const opportunity = filtered.find(
                      (item) => item.id === dragging,
                    );
                    if (opportunity) void move(opportunity, stage);
                  }}
                >
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <i
                      className={cn(
                        "size-2 rounded-full",
                        stage === "NEW" && "bg-[#3DDCFF]",
                        stage === "QUALIFY" && "bg-[#A88BFF]",
                        stage === "TO_CONTACT" && "bg-[#FFB547]",
                        stage === "CONTACTED" && "bg-[#2F9BFF]",
                        stage === "NEED_CONFIRMED" && "bg-[#38D996]",
                        stage === "SOLUTION" && "bg-[#6D9CFF]",
                        stage === "NEGOTIATION" && "bg-[#FF8C9D]",
                        stage === "SIGNING" && "bg-[#7EE7B8]",
                      )}
                    />
                    <p className="text-xs font-semibold">{STAGE_LABELS[stage]}</p>
                    <Badge
                      variant="outline"
                      className="ml-auto border-white/[0.07] text-[9px] text-[#6E8BAA]"
                    >
                      {stageItems.length}
                    </Badge>
                  </div>
                  <p className="mb-3 px-1 text-[9px] text-[#5E7E9F]">
                    ¥{(stageAmount / 10000).toFixed(0)}万
                  </p>
                  <div className="min-h-24 space-y-2">
                    {stageItems.length === 0 && (
                      <div className="grid min-h-24 place-items-center rounded-xl border border-dashed border-white/[0.07] text-[10px] text-[#466583]">
                        拖动机会到此阶段
                      </div>
                    )}
                    {stageItems.map((opportunity) => (
                      <motion.article
                        layout
                        key={opportunity.id}
                        draggable
                        onDragStart={() => setDragging(opportunity.id)}
                        onDragEnd={() => setDragging(undefined)}
                        onClick={() => setDetail(opportunity)}
                        className={cn(
                          "cursor-grab rounded-xl border border-white/[0.07] bg-[#0B1F36] p-4 shadow-lg transition hover:-translate-y-0.5 hover:border-[#2F9BFF]/25 active:cursor-grabbing",
                          updating === opportunity.id && "opacity-55",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="outline"
                            className="border-[#2F9BFF]/15 bg-[#1677FF]/[0.06] text-[9px] text-[#72C8FF]"
                          >
                            {opportunity.industry}
                          </Badge>
                          <span className="font-mono text-xs text-[#38D996]">
                            {opportunity.score}
                          </span>
                        </div>
                        <p className="mt-3 text-xs font-semibold leading-5">
                          {opportunity.name}
                        </p>
                        <p className="mt-1 truncate text-[10px] text-[#6E8BAA]">
                          {opportunity.companyName}
                        </p>
                        <div className="mt-4 flex items-center justify-between border-t border-white/[0.055] pt-3">
                          <span className="text-xs">
                            ¥{(opportunity.estimatedAmount / 10000).toFixed(0)}万
                          </span>
                          <span className="text-[10px] text-[#8CCBFF]">
                            {opportunity.probability}%
                          </span>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-[9px] text-[#6E8BAA]">
                          <Avatar className="size-5">
                            <AvatarFallback className="bg-[#1677FF]/15 text-[8px]">
                              {opportunity.owner[0]}
                            </AvatarFallback>
                          </Avatar>
                          {opportunity.owner}
                          <Clock3 className="ml-auto size-3" />
                          {opportunity.expectedCloseDate.slice(5)}
                        </div>
                      </motion.article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((opportunity) => (
            <button
              type="button"
              key={opportunity.id}
              onClick={() => setDetail(opportunity)}
              className="glass-card flex min-h-[84px] w-full items-center gap-3 rounded-2xl border border-white/[0.07] p-4 text-left transition hover:border-[#2F9BFF]/20 active:scale-[0.99]"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#1677FF]/12 font-mono text-sm text-[#72C8FF]">
                {opportunity.score}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{opportunity.name}</p>
                <p className="mt-1 truncate text-[10px] text-[#6E8BAA]">
                  {opportunity.companyName} · {opportunity.owner}
                </p>
              </div>
              <Badge className="hidden bg-[#1677FF]/10 text-[#8CCBFF] sm:flex">
                {STAGE_LABELS[opportunity.stage]}
              </Badge>
              <div className="text-right">
                <p className="text-xs">
                  ¥{(opportunity.estimatedAmount / 10000).toFixed(0)}万
                </p>
                <p className="mt-1 text-[10px] text-[#38D996]">
                  {opportunity.probability}%
                </p>
              </div>
              <ChevronRight className="size-4 text-[#466583]" />
            </button>
          ))}
        </div>
      )}

      <Sheet open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(undefined)}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto border-l-white/10 bg-[#07182B] p-5 sm:max-w-xl"
        >
          <SheetHeader>
            <SheetTitle className="pr-8 text-left text-lg">{detail?.name}</SheetTitle>
            <SheetDescription className="text-left">
              {detail?.companyName} · 演示数据
            </SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <MetricTile label="机会评分" value={`${detail.score}`} color="cyan" />
                <MetricTile label="成交概率" value={`${detail.probability}%`} color="green" />
                <MetricTile
                  label="预计金额"
                  value={`¥${(detail.estimatedAmount / 10000).toFixed(0)}万`}
                />
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-[#0B1F36] p-4">
                <p className="text-[10px] text-[#6E8BAA]">推进销售阶段</p>
                <Select
                  value={detail.stage}
                  onValueChange={(value) =>
                    void move(detail, value as OpportunityStage)
                  }
                >
                  <SelectTrigger className="mt-2 h-11 w-full border-white/10 bg-[#061426]/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STAGE_LABELS).map(([value, label]) => (
                      <SelectItem value={value} key={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <InfoList
                items={[
                  ["主要联系人", detail.primaryContactName ?? "尚未添加"],
                  ["负责人", detail.owner],
                  ["下一次行动", detail.nextAction],
                  ["预计成交日期", detail.expectedCloseDate],
                  ["来源", detail.source],
                ]}
              />
              <div className="rounded-2xl border border-white/[0.07] bg-[#0B1F36] p-4">
                <p className="text-xs font-semibold">风险标签</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {detail.riskTags.map((tag) => (
                    <Badge
                      key={tag}
                      className="border-[#FF647C]/15 bg-[#FF647C]/[0.06] text-[#FFA6B4]"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-[#0B1F36] p-4">
                <p className="text-xs font-semibold">阶段变化记录</p>
                <div className="mt-3 space-y-3">
                  {detail.stageHistory.length ? (
                    detail.stageHistory.map((history) => (
                      <div
                        key={history.id}
                        className="flex gap-3 border-l border-[#2F9BFF]/30 pl-3"
                      >
                        <div>
                          <p className="text-[11px] text-[#BED2E8]">
                            {history.fromStage
                              ? `${STAGE_LABELS[history.fromStage]} → `
                              : ""}
                            {STAGE_LABELS[history.toStage]}
                          </p>
                          <p className="mt-1 text-[9px] text-[#5E7E9F]">
                            {history.note}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-[#5E7E9F]">
                      推进阶段后将自动记录变化。
                    </p>
                  )}
                </div>
              </div>
              <Button
                className="h-12 w-full bg-[#1677FF]"
                onClick={() => {
                  setDetail(undefined);
                  onAgent(detail);
                }}
              >
                <Bot /> 启动 AI 成交智能体
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ActionsView({
  tasks,
  opportunities,
  onTasksChange,
  onOpportunity,
  onAgent,
}: {
  tasks: FollowUpTask[];
  opportunities: Opportunity[];
  onTasksChange: (tasks: FollowUpTask[]) => void;
  onOpportunity: (opportunity: Opportunity) => void;
  onAgent: (opportunity: Opportunity) => void;
}) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [updating, setUpdating] = useState("");
  const pending = tasks.filter((item) => item.status === "PENDING");
  const filtered = tasks.filter((task) => {
    if (filter === "all") return task.status === "PENDING";
    if (filter === "overdue")
      return task.status === "PENDING" && new Date(task.dueAt) < new Date("2026-08-31T08:51:00Z");
    if (filter === "high") return task.status === "PENDING" && task.priority === "high";
    if (filter === "completed") return task.status === "COMPLETED";
    return true;
  });

  async function updateTask(
    task: FollowUpTask,
    patch: Partial<FollowUpTask>,
  ) {
    setUpdating(task.id);
    try {
      const response = await apiRequest<FollowUpTask>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      onTasksChange(
        tasks.map((item) => (item.id === task.id ? response.data : item)),
      );
      toast.success(
        patch.status === "COMPLETED" ? "行动已完成" : "行动已延期到明天",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "行动更新失败");
    } finally {
      setUpdating("");
    }
  }

  async function completeSelected() {
    const target = tasks.filter((task) => selected.includes(task.id));
    await Promise.all(
      target.map((task) => updateTask(task, { status: "COMPLETED" })),
    );
    setSelected([]);
  }

  return (
    <div className="space-y-5">
      <PageHeading
        title="行动中心"
        description="把需要跟进、等待回复、风险提醒与 AI 建议汇聚到一个队列。"
        action={
          <Badge className="h-8 bg-[#FF647C]/10 text-[#FFA6B4]">
            {pending.length} 项待处理
          </Badge>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["今日待跟进", pending.length, Clock3, "#3DDCFF", "all"],
          ["已超时", 1, AlertCircle, "#FF647C", "overdue"],
          ["高优先级", pending.filter((item) => item.priority === "high").length, Zap, "#FFB547", "high"],
          ["高潜未触达", 1, Target, "#38D996", "high"],
        ].map(([label, value, Icon, color, next]) => {
          const ItemIcon = Icon as typeof Clock3;
          return (
            <button
              type="button"
              key={label as string}
              onClick={() => setFilter(next as string)}
              className="glass-card min-h-28 rounded-2xl border border-white/[0.07] p-4 text-left transition hover:border-[#2F9BFF]/20 active:scale-[0.98]"
            >
              <ItemIcon className="size-4" style={{ color: color as string }} />
              <p className="mt-3 text-2xl font-semibold">{value as number}</p>
              <p className="mt-1 text-[10px] text-[#86A3C3]">{label as string}</p>
            </button>
          );
        })}
      </div>

      <section className="glass-card rounded-2xl border border-[#1677FF]/16 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#1677FF]/12 text-[#67B7FF]">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#72C8FF]">AI 推荐行动</p>
            <p className="mt-1 text-sm font-medium leading-6">
              优先推进 Aurora：发送 ROI 测算模板，并请求生产总监引荐工艺负责人。
            </p>
            <p className="mt-1 text-[10px] text-[#6E8BAA]">
              依据：94 分需求信号、需求确认阶段、决策链覆盖仅 25%
            </p>
          </div>
          <Button
            size="sm"
            className="hidden h-10 bg-[#1677FF] sm:flex"
            onClick={() => opportunities[0] && onAgent(opportunities[0])}
          >
            <Bot /> 生成跟进内容
          </Button>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {[
          ["all", "全部待处理"],
          ["overdue", "超时未跟进"],
          ["high", "高优先级"],
          ["completed", "已完成"],
        ].map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => setFilter(value)}
            className={cn(
              "h-10 shrink-0",
              filter === value
                ? "bg-[#1677FF]"
                : "border-white/10 bg-white/[0.02]",
            )}
          >
            {label}
          </Button>
        ))}
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-[#2F9BFF]/15 bg-[#1677FF]/[0.06] p-3">
          <span className="text-xs text-[#86A3C3]">已选择 {selected.length} 项</span>
          <Button size="sm" className="ml-auto h-9 bg-[#1677FF]" onClick={completeSelected}>
            <Check /> 批量完成
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 />}
          title="当前队列已处理完"
          description="做得不错。可以查看高潜未触达机会，继续创造下一步行动。"
          action="查看全部待处理"
          onAction={() => setFilter("all")}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const opportunity = opportunities.find(
              (item) => item.id === task.opportunityId,
            );
            const overdue =
              new Date(task.dueAt) < new Date("2026-08-31T08:51:00Z") &&
              task.status === "PENDING";
            return (
              <article
                key={task.id}
                className="glass-card flex flex-col gap-3 rounded-2xl border border-white/[0.07] p-4 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 items-start gap-3 sm:flex-1">
                  <Checkbox
                    checked={selected.includes(task.id)}
                    onCheckedChange={(checked) =>
                      setSelected((current) =>
                        checked
                          ? [...current, task.id]
                          : current.filter((id) => id !== task.id),
                      )
                    }
                    className="mt-1 border-white/20"
                  />
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl",
                      overdue
                        ? "bg-[#FF647C]/10 text-[#FF8C9D]"
                        : task.priority === "high"
                          ? "bg-[#FFB547]/10 text-[#FFD08A]"
                          : "bg-[#1677FF]/10 text-[#72C8FF]",
                    )}
                  >
                    {overdue ? (
                      <AlertCircle className="size-4" />
                    ) : (
                      <Clock3 className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{task.title}</p>
                      {overdue && (
                        <Badge className="bg-[#FF647C]/10 text-[9px] text-[#FFA6B4]">
                          已超时
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate text-[10px] text-[#6E8BAA]">
                      {task.opportunityName ?? "独立行动"} · {task.assignee} ·{" "}
                      {formatTaskTime(task.dueAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pl-12 sm:pl-0">
                  <Button
                    size="sm"
                    disabled={updating === task.id}
                    onClick={() => updateTask(task, { status: "COMPLETED" })}
                    className="h-10 bg-[#1677FF]"
                  >
                    {updating === task.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Check />
                    )}
                    完成
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 border-white/10"
                    onClick={() =>
                      updateTask(task, {
                        status: "SNOOZED",
                        dueAt: new Date(
                          new Date(task.dueAt).getTime() + 86400000,
                        ).toISOString(),
                      })
                    }
                  >
                    延期
                  </Button>
                  {opportunity && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-10"
                      onClick={() => onOpportunity(opportunity)}
                    >
                      <ChevronRight />
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SourcesView({
  sources,
  onChange,
}: {
  sources: DataSource[];
  onChange: (sources: DataSource[]) => void;
}) {
  const [testing, setTesting] = useState("");
  const [toggling, setToggling] = useState("");

  async function testSource(source: DataSource) {
    setTesting(source.id);
    try {
      const response = await apiRequest<{ message: string }>(
        `/api/data-sources/${source.id}/test`,
        { method: "POST", body: "{}" },
      );
      onChange(
        sources.map((item) =>
          item.id === source.id
            ? { ...item, status: "connected", errorMessage: undefined }
            : item,
        ),
      );
      toast.success(response.data.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "连接测试失败";
      onChange(
        sources.map((item) =>
          item.id === source.id
            ? { ...item, status: "error", errorMessage: message }
            : item,
        ),
      );
      toast.error(message);
    } finally {
      setTesting("");
    }
  }

  async function toggleSource(source: DataSource, enabled: boolean) {
    setToggling(source.id);
    try {
      const response = await apiRequest<DataSource>(
        `/api/data-sources/${source.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ enabled }),
        },
      );
      onChange(
        sources.map((item) => (item.id === source.id ? response.data : item)),
      );
      toast.success(enabled ? `${source.name} 已开启` : `${source.name} 已暂停`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "状态更新失败");
    } finally {
      setToggling("");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeading
        title="数据源中心"
        description="管理需求发现入口、连接状态、扫描用量与错误记录。"
        action={
          <Button
            className="h-11 bg-[#1677FF]"
            onClick={() => toast.info("可通过 Webhook 或 CSV 接入自有数据")}
          >
            <Plus /> 添加数据源
          </Button>
        }
      />
      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {sources.map((source) => (
          <article
            key={source.id}
            className="glass-card rounded-2xl border border-white/[0.07] p-5"
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-xl border",
                  source.status === "connected"
                    ? "border-[#38D996]/15 bg-[#38D996]/[0.07] text-[#38D996]"
                    : source.status === "error"
                      ? "border-[#FF647C]/15 bg-[#FF647C]/[0.07] text-[#FF8C9D]"
                      : "border-white/[0.07] bg-white/[0.03] text-[#6E8BAA]",
                )}
              >
                {source.type === "apollo" ? (
                  <Users className="size-5" />
                ) : source.type === "webhook" ? (
                  <Network className="size-5" />
                ) : source.type === "csv" ? (
                  <Inbox className="size-5" />
                ) : (
                  <Cloud className="size-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{source.name}</p>
                  <SourceStatus status={source.status} />
                </div>
                <p className="mt-1 text-[10px] text-[#6E8BAA]">
                  {source.configured ? "已配置" : "尚未配置"} ·{" "}
                  {source.lastScannedAt
                    ? `最近扫描 ${formatRelative(source.lastScannedAt)}`
                    : "从未扫描"}
                </p>
              </div>
              <Switch
                disabled={!source.configured || toggling === source.id}
                checked={source.enabled}
                onCheckedChange={(enabled) => toggleSource(source, enabled)}
                aria-label={`${source.enabled ? "暂停" : "开启"} ${source.name}`}
              />
            </div>
            {source.errorMessage && (
              <div className="mt-3 rounded-xl border border-[#FF647C]/12 bg-[#FF647C]/[0.045] p-3">
                <p className="flex items-center gap-2 text-[10px] text-[#FFA6B4]">
                  <AlertCircle className="size-3" /> {source.errorMessage}
                </p>
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <MetricTile label="本次发现" value={`${source.discovered}`} />
              <MetricTile
                label="API 用量"
                value={
                  source.usageLimit
                    ? `${source.usageCurrent}/${source.usageLimit}`
                    : `${source.usageCurrent}`
                }
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                disabled={testing === source.id}
                className="h-10 flex-1 border-white/10"
                onClick={() => testSource(source)}
              >
                {testing === source.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <RefreshCw />
                )}
                测试连接
              </Button>
              <Button
                variant="ghost"
                className="size-10"
                onClick={() =>
                  toast.info(
                    source.configured ? "数据源配置已打开" : "请先配置服务端凭据",
                  )
                }
              >
                <Settings2 />
              </Button>
            </div>
          </article>
        ))}
      </div>
      <div className="rounded-2xl border border-[#3DDCFF]/12 bg-[#3DDCFF]/[0.035] p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#3DDCFF]" />
          <p className="text-[10px] leading-5 text-[#86A3C3]">
            所有外部 API Key 仅从服务端环境变量读取，不会包含在前端 Bundle
            或接口响应中。外部错误仅记录状态码与截断后的响应，不记录完整密钥。
          </p>
        </div>
      </div>
    </div>
  );
}

function SignalDetail({
  signal,
  open,
  onOpenChange,
  onOpportunity,
  onPeople,
}: {
  signal?: MarketSignal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpportunity: (opportunity: Opportunity) => void;
  onPeople: () => void;
}) {
  const [converting, setConverting] = useState(false);
  if (!signal) return null;

  async function convert() {
    const currentSignal = signal;
    if (!currentSignal) return;
    setConverting(true);
    try {
      const response = await apiRequest<Opportunity>(
        `/api/signals/${currentSignal.id}/opportunity`,
        {
          method: "POST",
          body: JSON.stringify({
            idempotencyKey: idempotencyKey(`detail-${currentSignal.id}`),
          }),
        },
      );
      onOpportunity(response.data);
      toast.success("已转为销售机会");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      setConverting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-l-white/10 bg-[#07182B] p-5 sm:max-w-lg"
      >
        <SheetHeader>
          <div className="flex items-center gap-2 pr-8">
            <SignalBadge level={signal.level} />
            <Badge
              variant="outline"
              className="border-[#FFB547]/15 bg-[#FFB547]/[0.05] text-[9px] text-[#FFD08A]"
            >
              演示数据
            </Badge>
          </div>
          <SheetTitle className="pr-8 text-left text-lg leading-7">
            {signal.title}
          </SheetTitle>
          <SheetDescription className="text-left">
            {signal.companyName} · {signal.region} · {signal.sourceName}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricTile label="AI 机会分" value={`${signal.score}`} color="cyan" />
            <MetricTile label="需求强度" value={`${signal.intensity}`} />
            <MetricTile label="紧迫度" value={`${signal.urgency}`} />
            <MetricTile label="可信度" value={`${signal.confidence}`} />
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-[#0B1F36] p-5">
            <p className="text-[10px] text-[#6E8BAA]">信号摘要</p>
            <p className="mt-2 text-sm leading-7 text-[#BED2E8]">{signal.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {signal.keywords.map((keyword) => (
                <Badge
                  key={keyword}
                  variant="outline"
                  className="border-white/[0.08] text-[#86A3C3]"
                >
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#1677FF]/18 bg-[#1677FF]/[0.06] p-5">
            <p className="flex items-center gap-2 text-xs text-[#72C8FF]">
              <Bot className="size-4" /> AI 推荐行动
            </p>
            <p className="mt-2 text-sm leading-6 text-[#D8E8FF]">
              {signal.recommendation}
            </p>
          </div>
          <Button
            className="h-12 w-full bg-[#1677FF]"
            disabled={converting}
            onClick={convert}
          >
            {converting ? <Loader2 className="animate-spin" /> : <Target />}
            加入机会池
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-11 border-white/10"
              onClick={onPeople}
            >
              <UserRoundSearch /> 查找决策人
            </Button>
            <a
              href={signal.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm font-medium transition hover:bg-white/[0.08] active:translate-y-px"
            >
              <ExternalLink className="size-4" /> 查看演示原文
            </a>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionTitle({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#4A9FE6]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-sm font-semibold sm:text-base">{title}</h2>
      </div>
      {action && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAction}
          className="h-9 text-[10px] text-[#72C8FF]"
        >
          {action} <ArrowRight />
        </Button>
      )}
    </div>
  );
}

function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-[#86A3C3]">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

function MiniSelect({
  value,
  onChange,
  children,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => nextValue && onChange(nextValue)}
    >
      <SelectTrigger
        aria-label={label}
        className="h-9 w-[112px] border-white/[0.08] bg-[#061426]/55 text-[10px]"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

function SignalBadge({ level }: { level: MarketSignal["level"] }) {
  const config = {
    HIGH: ["高潜信号", "border-[#38D996]/20 bg-[#38D996]/10 text-[#7EE7B8]"],
    MEDIUM: ["中潜信号", "border-[#3DDCFF]/20 bg-[#3DDCFF]/10 text-[#92EDFF]"],
    LOW: ["一般信号", "border-[#FFB547]/20 bg-[#FFB547]/10 text-[#FFD08A]"],
  }[level];
  return <Badge className={cn("border text-[9px]", config[1])}>{config[0]}</Badge>;
}

function SignalMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="font-mono text-xs text-[#BED2E8]">{value}</p>
      <p className="mt-1 text-[9px] text-[#5E7E9F]">{label}</p>
    </div>
  );
}

function MetricTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "cyan" | "green";
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
      <p className="text-[9px] text-[#6E8BAA]">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold",
          color === "cyan" && "text-[#3DDCFF]",
          color === "green" && "text-[#38D996]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SourceStatus({ status }: { status: DataSource["status"] }) {
  const config = {
    connected: ["已连接", "bg-[#38D996]/10 text-[#7EE7B8]"],
    paused: ["已暂停", "bg-white/[0.05] text-[#86A3C3]"],
    error: ["异常", "bg-[#FF647C]/10 text-[#FFA6B4]"],
    unconfigured: ["未配置", "bg-[#FFB547]/10 text-[#FFD08A]"],
  }[status];
  return <Badge className={cn("text-[9px]", config[1])}>{config[0]}</Badge>;
}

function InfoList({ items }: { items: [string, string][] }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0B1F36] p-4">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="flex min-h-11 items-center gap-3 border-b border-white/[0.055] last:border-0"
        >
          <span className="w-24 shrink-0 text-[10px] text-[#6E8BAA]">{label}</span>
          <span className="text-xs text-[#BED2E8]">{value}</span>
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-[10px] text-[#86A3C3]">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function EmptyMini({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-[310px] place-items-center text-center">
      <div>
        <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-white/[0.035] text-[#5E7E9F]">
          {icon}
        </span>
        <p className="mt-3 text-xs font-medium text-[#ABC3DB]">{title}</p>
        <p className="mx-auto mt-1 max-w-xs text-[10px] leading-5 text-[#5E7E9F]">
          {description}
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="glass-card grid min-h-[320px] place-items-center rounded-2xl border border-dashed border-white/[0.09] p-6 text-center">
      <div>
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#1677FF]/10 text-[#72C8FF] [&_svg]:size-6">
          {icon}
        </span>
        <h3 className="mt-4 text-sm font-semibold">{title}</h3>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#6E8BAA]">
          {description}
        </p>
        <Button className="mt-5 h-11 bg-[#1677FF]" onClick={onAction}>
          {action} <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="grid min-h-[65vh] place-items-center text-center">
      <div>
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#FF647C]/10 text-[#FF8C9D]">
          <AlertCircle />
        </span>
        <h2 className="mt-4 text-base font-semibold">工作台加载失败</h2>
        <p className="mt-2 text-xs text-[#86A3C3]">{message}</p>
        <Button onClick={onRetry} className="mt-5 h-11 bg-[#1677FF]">
          <RefreshCw /> 重新加载
        </Button>
      </div>
    </div>
  );
}

function AppLoading() {
  return (
    <div className="space-y-5" aria-label="正在加载工作台">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40 bg-white/[0.06]" />
          <Skeleton className="h-3 w-72 bg-white/[0.04]" />
        </div>
        <Skeleton className="h-11 w-32 bg-white/[0.06]" />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl bg-white/[0.045]" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[520px] rounded-2xl bg-white/[0.045]" />
        <Skeleton className="h-[520px] rounded-2xl bg-white/[0.045]" />
      </div>
    </div>
  );
}

function formatRelative(value: string) {
  const date = new Date(value);
  const now = new Date("2026-08-31T08:51:00Z");
  const hours = Math.max(0, Math.round((now.getTime() - date.getTime()) / 3600000));
  if (hours < 1) return "刚刚";
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

function formatTaskTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(date);
}
