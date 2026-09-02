// Server-side: project a fully-resolved appScreen into a compact, JSON-safe
// shape the client renders. We keep sys.id on every entry so the Inspector
// mode can tag the right entry. RichText values are passed through unchanged.
import type {
  IAppScreen,
  IAppModule,
  IAppWidget,
  AppModuleType,
  AppWidgetType,
} from "@/features/contentful/type";
import type { Document } from "@contentful/rich-text-types";

export type SerializedSys = { id: string };

export type SerializedTopic = {
  sys: SerializedSys;
  internalName: string;
  title?: string;
  tagline?: string;
  body?: Document | null;
  mediaUrl?: string | null;
  mediaTitle?: string;
};

export type SerializedButton = {
  sys: SerializedSys;
  label: string;
  url?: string;
  variant?: string;
  color?: string;
  size?: string;
};

export type SerializedArticle = {
  sys: SerializedSys;
  contentTypeId: string;
  title?: string;
  slug?: string;
  summary?: string;
  imageUrl?: string;
};

export type SerializedKbCategory = {
  sys: SerializedSys;
  name?: string;
  slug?: string;
  description?: string;
};

export type SerializedNotification = {
  sys: SerializedSys;
  key?: string;
  channel?: string;
  subject?: string;
  preheader?: string;
};

export type SerializedWidget = {
  sys: SerializedSys;
  widgetType: AppWidgetType;
  title?: string;
  emptyStateCopy?: string;
  config?: Record<string, unknown>;
  dataSource?: "mock" | "api";
};

export type SerializedModule = {
  sys: SerializedSys;
  internalName: string;
  moduleType: AppModuleType;
  topic?: SerializedTopic | null;
  topics?: SerializedTopic[];
  articles?: SerializedArticle[];
  kbCategories?: SerializedKbCategory[];
  buttons?: SerializedButton[];
  widget?: SerializedWidget | null;
  notifications?: SerializedNotification[];
  variant?: string;
  emphasis?: string;
  imageStyle?: string;
  ctaStyle?: string;
  icon?: string;
};

export type SerializedNavItem = {
  sys: SerializedSys;
  labelMicrocopyKey?: string;
  fallbackLabel: string;
  icon?: string;
  screenKey?: string;
  order?: number;
};

export type SerializedNavigation = {
  sys: SerializedSys;
  items: SerializedNavItem[];
};

export type SerializedScreen = {
  sys: SerializedSys;
  screenKey: string;
  title?: string;
  modules: SerializedModule[];
  navigation?: SerializedNavigation | null;
};

// ---------- helpers ----------

function getAssetUrl(asset: unknown): string | null {
  const a = asset as { fields?: { file?: { url?: string } } } | undefined;
  const url = a?.fields?.file?.url;
  if (!url) return null;
  return url.startsWith("//") ? `https:${url}` : url;
}

function getAssetTitle(asset: unknown): string | undefined {
  const a = asset as { fields?: { title?: string } } | undefined;
  return a?.fields?.title;
}

function shallowTopic(t: unknown): SerializedTopic | null {
  const entry = t as
    | { sys?: { id?: string }; fields?: { internalName?: string; title?: string; tagline?: string; body?: Document; media?: unknown } }
    | undefined;
  if (!entry?.sys?.id || !entry.fields) return null;
  return {
    sys: { id: entry.sys.id },
    internalName: entry.fields.internalName ?? "",
    title: entry.fields.title,
    tagline: entry.fields.tagline,
    body: entry.fields.body ?? null,
    mediaUrl: getAssetUrl(entry.fields.media),
    mediaTitle: getAssetTitle(entry.fields.media),
  };
}

function shallowButton(b: unknown): SerializedButton | null {
  const entry = b as
    | { sys?: { id?: string }; fields?: { label?: string; variant?: string; color?: string; size?: string; target?: unknown } }
    | undefined;
  if (!entry?.sys?.id || !entry.fields) return null;
  const target = entry.fields.target as
    | { fields?: { url?: string; slug?: string } }
    | undefined;
  return {
    sys: { id: entry.sys.id },
    label: entry.fields.label ?? "",
    url: target?.fields?.url ?? (target?.fields?.slug ? `/${target.fields.slug}` : undefined),
    variant: entry.fields.variant,
    color: entry.fields.color,
    size: entry.fields.size,
  };
}

function shallowArticle(a: unknown): SerializedArticle | null {
  const entry = a as
    | {
        sys?: { id?: string; contentType?: { sys?: { id?: string } } };
        fields?: { title?: string; slug?: string; summary?: string; featuredImage?: unknown };
      }
    | undefined;
  if (!entry?.sys?.id || !entry.fields) return null;
  return {
    sys: { id: entry.sys.id },
    contentTypeId: entry.sys.contentType?.sys?.id ?? "",
    title: entry.fields.title,
    slug: entry.fields.slug,
    summary: entry.fields.summary,
    imageUrl: getAssetUrl(entry.fields.featuredImage) ?? undefined,
  };
}

function shallowKbCategory(c: unknown): SerializedKbCategory | null {
  const entry = c as
    | { sys?: { id?: string }; fields?: { name?: string; slug?: string; description?: string } }
    | undefined;
  if (!entry?.sys?.id || !entry.fields) return null;
  return {
    sys: { id: entry.sys.id },
    name: entry.fields.name,
    slug: entry.fields.slug,
    description: entry.fields.description,
  };
}

