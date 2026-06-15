"use client";

import React from "react";
import { MessageCircle, FileText } from "lucide-react";
import type { MicrocopyMap } from "./app-shell";

const CONVERSATIONS = [
  {
    id: "1",
    name: "Rebell Support",
    avatar: "🤖",
    message: "Your card dispute has been resolved. €45.00 has been refunded.",
    time: "10:24",
    unread: true,
  },
  {
    id: "2",
    name: "Rebell AI",
    avatar: "✨",
    message: "Hi! How can I help you today?",
    time: "Yesterday",
    unread: false,
  },
];

const CASES = [
  {
    id: "C-20481",
    title: "Card transaction dispute",
    status: "Resolved",
    statusColor: "#22C55E",
    date: "Jun 8, 2026",
    description: "Dispute for €45.00 charge from HOTEL CENTRALE.",
  },
  {
    id: "C-20390",
    title: "Account verification",
    status: "In review",
    statusColor: "#F97316",
    date: "Jun 3, 2026",
    description: "KYC document review in progress.",
  },
];

interface Props {
  microcopy: MicrocopyMap;
}

export default function ChatsCases({ microcopy }: Props) {
  const mc = (key: string, fallback = "") => microcopy[key]?.value ?? fallback;
  const [tab, setTab] = React.useState<"chats" | "cases">("chats");

  return (
    <div className="flex flex-col" style={{ background: "#F5F4F8", minHeight: "100%" }}>
      {/* Header */}
      <div
        className="px-5 pt-5 pb-4"
        style={{ background: "linear-gradient(135deg, #2D0A31 0%, #4a1050 100%)" }}
      >
        <h2 className="text-xl font-bold text-white">
          {mc("app.chats.title", "Chats & Cases")}
        </h2>
      </div>

      {/* Sub-tabs */}
      <div className="flex bg-white border-b border-gray-100">
        {(["chats", "cases"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors"
            style={{
              color: tab === t ? "#2D0A31" : "#9CA3AF",
              borderBottom: tab === t ? "2px solid #FF4D6D" : "2px solid transparent",
            }}
          >
            {t === "chats" ? <MessageCircle className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
            {t === "chats" ? mc("app.chats.tab", "Chats") : mc("app.cases.tab", "Cases")}
          </button>
        ))}
      </div>

      {tab === "chats" && (
        <div className="flex flex-col gap-0 bg-white mx-4 mt-4 rounded-2xl shadow-sm overflow-hidden">
          {CONVERSATIONS.map((conv, i) => (
            <div
              key={conv.id}
              className="flex items-start gap-3 px-4 py-3.5"
              style={{ borderBottom: i < CONVERSATIONS.length - 1 ? "1px solid #F5F4F8" : undefined }}
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                {conv.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm font-semibold text-gray-900">{conv.name}</p>
                  <span className="text-xs text-gray-400">{conv.time}</span>
                </div>
                <p className="text-xs text-gray-500 truncate leading-relaxed">{conv.message}</p>
              </div>
              {conv.unread && (
                <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: "#FF4D6D" }} />
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "cases" && (
        <div className="flex flex-col gap-3 px-4 mt-4 pb-6">
          {CASES.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm px-4 py-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{c.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.id} · {c.date}</p>
                </div>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: c.statusColor + "20", color: c.statusColor }}
                >
                  {c.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{c.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
