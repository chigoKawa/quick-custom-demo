"use client";

import React from "react";
import { Send, ArrowUpRight, CreditCard, ShieldCheck, RefreshCw, Percent } from "lucide-react";
import { Inspectable } from "./inspectable";
import type { MicrocopyMap } from "./app-shell";

const SHORTCUT_ICONS: Record<string, React.ReactNode> = {
  "app.shortcut.transfer": <ArrowUpRight className="h-5 w-5" />,
  "app.shortcut.cards": <CreditCard className="h-5 w-5" />,
  "app.shortcut.security": <ShieldCheck className="h-5 w-5" />,
  "app.shortcut.cashback": <Percent className="h-5 w-5" />,
};

const SHORTCUT_KEYS = [
  "app.shortcut.transfer",
  "app.shortcut.cards",
  "app.shortcut.security",
  "app.shortcut.cashback",
];

const RECENT_TRANSACTIONS = [
  { name: "Spotify", amount: "-€9.99", date: "Today", icon: "🎵" },
  { name: "Rebell Cashback", amount: "+€2.40", date: "Yesterday", positive: true, icon: "💸" },
  { name: "H&M", amount: "-€34.50", date: "Jun 9", icon: "🛍️" },
  { name: "Bolt", amount: "-€7.20", date: "Jun 8", icon: "⚡" },
];

interface Props {
  microcopy: MicrocopyMap;
}

export default function SupportHome({ microcopy }: Props) {
  const mc = (key: string, fallback = "") => microcopy[key]?.value ?? fallback;
  const mcId = (key: string) => microcopy[key]?.entryId ?? "";

  return (
    <div className="flex flex-col h-full" style={{ background: "#F5F4F8" }}>
      {/* Header */}
      <div
        className="px-5 pt-5 pb-6 text-white"
        style={{ background: "linear-gradient(135deg, #2D0A31 0%, #4a1050 100%)" }}
      >
        <p className="text-xs font-medium opacity-70 uppercase tracking-widest mb-1">
          {mcId("app.greeting.label") ? (
            <Inspectable entryId={mcId("app.greeting.label")} fieldId="value">
              {mc("app.greeting.label", "Good morning")}
            </Inspectable>
          ) : mc("app.greeting.label", "Good morning")}
        </p>
        <h2 className="text-xl font-bold leading-tight">
          {mcId("app.greeting.name") ? (
            <Inspectable entryId={mcId("app.greeting.name")} fieldId="value">
              {mc("app.greeting.name", "Hey, Alex 👋")}
            </Inspectable>
          ) : mc("app.greeting.name", "Hey, Alex 👋")}
        </h2>

        {/* Balance card */}
        <div
          className="mt-4 rounded-2xl px-4 py-4"
          style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}
        >
          <p className="text-xs opacity-60 mb-1">
            {mcId("app.balance.label") ? (
              <Inspectable entryId={mcId("app.balance.label")} fieldId="value">
                {mc("app.balance.label", "Available balance")}
              </Inspectable>
            ) : mc("app.balance.label", "Available balance")}
          </p>
          <p className="text-3xl font-bold tracking-tight">€1,248.00</p>
          <div className="flex gap-4 mt-3">
            <button
              className="flex-1 py-2 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5"
              style={{ background: "#FF4D6D" }}
            >
              <Send className="h-3.5 w-3.5" />
              {mcId("app.action.send") ? (
                <Inspectable entryId={mcId("app.action.send")} fieldId="value">
                  {mc("app.action.send", "Send")}
                </Inspectable>
              ) : mc("app.action.send", "Send")}
            </button>
            <button
              className="flex-1 py-2 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5"
              style={{ background: "rgba(255,255,255,0.18)" }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {mcId("app.action.topup") ? (
                <Inspectable entryId={mcId("app.action.topup")} fieldId="value">
                  {mc("app.action.topup", "Top Up")}
                </Inspectable>
              ) : mc("app.action.topup", "Top Up")}
            </button>
          </div>
        </div>
      </div>

      {/* Shortcuts */}
      <div className="px-5 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {mcId("app.shortcuts.label") ? (
            <Inspectable entryId={mcId("app.shortcuts.label")} fieldId="value">
              {mc("app.shortcuts.label", "Quick actions")}
            </Inspectable>
          ) : mc("app.shortcuts.label", "Quick actions")}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {SHORTCUT_KEYS.map((key) => (
            <button
              key={key}
              className="flex flex-col items-center gap-1.5 bg-white rounded-2xl py-3 px-1 shadow-sm"
            >
              <div
                className="flex items-center justify-center w-9 h-9 rounded-xl"
                style={{ background: "#F0E8F2", color: "#2D0A31" }}
              >
                {SHORTCUT_ICONS[key] ?? <ArrowUpRight className="h-4 w-4" />}
              </div>
              <span className="text-[10px] font-medium text-gray-700 text-center leading-tight">
                {mcId(key) ? (
                  <Inspectable entryId={mcId(key)} fieldId="value">
                    {mc(key, key.split(".").pop() ?? "")}
                  </Inspectable>
                ) : mc(key, key.split(".").pop() ?? "")}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="px-5 pt-5 pb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {mcId("app.transactions.label") ? (
            <Inspectable entryId={mcId("app.transactions.label")} fieldId="value">
              {mc("app.transactions.label", "Recent transactions")}
            </Inspectable>
          ) : mc("app.transactions.label", "Recent transactions")}
        </p>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {RECENT_TRANSACTIONS.map((tx, i) => (
            <div
              key={tx.name}
              className="flex items-center px-4 py-3 gap-3"
              style={{ borderBottom: i < RECENT_TRANSACTIONS.length - 1 ? "1px solid #F5F4F8" : undefined }}
            >
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-base flex-shrink-0">
                {tx.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{tx.name}</p>
                <p className="text-xs text-gray-400">{tx.date}</p>
              </div>
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: tx.positive ? "#22c55e" : "#1A1025" }}
              >
                {tx.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
