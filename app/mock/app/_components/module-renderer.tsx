"use client";

import React from "react";
import {
  Send,
  CreditCard,
  PiggyBank,
  Percent,
  FileText,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  MessageCircle,
  Mail,
  Phone,
} from "lucide-react";
import { emphasisToBackground, type AppTheme } from "./theme";
import { useAppTheme } from "./theme-context";
import {
  useLiveEntry,
  useLiveLinkedId,
  useLiveLinkedIds,
  useLiveFieldValue,
  LiveField,
  LiveRichText,
  LiveMicrocopy,
  useMicrocopyValue,
} from "./entries-context";
import WidgetRenderer from "./widget-renderer";

const TAGLINE_ICONS: Record<string, React.ReactNode> = {
  send: <Send className="h-5 w-5" />,
  "credit-card": <CreditCard className="h-5 w-5" />,
  "piggy-bank": <PiggyBank className="h-5 w-5" />,
  percent: <Percent className="h-5 w-5" />,
  "file-text": <FileText className="h-5 w-5" />,
  "shield-check": <ShieldCheck className="h-5 w-5" />,
};

// ============================================================
// Module dispatch — by `moduleType` field of the live entry
// ============================================================

type ModuleType =
  | "heroCard"
  | "promoBanner"
  | "quickActions"
  | "featureTiles"
  | "articleList"
  | "faq"
  | "supportCTA"
  | "banner"
  | "widget"
  | "notificationList";

const MODULE_RENDERERS: Partial<Record<ModuleType, React.FC<{ moduleId: string }>>> = {
  heroCard: HeroCard,
  promoBanner: PromoBanner,
  quickActions: QuickActions,
  featureTiles: FeatureTiles,
  articleList: ArticleList,
  faq: FaqAccordion,
  supportCTA: SupportCTA,
  banner: Banner,
  widget: WidgetModule,
  notificationList: NotificationList,
};

export default function ModuleRenderer({ moduleId }: { moduleId: string }) {
  const entry = useLiveEntry(moduleId);
  const moduleType = entry?.fields?.moduleType as ModuleType | undefined;
  if (!moduleType) return null;
  const Component = MODULE_RENDERERS[moduleType];
  if (!Component) {
    return (
      <div className="m-4 p-3 rounded-lg bg-amber-50 text-amber-800 text-xs">
        Unknown moduleType: <code>{moduleType}</code>
      </div>
    );
  }
  return <Component moduleId={moduleId} />;
}

// ============================================================
// Variants — each reads its data live, subscribed per-entry
// ============================================================

function HeroCard({ moduleId }: { moduleId: string }) {
  const theme = useAppTheme();
  const emphasis = useLiveFieldValue<string>(moduleId, "emphasis");
  const topicId = useLiveLinkedId(moduleId, "topic");
  const buttonIds = useLiveLinkedIds(moduleId, "buttons");
  const { background, foreground } = emphasisToBackground(theme, emphasis);

  if (!topicId) return null;

  return (
    <div className="px-5 pt-5 pb-6" style={{ background, color: foreground }}>
      <LiveField
        entryId={topicId}
        fieldId="tagline"
        as="p"
        className="text-xs font-medium opacity-80 uppercase tracking-widest mb-1"
      />
      <LiveField
        entryId={topicId}
        fieldId="title"
        as="h2"
        className="text-xl font-bold leading-tight"
      />
      <div className="mt-2 opacity-90">
        <LiveRichText entryId={topicId} fieldId="body" />
      </div>

      {buttonIds.length > 0 ? (
        <div className="flex gap-3 mt-4">
          {buttonIds.map((id) => (
            <LiveButton key={id} buttonId={id} primary />
          ))}
        </div>
      ) : (
        emphasis === "brand" && (
          <div className="flex gap-2 mt-4">
            <MicrocopyActionButton k="app.action.send" icon={<Send className="h-3.5 w-3.5" />} fallback="Pay" primary />
            <MicrocopyActionButton k="app.action.topup" icon={<CreditCard className="h-3.5 w-3.5" />} fallback="Move money" />
            <MicrocopyActionButton k="app.action.deposit" icon={<PiggyBank className="h-3.5 w-3.5" />} fallback="Pay in" />
          </div>
        )
      )}
    </div>
  );
}

function LiveButton({ buttonId, primary }: { buttonId: string; primary?: boolean }) {
  const theme = useAppTheme();
  const style = primary
    ? { background: theme.primary, color: theme.textInverse }
    : { background: "rgba(255,255,255,0.18)", color: theme.textInverse };
  return (
    <LiveField
      entryId={buttonId}
      fieldId="label"
      as="button"
      className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
      style={style}
    />
  );
}

