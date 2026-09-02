import { getEntriesInEnvironment, getEntries } from "@/lib/contentful";
import { unscoped } from "@/lib/site-scope";
import { getI18nConfig } from "@/i18n-config";
import {
  AppScreenSkeleton,
  IAppScreen,
  IMicrocopy,
  MicrocopySkeleton,
} from "@/features/contentful/type";
import { getSiteSettings, type SiteSettingsSkeleton } from "@/lib/site-settings";
import type { SiteTheme } from "@/lib/theme";
import {
  buildMicrocopyMap,
  collectMicrocopyFromScreen,
  MicrocopyMap,
} from "./microcopy";
import {
  serializeScreen,
  shallowAppScreen,
  buildModulesById,
  ShallowAppScreen,
  SerializedScreen,
  SerializedModule,
} from "./serialize";
import { buildEntriesIndex, type EntriesIndex } from "./entries-index";
import type { Entry } from "contentful";

export type AppData = {
  screens: SerializedScreen[];
  shallowScreens: ShallowAppScreen[];
  modulesById: Record<string, SerializedModule>;
  microcopy: MicrocopyMap;
  theme: SiteTheme | null;
  brandName?: string;
  logoUrl?: string;
  locale: string;
  availableLocales: string[];
  /** Flat map of every referenced entry (modules, topics, widgets, microcopy,
   *  nav, buttons, ...) as shallow `{sys, fields}` snapshots. Powers per-entry
   *  live-update subscriptions on the client. */
  entriesIndex: EntriesIndex;
};

function extractTheme(settings: Entry<SiteSettingsSkeleton> | null): SiteTheme | null {
  if (!settings) return null;
  const fields = settings.fields as unknown as Record<string, unknown>;
  const raw = fields.theme;
  if (raw && typeof raw === "object") return raw as SiteTheme;

  const colors: SiteTheme["colors"] = {};
  const primary = fields.themePrimary as string | undefined;
  const background = fields.themeBackground as string | undefined;
  const foreground = fields.themeForeground as string | undefined;
  const secondary = fields.themeSecondary as string | undefined;
  const accent = fields.themeAccent as string | undefined;
  if (primary) colors.primary = primary;
  if (background) colors.background = background;
  if (foreground) colors.foreground = foreground;
  if (secondary) colors.secondary = secondary;
  if (accent) colors.accent = accent;
  if (Object.keys(colors).length === 0) return null;
  return { colors };
}

function extractLogoUrl(settings: Entry<SiteSettingsSkeleton> | null): string | undefined {
  const asset = settings?.fields?.logo as { fields?: { file?: { url?: string } } } | undefined;
  const url = asset?.fields?.file?.url;
  if (!url) return undefined;
  return url.startsWith("//") ? `https:${url}` : url;
}

// Single source of truth for fetching the mock app's data. Pulls every
// appScreen entry, then supplements with the full `app.*` microcopy
// dictionary so the client always has a fallback for keys not directly
// linked from a module.
export async function loadAppData(opts: {
  isPreview: boolean;
  environmentId: string | null;
  locale?: string | null;
}): Promise<AppData> {
  const { isPreview, environmentId } = opts;

  const { defaultLocale, locales: availableLocales } = await getI18nConfig();
  const requested = opts.locale ?? null;
  const locale =
    requested && availableLocales.includes(requested) ? requested : defaultLocale;

  const fetchAllScreens = environmentId
    ? () =>
        getEntriesInEnvironment<AppScreenSkeleton>({
          options: unscoped({
            content_type: "appScreen",
            locale,
            include: 5,
            limit: 50,
            order: ["fields.screenKey"],
          }),
          isPreviewEnabled: isPreview,
          environment: environmentId,
        })
    : () =>
        getEntries<AppScreenSkeleton>(
          unscoped({
            content_type: "appScreen",
            locale,
            include: 5,
            limit: 50,
            order: ["fields.screenKey"],
          }),
          isPreview,
          null,
          null
        );

  const fetchSupplementalMicrocopy = environmentId
    ? () =>
        getEntriesInEnvironment<MicrocopySkeleton>({
          options: unscoped({
            content_type: "microcopy",
            "fields.key[match]": "app.",
            locale,
            limit: 500,
          }),
          isPreviewEnabled: isPreview,
          environment: environmentId,
        })
    : () =>
        getEntries<MicrocopySkeleton>(
          unscoped({
            content_type: "microcopy",
            "fields.key[match]": "app.",
            locale,
            limit: 500,
          }),
          isPreview,
          null,
          null
        );

  const [screenEntries, supplementalMicrocopy, siteSettings] = await Promise.all([
    fetchAllScreens(),
    fetchSupplementalMicrocopy(),
    getSiteSettings(locale, isPreview, null, environmentId),
  ]);

  const screens: SerializedScreen[] = [];
  const shallowScreens: ShallowAppScreen[] = [];
  const modulesById: Record<string, SerializedModule> = {};
  const microcopyEntries: IMicrocopy[] = [];

  for (const entry of screenEntries as IAppScreen[]) {
    if (!entry?.sys?.id) continue;
    const key = (entry.fields.screenKey as string | undefined) ?? entry.sys.id;
    screens.push(serializeScreen(entry, key));
    shallowScreens.push(shallowAppScreen(entry));
    Object.assign(modulesById, buildModulesById(entry));
    microcopyEntries.push(...collectMicrocopyFromScreen(entry));
  }

  const microcopy = buildMicrocopyMap([
    ...microcopyEntries,
    ...(supplementalMicrocopy as unknown as IMicrocopy[]),
  ]);

  // Flat index of every entry reachable via the screens, plus all microcopy
  // entries (which aren't always reachable from a module). Powers live updates.
  const entriesIndex = buildEntriesIndex([
    ...(screenEntries as unknown[]),
    ...(supplementalMicrocopy as unknown[]),
  ]);

  return {
    screens,
    shallowScreens,
    modulesById,
    microcopy,
    entriesIndex,
    theme: extractTheme(siteSettings),
    brandName: siteSettings?.fields?.logoAlt as string | undefined,
    logoUrl: extractLogoUrl(siteSettings),
    locale,
    availableLocales: [...availableLocales],
  };
}