function shallowNotification(n: unknown): SerializedNotification | null {
  const entry = n as
    | { sys?: { id?: string }; fields?: { key?: string; channel?: string; subject?: string; preheader?: string } }
    | undefined;
  if (!entry?.sys?.id || !entry.fields) return null;
  return {
    sys: { id: entry.sys.id },
    key: entry.fields.key,
    channel: entry.fields.channel,
    subject: entry.fields.subject,
    preheader: entry.fields.preheader,
  };
}

function shallowWidget(w: unknown): SerializedWidget | null {
  const entry = w as IAppWidget | undefined;
  if (!entry?.sys?.id || !entry.fields) return null;
  return {
    sys: { id: entry.sys.id },
    widgetType: entry.fields.widgetType as AppWidgetType,
    title: entry.fields.title,
    emptyStateCopy: entry.fields.emptyStateCopy,
    config: (entry.fields.config as Record<string, unknown>) ?? undefined,
    dataSource: entry.fields.dataSource as "mock" | "api" | undefined,
  };
}

function shallowModule(m: IAppModule): SerializedModule | null {
  if (!m?.sys?.id || !m.fields) return null;
  return {
    sys: { id: m.sys.id },
    internalName: m.fields.internalName ?? "",
    moduleType: m.fields.moduleType as AppModuleType,
    topic: shallowTopic(m.fields.topic),
    topics: (m.fields.topics ?? []).map(shallowTopic).filter((x): x is SerializedTopic => !!x),
    articles: (m.fields.articles ?? [])
      .map(shallowArticle)
      .filter((x): x is SerializedArticle => !!x),
    kbCategories: (m.fields.kbCategories ?? [])
      .map(shallowKbCategory)
      .filter((x): x is SerializedKbCategory => !!x),
    buttons: (m.fields.buttons ?? [])
      .map(shallowButton)
      .filter((x): x is SerializedButton => !!x),
    widget: shallowWidget(m.fields.widget),
    notifications: (m.fields.notifications ?? [])
      .map(shallowNotification)
      .filter((x): x is SerializedNotification => !!x),
    variant: m.fields.variant,
    emphasis: m.fields.emphasis,
    imageStyle: m.fields.imageStyle,
    ctaStyle: m.fields.ctaStyle,
    icon: m.fields.icon,
  };
}

// Shallow projection used by useContentfulLiveUpdates — keep only sys + scalar
// screen fields + module sys-stubs. This shape stays JSON-serializable and
// avoids lodash isEqual recursing through include:5 trees.
export type ShallowAppScreen = {
  sys: { id: string };
  fields: {
    internalName?: string;
    screenKey?: string;
    title?: string;
    platform?: string;
    minAppVersion?: string;
    modules?: Array<{ sys: { id: string } }>;
    navigation?: { sys: { id: string } } | null;
  };
};

export function shallowAppScreen(screen: IAppScreen): ShallowAppScreen {
  const modules = (screen.fields.modules ?? []) as Array<{ sys?: { id?: string } }>;
  const nav = screen.fields.navigation as { sys?: { id?: string } } | undefined;
  return {
    sys: { id: screen.sys.id },
    fields: {
      internalName: screen.fields.internalName,
      screenKey: screen.fields.screenKey as string | undefined,
      title: screen.fields.title,
      platform: screen.fields.platform,
      minAppVersion: screen.fields.minAppVersion,
      modules: modules
        .filter((m) => !!m?.sys?.id)
        .map((m) => ({ sys: { id: m.sys!.id! } })),
      navigation: nav?.sys?.id ? { sys: { id: nav.sys.id } } : null,
    },
  };
}

// Build a flat map of every module that appears in the screen, fully serialized.
// Used by the client to re-render after a live `modules` reorder without
// re-fetching from the server.
export function buildModulesById(
  screen: IAppScreen
): Record<string, SerializedModule> {
  const out: Record<string, SerializedModule> = {};
  for (const m of screen.fields.modules ?? []) {
    const s = shallowModule(m as IAppModule);
    if (s) out[s.sys.id] = s;
  }
  return out;
}

export function serializeScreen(screen: IAppScreen, fallbackKey: string): SerializedScreen {
  const nav = screen.fields.navigation as
    | { sys?: { id?: string }; fields?: { items?: Array<{ sys?: { id?: string }; fields?: { labelMicrocopy?: { fields?: { key?: string } }; fallbackLabel?: string; icon?: string; screen?: { fields?: { screenKey?: string } }; order?: number } }> } }
    | undefined;

  const navigation: SerializedNavigation | null =
    nav?.sys?.id && nav.fields?.items
      ? {
          sys: { id: nav.sys.id },
          items: nav.fields.items
            .map((item): SerializedNavItem | null => {
              if (!item?.sys?.id || !item.fields) return null;
              return {
                sys: { id: item.sys.id },
                labelMicrocopyKey: item.fields.labelMicrocopy?.fields?.key,
                fallbackLabel: item.fields.fallbackLabel ?? "",
                icon: item.fields.icon,
                screenKey: item.fields.screen?.fields?.screenKey,
                order: item.fields.order,
              };
            })
            .filter((x: SerializedNavItem | null): x is SerializedNavItem => !!x)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        }
      : null;

  return {
    sys: { id: screen.sys.id },
    screenKey: (screen.fields.screenKey as string) ?? fallbackKey,
    title: screen.fields.title,
    modules: (screen.fields.modules ?? [])
      .map((m) => shallowModule(m as IAppModule))
      .filter((x): x is SerializedModule => !!x),
    navigation,
  };
}