function MicrocopyActionButton({
  k,
  icon,
  fallback,
  primary,
}: {
  k: string;
  icon: React.ReactNode;
  fallback: string;
  primary?: boolean;
}) {
  const theme = useAppTheme();
  const style = primary
    ? { background: theme.primary, color: theme.textInverse }
    : { background: "rgba(255,255,255,0.18)", color: theme.textInverse };
  return (
    <button
      className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
      style={style}
    >
      {icon}
      <LiveMicrocopy k={k} fallback={fallback} />
    </button>
  );
}

function PromoBanner({ moduleId }: { moduleId: string }) {
  const theme = useAppTheme();
  const emphasis = useLiveFieldValue<string>(moduleId, "emphasis");
  const topicId = useLiveLinkedId(moduleId, "topic");
  const buttonIds = useLiveLinkedIds(moduleId, "buttons");
  const { background, foreground } = emphasisToBackground(theme, emphasis ?? "accent");

  if (!topicId) return null;

  return (
    <div className="mx-4 my-3 rounded-2xl overflow-hidden" style={{ background, color: foreground }}>
      <div className="p-4">
        <LiveField
          entryId={topicId}
          fieldId="tagline"
          as="p"
          className="text-[10px] font-semibold uppercase tracking-wider opacity-80"
        />
        <LiveField
          entryId={topicId}
          fieldId="title"
          as="h3"
          className="text-base font-bold leading-tight mt-1"
        />
        <div className="text-xs opacity-90 mt-2">
          <LiveRichText entryId={topicId} fieldId="body" />
        </div>
        <PromoCTA buttonId={buttonIds[0]} foreground={foreground} />
      </div>
    </div>
  );
}

function PromoCTA({ buttonId, foreground }: { buttonId?: string; foreground: string }) {
  if (buttonId) {
    return (
      <div className="mt-3">
        <LiveField
          entryId={buttonId}
          fieldId="label"
          as="button"
          className="px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
          style={{ background: "rgba(255,255,255,0.2)", color: foreground }}
        />
      </div>
    );
  }
  return (
    <button
      className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
      style={{ background: "rgba(255,255,255,0.2)", color: foreground }}
    >
      Learn more
      <ChevronRight className="h-3 w-3" />
    </button>
  );
}

function QuickActions({ moduleId }: { moduleId: string }) {
  const theme = useAppTheme();
  const topicIds = useLiveLinkedIds(moduleId, "topics");

  return (
    <div className="px-5 pt-4">
      <LiveMicrocopy
        k="app.shortcuts.label"
        fallback="Quick actions"
        as="p"
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: theme.textMuted }}
      />
      <div className="grid grid-cols-4 gap-2">
        {topicIds.map((id) => (
          <QuickActionTile key={id} topicId={id} theme={theme} />
        ))}
      </div>
    </div>
  );
}

function QuickActionTile({ topicId, theme }: { topicId: string; theme: AppTheme }) {
  const tagline = useLiveFieldValue<string>(topicId, "tagline") ?? "";
  const icon = TAGLINE_ICONS[tagline] ?? <CreditCard className="h-5 w-5" />;
  return (
    <button
      className="flex flex-col items-center gap-1.5 rounded-2xl py-3 px-1 shadow-sm"
      style={{ background: theme.surface }}
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-xl"
        style={{ background: theme.surfaceMuted, color: theme.primary }}
      >
        {icon}
      </div>
      <LiveField
        entryId={topicId}
        fieldId="title"
        as="span"
        className="text-[10px] font-medium text-center leading-tight"
        style={{ color: theme.textPrimary }}
      />
    </button>
  );
}

function FeatureTiles({ moduleId }: { moduleId: string }) {
  const theme = useAppTheme();
  const topicIds = useLiveLinkedIds(moduleId, "topics");
  return (
    <div className="px-4 pt-3 grid grid-cols-2 gap-3">
      {topicIds.map((id) => (
        <FeatureTile key={id} topicId={id} theme={theme} />
      ))}
    </div>
  );
}

function FeatureTile({ topicId, theme }: { topicId: string; theme: AppTheme }) {
  const media = useLiveFieldValue<{ fields?: { file?: { url?: string }; title?: string } }>(topicId, "media");
  const mediaUrl = media?.fields?.file?.url;
  const fullUrl = mediaUrl?.startsWith("//") ? `https:${mediaUrl}` : mediaUrl;
  return (
    <div className="rounded-2xl p-3 shadow-sm" style={{ background: theme.surface }}>
      {fullUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fullUrl} alt={media?.fields?.title ?? ""} className="w-full h-20 object-cover rounded-lg mb-2" />
      )}
      <LiveField
        entryId={topicId}
        fieldId="title"
        as="p"
        className="text-sm font-semibold"
        style={{ color: theme.textPrimary }}
      />
      <LiveField
        entryId={topicId}
        fieldId="tagline"
        as="p"
        className="text-[10px] uppercase tracking-wide mt-0.5"
        style={{ color: theme.textMuted }}
      />
    </div>
  );
}

