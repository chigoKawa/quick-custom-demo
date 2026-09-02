"use client";

import React from "react";
import { Clock } from "lucide-react";
import { Inspectable } from "./inspectable";
import { useAppTheme } from "./theme-context";
import {
  useLiveEntry,
  useLiveFieldValue,
  LiveField,
  LiveMicrocopy,
  useMicrocopyValue,
} from "./entries-context";

// Mock data per widget type. In a real demo, dataSource="api" would swap these
// for fetches against an actual service.
const MOCK = {
  latestTransactions: [
    { name: "Pret a Manger", amount: -4.95, date: "Today", icon: "🥐" },
    { name: "Salary — Acme Ltd", amount: 2840.0, date: "Yesterday", positive: true, icon: "💼" },
    { name: "Transport for London", amount: -16.4, date: "Yesterday", icon: "🚇" },
    { name: "Tesco Express", amount: -22.18, date: "23 Jun", icon: "🛒" },
    { name: "Netflix", amount: -10.99, date: "22 Jun", icon: "🎬" },
  ],
  accountSummary: {
    available: 3284.5,
    pending: -42.99,
    overdraft: 500.0,
  },
  spending: [
    { label: "Groceries", value: 230, color: "#0A2240" },
    { label: "Transport", value: 145, color: "#DC0032" },
    { label: "Eating out", value: 110, color: "#F2C166" },
    { label: "Bills", value: 380, color: "#0EA5E9" },
  ],
};

