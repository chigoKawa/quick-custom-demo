"use client";

import React from "react";
import { Search, ChevronRight, CreditCard, ShieldCheck, ArrowUpRight, Percent, RefreshCw, Store, HelpCircle, UserCheck } from "lucide-react";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import { Inspectable } from "./inspectable";
import type { MicrocopyMap } from "./app-shell";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  payments: <ArrowUpRight className="h-5 w-5" />,
  cards: <CreditCard className="h-5 w-5" />,
  cashback: <Percent className="h-5 w-5" />,
  security: <ShieldCheck className="h-5 w-5" />,
  "account-kyc": <UserCheck className="h-5 w-5" />,
  "transfers-p2p": <RefreshCw className="h-5 w-5" />,
  refunds: <RefreshCw className="h-5 w-5" />,
  "merchants-offers": <Store className="h-5 w-5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  payments: "#E8F0FE",
  cards: "#FDE8EE",
  cashback: "#E8FAF0",
  security: "#F0E8F2",
  "account-kyc": "#FFF3E8",
  "transfers-p2p": "#E8F4FD",
  refunds: "#F5F5E8",
  "merchants-offers": "#FDE8F5",
};

const CATEGORY_ICON_COLORS: Record<string, string> = {
  payments: "#3B82F6",
  cards: "#FF4D6D",
  cashback: "#22C55E",
  security: "#2D0A31",
  "account-kyc": "#F97316",
  "transfers-p2p": "#0EA5E9",
  refunds: "#A3A300",
  "merchants-offers": "#D946EF",
};

interface KbCategory {
  sys: { id: string };
  fields: {
    name?: string;
    slug?: string;
    description?: string;
  };
}

interface Props {
  microcopy: MicrocopyMap;
  kbCategories: KbCategory[];
}

function CategoryCard({ cat }: { cat: KbCategory }) {
  const inspectorProps = useContentfulInspectorMode({ entryId: cat.sys.id });
  const slug = cat.fields.slug ?? "";
  const iconBg = CATEGORY_COLORS[slug] ?? "#F0E8F2";
  const iconColor = CATEGORY_ICON_COLORS[slug] ?? "#2D0A31";
  const icon = CATEGORY_ICONS[slug] ?? <HelpCircle className="h-5 w-5" />;

  return (
    <button className="bg-white rounded-2xl p-4 text-left shadow-sm flex flex-col gap-2 active:scale-95 transition-transform">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div>
        <p
          {...inspectorProps({ fieldId: "name" })}
          className="text-sm font-semibold text-gray-900 leading-tight"
        >
          {cat.fields.name ?? ""}
        </p>
        {cat.fields.description && (
          <p
            {...inspectorProps({ fieldId: "description" })}
            className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed"
          >
            {cat.fields.description}
          </p>
        )}
      </div>
    </button>
  );
}

export default function HelpContact({ microcopy, kbCategories }: Props) {
  const mc = (key: string, fallback = "") => microcopy[key]?.value ?? fallback;
  const mcId = (key: string) => microcopy[key]?.entryId ?? "";

  return (
    <div className="flex flex-col" style={{ background: "#F5F4F8", minHeight: "100%" }}>
      {/* Header */}
      <div
        className="px-5 pt-5 pb-5"
        style={{ background: "linear-gradient(135deg, #2D0A31 0%, #4a1050 100%)" }}
      >
        <h2 className="text-xl font-bold text-white mb-1">
          {mcId("app.help.title") ? (
            <Inspectable entryId={mcId("app.help.title")} fieldId="value">
              {mc("app.help.title", "Help & Support")}
            </Inspectable>
          ) : mc("app.help.title", "Help & Support")}
        </h2>
        <p className="text-xs text-white opacity-60">
          {mcId("app.help.subtitle") ? (
            <Inspectable entryId={mcId("app.help.subtitle")} fieldId="value">
              {mc("app.help.subtitle", "Find answers to your questions")}
            </Inspectable>
          ) : mc("app.help.subtitle", "Find answers to your questions")}
        </p>

        {/* Search */}
        <div className="mt-4 flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2.5">
          <Search className="h-4 w-4 text-white opacity-60 flex-shrink-0" />
          <span className="text-xs text-white opacity-50">
            {mcId("app.search.placeholder") ? (
              <Inspectable entryId={mcId("app.search.placeholder")} fieldId="value">
                {mc("app.search.placeholder", "Search for help...")}
              </Inspectable>
            ) : mc("app.search.placeholder", "Search for help...")}
          </span>
        </div>
      </div>

      {/* AI suggestion banner */}
      <div className="mx-4 mt-4 rounded-2xl px-4 py-3 flex items-start gap-3" style={{ background: "#2D0A31" }}>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: "#FF4D6D" }}
        >
          <HelpCircle className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold text-white mb-0.5">
            {mcId("app.ai.label") ? (
              <Inspectable entryId={mcId("app.ai.label")} fieldId="value">
                {mc("app.ai.label", "Rebell AI")}
              </Inspectable>
            ) : mc("app.ai.label", "Rebell AI")}
          </p>
          <p className="text-xs text-white opacity-70 leading-relaxed">
            {mcId("app.ai.placeholder") ? (
              <Inspectable entryId={mcId("app.ai.placeholder")} fieldId="value">
                {mc("app.ai.placeholder", "Ask me anything about your account...")}
              </Inspectable>
            ) : mc("app.ai.placeholder", "Ask me anything about your account...")}
          </p>
        </div>
      </div>

      {/* Categories grid */}
      <div className="px-4 pt-5 pb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {mcId("app.help.categories.label") ? (
            <Inspectable entryId={mcId("app.help.categories.label")} fieldId="value">
              {mc("app.help.categories.label", "Browse topics")}
            </Inspectable>
          ) : mc("app.help.categories.label", "Browse topics")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {kbCategories.map((cat) => (
            <CategoryCard key={cat.sys.id} cat={cat} />
          ))}
        </div>
      </div>

      {/* Contact options */}
      <div className="px-4 pb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {mcId("app.contact.label") ? (
            <Inspectable entryId={mcId("app.contact.label")} fieldId="value">
              {mc("app.contact.label", "Contact us")}
            </Inspectable>
          ) : mc("app.contact.label", "Contact us")}
        </p>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {[
            { label: mc("app.contact.chat", "Live Chat"), sub: mc("app.contact.chat.sub", "Avg. 2 min response"), icon: "💬" },
            { label: mc("app.contact.email", "Email Support"), sub: mc("app.contact.email.sub", "Within 24 hours"), icon: "✉️" },
          ].map((item, i) => (
            <div
              key={item.label}
              className="flex items-center px-4 py-3 gap-3"
              style={{ borderBottom: i === 0 ? "1px solid #F5F4F8" : undefined }}
            >
              <span className="text-xl">{item.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-400">{item.sub}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