function ArticleList({ moduleId }: { moduleId: string }) {
  const theme = useAppTheme();
  const topicIds = useLiveLinkedIds(moduleId, "topics");
  const articleIds = useLiveLinkedIds(moduleId, "articles");
  const ids = topicIds.length > 0 ? topicIds : articleIds;

  return (
    <div className="px-5 pt-5 pb-3">
      <LiveMicrocopy
        k="app.articles.label"
        fallback="Articles"
        as="p"
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: theme.textMuted }}
      />
      <div className="flex flex-col gap-3">
        {ids.map((id) => (
          <ArticleRow key={id} entryId={id} theme={theme} preferTopicShape={topicIds.includes(id)} />
        ))}
      </div>
    </div>
  );
}

function ArticleRow({
  entryId,
  theme,
  preferTopicShape,
}: {
  entryId: string;
  theme: AppTheme;
  preferTopicShape: boolean;
}) {
  // generalTopic has a Symbol `tagline`; blogPost/kbArticle have a
  // RichText `summary` document. We only need a compact teaser here, so
  // flatten RichText to plain text (up to the first ~180 chars) instead
  // of rendering the document tree.
  const raw = useLiveFieldValue<unknown>(entryId, preferTopicShape ? "tagline" : "summary");
  const tagline = typeof raw === "string" ? raw : richTextToPlainText(raw);

  return (
    <div className="rounded-2xl p-4 shadow-sm flex items-start gap-3" style={{ background: theme.surface }}>
      <div className="flex-1 min-w-0">
        <LiveField
          entryId={entryId}
          fieldId="title"
          as="p"
          className="text-sm font-semibold leading-tight"
          style={{ color: theme.textPrimary }}
        />
        {tagline && (
          <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: theme.textMuted }}>
            {tagline}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 mt-0.5" style={{ color: theme.textMuted }} />
    </div>
  );
}

// Flatten a Contentful RichText document to plain text — walks all text
// nodes and joins paragraphs. Safely handles unknown / undefined input.
function richTextToPlainText(doc: unknown): string | undefined {
  if (!doc || typeof doc !== "object") return undefined;
  const content = (doc as { content?: unknown }).content;
  if (!Array.isArray(content)) return undefined;
  const parts: string[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as { nodeType?: string; value?: string; content?: unknown[] };
    if (typeof n.value === "string") parts.push(n.value);
    if (Array.isArray(n.content)) for (const c of n.content) visit(c);
  };
  for (const block of content) visit(block);
  const flat = parts.join(" ").replace(/\s+/g, " ").trim();
  return flat || undefined;
}