function gbp(n: number) {
  const abs = Math.abs(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? "-" : ""}£${abs}`;
}

// ============================================================
// Widget dispatch
// ============================================================

type WidgetType =
  | "latestTransactions"
  | "accountSummary"
  | "spendingByCategory"
  | "exchangeRates"
  | "savingsGoal"
  | "cashbackProgress"
  | "rateComparison"
  | "cardControls"
  | "investmentSnapshot"
  | "billsDue"
  // Health-oriented widgets — generic to any health/wellbeing app.
  | "wellbeingTrend"
  | "medicationAdherence";

const REGISTRY: Partial<Record<WidgetType, React.FC<{ widgetId: string; moduleId: string }>>> = {
  latestTransactions: LatestTransactionsWidget,
  accountSummary: AccountSummaryWidget,
  spendingByCategory: SpendingWidget,
  savingsGoal: SavingsGoalWidget,
  wellbeingTrend: WellbeingTrendWidget,
  medicationAdherence: MedicationAdherenceWidget,
};

export default function WidgetRenderer({ widgetId, moduleId }: { widgetId: string; moduleId: string }) {
  const entry = useLiveEntry(widgetId);
  const widgetType = entry?.fields?.widgetType as WidgetType | undefined;
  if (!widgetType) return null;
  const Component = REGISTRY[widgetType] ?? FallbackWidget;
  return <Component widgetId={widgetId} moduleId={moduleId} />;
}

// ============================================================
// Title helper — prefer widget.title (live), fallback to microcopy key
// ============================================================

function WidgetTitle({
  widgetId,
  microcopyKey,
  fallback,
}: {
  widgetId: string;
  microcopyKey: string;
  fallback: string;
}) {
  const theme = useAppTheme();
  const title = useLiveFieldValue<string>(widgetId, "title");
  if (title) {
    return (
      <Inspectable
        entryId={widgetId}
        fieldId="title"
        as="p"
        className="text-sm font-semibold"
        style={{ color: theme.textPrimary }}
      >
        {title}
      </Inspectable>
    );
  }
  return (
    <LiveMicrocopy
      k={microcopyKey}
      fallback={fallback}
      as="p"
      className="text-sm font-semibold"
      style={{ color: theme.textPrimary }}
    />
  );
}

// ============================================================
// Widgets
// ============================================================

function LatestTransactionsWidget({ widgetId }: { widgetId: string; moduleId: string }) {
  const theme = useAppTheme();
  const config = useLiveFieldValue<{ limit?: number }>(widgetId, "config");
  const limit = config?.limit ?? 5;
  const items = MOCK.latestTransactions.slice(0, limit);
  const viewAll = useMicrocopyValue("app.widget.transactions.viewAll", "View all");

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between mb-2 px-1">
        <WidgetTitle widgetId={widgetId} microcopyKey="app.widget.transactions.title" fallback="Latest transactions" />
        <button className="text-xs font-medium" style={{ color: theme.primary }}>
          {viewAll}
        </button>
      </div>
      <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: theme.surface }}>
        {items.map((tx, i) => (
          <div
            key={tx.name}
            className="flex items-center px-4 py-3 gap-3"
            style={{ borderBottom: i < items.length - 1 ? `1px solid ${theme.borderSubtle}` : undefined }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ background: theme.surfaceMuted }}>
              {tx.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{tx.name}</p>
              <p className="text-xs" style={{ color: theme.textMuted }}>{tx.date}</p>
            </div>
            <span
              className="text-sm font-semibold tabular-nums"
              style={{ color: tx.positive ? theme.success : theme.textPrimary }}
            >
              {tx.positive ? `+${gbp(tx.amount)}` : gbp(tx.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountSummaryWidget({ widgetId }: { widgetId: string; moduleId: string }) {
  const theme = useAppTheme();
  const available = useMicrocopyValue("app.widget.account.available", "Available");
  const pending = useMicrocopyValue("app.widget.account.pending", "Pending");
  const overdraft = useMicrocopyValue("app.widget.account.overdraft", "Overdraft");

  return (
    <div className="px-4 pt-4">
      <div className="rounded-2xl shadow-sm p-4" style={{ background: theme.surface }}>
        <WidgetTitle widgetId={widgetId} microcopyKey="app.widget.account.title" fallback="Account overview" />
        <div className="grid grid-cols-3 gap-3 mt-3">
          <SummaryStat label={available} amount={MOCK.accountSummary.available} />
          <SummaryStat label={pending} amount={MOCK.accountSummary.pending} negative />
          <SummaryStat label={overdraft} amount={MOCK.accountSummary.overdraft} muted />
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, amount, negative, muted }: { label: string; amount: number; negative?: boolean; muted?: boolean }) {
  const theme = useAppTheme();
  const color = muted ? theme.textMuted : negative ? theme.danger : theme.textPrimary;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: theme.textMuted }}>{label}</p>
      <p className="text-base font-bold tabular-nums" style={{ color }}>{gbp(amount)}</p>
    </div>
  );
}

function SpendingWidget({ widgetId }: { widgetId: string; moduleId: string }) {
  const theme = useAppTheme();
  const total = MOCK.spending.reduce((sum, s) => sum + s.value, 0);
  const subtitle = useMicrocopyValue("app.widget.spending.subtitle", "This month so far");
  return (
    <div className="px-4 pt-4">
      <div className="rounded-2xl shadow-sm p-4" style={{ background: theme.surface }}>
        <div className="flex items-baseline justify-between mb-1">
          <WidgetTitle widgetId={widgetId} microcopyKey="app.widget.spending.title" fallback="Where your money goes" />
          <span className="text-xs font-bold tabular-nums" style={{ color: theme.textPrimary }}>{gbp(total)}</span>
        </div>
        <p className="text-xs mb-3" style={{ color: theme.textMuted }}>{subtitle}</p>
        <div className="flex w-full h-2 rounded-full overflow-hidden mb-3" style={{ background: theme.surfaceMuted }}>
          {MOCK.spending.map((s) => (
            <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {MOCK.spending.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              <span className="text-xs flex-1" style={{ color: theme.textPrimary }}>{s.label}</span>
              <span className="text-xs tabular-nums" style={{ color: theme.textMuted }}>{gbp(s.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SavingsGoalWidget({ widgetId }: { widgetId: string; moduleId: string }) {
  const theme = useAppTheme();
  const cfg = useLiveFieldValue<{ current?: number; target?: number }>(widgetId, "config") ?? {};
  const current = cfg.current ?? 740;
  const target = cfg.target ?? 1200;
  const pct = Math.min(100, Math.round((current / target) * 100));
  const subtitle = useMicrocopyValue("app.widget.savings.subtitle", "On track");
  const cta = useMicrocopyValue("app.widget.savings.cta", "Add money");

  return (
    <div className="px-4 pt-4">
      <div className="rounded-2xl shadow-sm p-4" style={{ background: theme.surface }}>
        <div className="flex items-baseline justify-between">
          <WidgetTitle widgetId={widgetId} microcopyKey="app.widget.savings.title" fallback="Holiday fund" />
          <span className="text-xs font-semibold" style={{ color: theme.success }}>+{pct}%</span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{subtitle}</p>
        <div className="mt-3 mb-2 h-2 rounded-full overflow-hidden" style={{ background: theme.surfaceMuted }}>
          <div className="h-full" style={{ width: `${pct}%`, background: theme.primary }} />
        </div>
        <div className="flex items-baseline justify-between">
          <p className="text-lg font-bold tabular-nums" style={{ color: theme.textPrimary }}>{gbp(current)}</p>
          <p className="text-xs tabular-nums" style={{ color: theme.textMuted }}>of {gbp(target)}</p>
        </div>
        <button
          className="mt-3 w-full py-2 rounded-lg text-xs font-semibold"
          style={{ background: theme.primary, color: theme.textInverse }}
        >
          {cta}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Health widgets — content/config-driven, no domain-specific data
// baked in. Both read an optional `config` JSON (with sensible mock
// fallbacks) so they work for any health or wellbeing app.
// ============================================================

type WellbeingConfig = {
  score?: number;
  unit?: string;
  days?: number[];
  delta?: number;
};

function WellbeingTrendWidget({ widgetId }: { widgetId: string; moduleId: string }) {
  const theme = useAppTheme();
  const cfg = useLiveFieldValue<WellbeingConfig>(widgetId, "config") ?? {};
  const days = cfg.days && cfg.days.length > 0 ? cfg.days : [58, 64, 61, 70, 66, 74, 72];
  const score = cfg.score ?? days[days.length - 1];
  const unit = cfg.unit ?? "/ 100";
  const delta = cfg.delta ?? 8;
  const positive = delta >= 0;
  const max = Math.max(...days, 1);
  const subtitle = useMicrocopyValue("app.widget.wellbeing.subtitle", "Based on your daily check-ins");

  return (
    <div className="px-4 pt-4">
      <div className="rounded-2xl shadow-sm p-4" style={{ background: theme.surface }}>
        <div className="flex items-baseline justify-between mb-1">
          <WidgetTitle widgetId={widgetId} microcopyKey="app.widget.wellbeing.title" fallback="Wellbeing this week" />
          <span className="text-xs font-semibold" style={{ color: positive ? theme.success : theme.danger }}>
            {positive ? "+" : ""}
            {delta}%
          </span>
        </div>
        <p className="text-xs mb-3" style={{ color: theme.textMuted }}>{subtitle}</p>
        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-2xl font-bold tabular-nums" style={{ color: theme.textPrimary }}>{score}</span>
          <span className="text-xs" style={{ color: theme.textMuted }}>{unit}</span>
        </div>
        <div className="flex items-end gap-1.5" style={{ height: 56 }}>
          {days.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-md transition-all"
              style={{
                height: `${Math.max(8, (v / max) * 100)}%`,
                background: i === days.length - 1 ? theme.primary : theme.surfaceMuted,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type MedicationConfig = {
  taken?: number;
  total?: number;
  nextDose?: string;
};

function MedicationAdherenceWidget({ widgetId }: { widgetId: string; moduleId: string }) {
  const theme = useAppTheme();
  const cfg = useLiveFieldValue<MedicationConfig>(widgetId, "config") ?? {};
  const taken = cfg.taken ?? 6;
  const total = cfg.total ?? 7;
  const pct = total > 0 ? Math.min(100, Math.round((taken / total) * 100)) : 0;
  const nextDose = cfg.nextDose ?? "Tonight, 20:00";
  const takenLabel = useMicrocopyValue("app.widget.medication.taken", "doses taken");
  const nextLabel = useMicrocopyValue("app.widget.medication.next", "Next dose");

  const r = 26;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="px-4 pt-4">
      <div className="rounded-2xl shadow-sm p-4 flex items-center gap-4" style={{ background: theme.surface }}>
        <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={r} fill="none" stroke={theme.surfaceMuted} strokeWidth="6" />
            <circle
              cx="32"
              cy="32"
              r={r}
              fill="none"
              stroke={theme.success}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              transform="rotate(-90 32 32)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold tabular-nums" style={{ color: theme.textPrimary }}>{pct}%</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <WidgetTitle widgetId={widgetId} microcopyKey="app.widget.medication.title" fallback="Medication" />
          <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
            {taken} of {total} {takenLabel}
          </p>
          <div
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1"
            style={{ background: theme.surfaceMuted }}
          >
            <Clock className="h-3.5 w-3.5" style={{ color: theme.primary }} />
            <span className="text-[11px] font-medium" style={{ color: theme.textPrimary }}>
              {nextLabel}: {nextDose}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FallbackWidget({ widgetId }: { widgetId: string; moduleId: string }) {
  const widgetType = useLiveFieldValue<string>(widgetId, "widgetType");
  return (
    <div className="m-4 p-3 rounded-lg bg-blue-50 text-blue-800 text-xs">
      Widget type <code>{widgetType}</code> is not registered yet.
    </div>
  );
}

// Keep imports referenced
void LiveField;