function FaqAccordion({ moduleId }: { moduleId: string }) {
  const theme = useAppTheme();
  const topicIds = useLiveLinkedIds(moduleId, "topics");
  return (
    <div className="px-5 pt-5 pb-3">
      <LiveMicrocopy
        k="app.help.categories.label"
        fallback="Browse topics"
        as="p"
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: theme.textMuted }}
      />
      <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: theme.surface }}>
        {topicIds.map((id, i) => (
          <FaqItem
            key={id}
            topicId={id}
            theme={theme}
            borderBottom={i < topicIds.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function FaqItem({ topicId, theme, borderBottom }: { topicId: string; theme: AppTheme; borderBottom: boolean }) {
  return (
    <details
      className="group"
      style={{ borderBottom: borderBottom ? `1px solid ${theme.borderSubtle}` : undefined }}
    >
      <summary className="cursor-pointer px-4 py-3 flex items-center justify-between gap-2 list-none">
        <LiveField
          entryId={topicId}
          fieldId="title"
          as="span"
          className="text-sm font-medium flex-1"
          style={{ color: theme.textPrimary }}
        />
        <ChevronRight
          className="h-4 w-4 transition-transform group-open:rotate-90"
          style={{ color: theme.textMuted }}
        />
      </summary>
      <div className="px-4 pb-3 -mt-1 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
        <LiveRichText entryId={topicId} fieldId="body" />
      </div>
    </details>
  );
}

function SupportCTA() {
  const theme = useAppTheme();
  return (
    <div className="px-4 pb-6 pt-2">
      <LiveMicrocopy
        k="app.contact.label"
        fallback="Talk to us"
        as="p"
        className="text-xs font-semibold uppercase tracking-wider mb-3 px-1"
        style={{ color: theme.textMuted }}
      />
      <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: theme.surface }}>
        <ContactRow
          icon={<MessageCircle className="h-4 w-4" style={{ color: theme.primary }} />}
          labelKey="app.contact.chat"
          subKey="app.contact.chat.sub"
          fallbackLabel="Live chat"
          theme={theme}
          borderBottom
        />
        <ContactRow
          icon={<Mail className="h-4 w-4" style={{ color: theme.primary }} />}
          labelKey="app.contact.email"
          subKey="app.contact.email.sub"
          fallbackLabel="Send a message"
          theme={theme}
          borderBottom
        />
        <ContactRow
          icon={<Phone className="h-4 w-4" style={{ color: theme.primary }} />}
          labelKey="app.contact.call"
          subKey="app.contact.call.sub"
          fallbackLabel="Call us"
          theme={theme}
        />
      </div>
    </div>
  );
}

function ContactRow({
  icon,
  labelKey,
  subKey,
  fallbackLabel,
  theme,
  borderBottom,
}: {
  icon: React.ReactNode;
  labelKey: string;
  subKey: string;
  fallbackLabel: string;
  theme: AppTheme;
  borderBottom?: boolean;
}) {
  return (
    <div
      className="flex items-center px-4 py-3 gap-3"
      style={{ borderBottom: borderBottom ? `1px solid ${theme.borderSubtle}` : undefined }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: theme.surfaceMuted, color: theme.primary }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <LiveMicrocopy
          k={labelKey}
          fallback={fallbackLabel}
          as="p"
          className="text-sm font-semibold"
          style={{ color: theme.textPrimary }}
        />
        <LiveMicrocopy
          k={subKey}
          fallback=""
          as="p"
          className="text-xs"
          style={{ color: theme.textMuted }}
        />
      </div>
      <ChevronRight className="h-4 w-4" style={{ color: theme.textMuted }} />
    </div>
  );
}

function Banner({ moduleId }: { moduleId: string }) {
  const theme = useAppTheme();
  const emphasis = useLiveFieldValue<string>(moduleId, "emphasis");
  const topicId = useLiveLinkedId(moduleId, "topic");
  const { background, foreground } = emphasisToBackground(theme, emphasis ?? "warning");

  if (!topicId) return null;
  return (
    <div className="mx-4 mt-4 rounded-2xl p-3 flex items-start gap-3" style={{ background, color: foreground }}>
      <HelpCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <LiveField entryId={topicId} fieldId="title" as="p" className="text-xs font-semibold leading-tight" />
        <LiveField entryId={topicId} fieldId="tagline" as="p" className="text-xs opacity-80 mt-0.5" />
      </div>
    </div>
  );
}

function NotificationList({ moduleId }: { moduleId: string }) {
  const theme = useAppTheme();
  const ids = useLiveLinkedIds(moduleId, "notifications");

  if (ids.length === 0) {
    return (
      <div className="px-4 pt-4 pb-6">
        <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: theme.surface }}>
          <PlaceholderNotification subject="Your direct debit was paid" preheader="Council tax · £142.00 — yesterday" borderBottom theme={theme} />
          <PlaceholderNotification subject="Welcome" preheader="Tap to start using your account" theme={theme} />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: theme.surface }}>
        {ids.map((id, i) => (
          <NotificationRow key={id} notifId={id} theme={theme} borderBottom={i < ids.length - 1} />
        ))}
      </div>
    </div>
  );
}

function NotificationRow({
  notifId,
  theme,
  borderBottom,
}: {
  notifId: string;
  theme: AppTheme;
  borderBottom: boolean;
}) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3.5"
      style={{ borderBottom: borderBottom ? `1px solid ${theme.borderSubtle}` : undefined }}
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: theme.surfaceMuted }}>
        <span className="text-base">🔔</span>
      </div>
      <div className="flex-1 min-w-0">
        <LiveField
          entryId={notifId}
          fieldId="subject"
          as="p"
          className="text-sm font-semibold truncate"
          style={{ color: theme.textPrimary }}
        />
        <LiveField
          entryId={notifId}
          fieldId="preheader"
          as="p"
          className="text-xs truncate"
          style={{ color: theme.textMuted }}
        />
      </div>
    </div>
  );
}

function PlaceholderNotification({
  subject,
  preheader,
  borderBottom,
  theme,
}: {
  subject: string;
  preheader: string;
  borderBottom?: boolean;
  theme: AppTheme;
}) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3.5"
      style={{ borderBottom: borderBottom ? `1px solid ${theme.borderSubtle}` : undefined }}
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: theme.surfaceMuted }}>
        <span className="text-base">🔔</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{subject}</p>
        <p className="text-xs" style={{ color: theme.textMuted }}>{preheader}</p>
      </div>
    </div>
  );
}

function WidgetModule({ moduleId }: { moduleId: string }) {
  const widgetId = useLiveLinkedId(moduleId, "widget");
  if (!widgetId) return null;
  return <WidgetRenderer widgetId={widgetId} moduleId={moduleId} />;
}

// Suppress unused-import lint for hooks still referenced via JSX-only signatures.
void useMicrocopyValue;
