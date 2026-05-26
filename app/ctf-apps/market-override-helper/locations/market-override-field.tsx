"use client";

import {
  Accordion,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  IconButton,
  Note,
  Select,
  Spinner,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@contentful/f36-components";
import { XIcon, TrashSimpleIcon } from "@contentful/f36-icons";
import type { FieldAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { useEffect, useMemo, useState } from "react";
import {
  compactMarketOverrides,
  MARKET_OVERRIDES_SCHEMA_VERSION,
  parseMarketOverrides,
  validateMarketOverrides,
  type MarketOverridesValue,
} from "@/lib/market-overrides";
import {
  fetchMarketEntries,
  getOverrideableFields,
  resolveInstallationParameters,
  type MarketEntry,
} from "../utils";

interface CtField {
  id: string;
  name: string;
  type: string;
  localized?: boolean;
}

const LOCALE_NOTICE_DISMISSED_KEY = "mkt-override:locale-notice-dismissed";

export default function MarketOverrideField() {
  const sdk = useSDK<FieldAppSDK>();
  const params = useMemo(
    () => resolveInstallationParameters(sdk.parameters.installation),
    [sdk.parameters.installation]
  );

  const contentTypeId = sdk.contentType.sys.id;
  const contentTypeFields: CtField[] = useMemo(
    () =>
      (sdk.contentType.fields ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        localized: f.localized,
      })),
    [sdk.contentType.fields]
  );

  const overrideableFields = useMemo(
    () => getOverrideableFields(params, contentTypeId, contentTypeFields),
    [params, contentTypeId, contentTypeFields]
  );

  const isSupported = overrideableFields.length > 0;
  const defaultLocale = sdk.locales.default;
  const editingLocale = sdk.field.locale ?? defaultLocale;
  const localesAvailable = sdk.locales.available ?? [defaultLocale];
  const hasMultipleLocales = localesAvailable.length > 1;

  const [value, setValue] = useState<MarketOverridesValue>(() =>
    parseMarketOverrides(sdk.field.getValue())
  );
  const [pendingMarkets, setPendingMarkets] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [marketToAdd, setMarketToAdd] = useState<string>("");

  // Track which markets are expanded in the accordion. Pending markets
  // start expanded so the editor can immediately add field overrides.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Dismissable locale notice — sessionStorage keeps it dismissed until tab close.
  const [localeNoticeDismissed, setLocaleNoticeDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(LOCALE_NOTICE_DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  // ─── Market entries (from Contentful) ────────────────────────────────
  const [markets, setMarkets] = useState<MarketEntry[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [marketsError, setMarketsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMarketsLoading(true);
    fetchMarketEntries({
      cma: sdk.cma,
      environmentId: sdk.ids.environment,
      defaultLocale,
      mapping: params.marketContentType,
    })
      .then((list) => {
        if (cancelled) return;
        setMarkets(list);
        setMarketsError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMarketsError(
          err instanceof Error
            ? err.message
            : "Failed to load market entries."
        );
        setMarkets([]);
      })
      .finally(() => {
        if (!cancelled) setMarketsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sdk.cma, sdk.ids.environment, defaultLocale, params.marketContentType]);

  // Auto-resize the iframe + subscribe to external changes.
  useEffect(() => {
    sdk.window.startAutoResizer();
    return () => sdk.window.stopAutoResizer();
  }, [sdk]);

  useEffect(() => {
    const detach = sdk.field.onValueChanged((next) => {
      setValue(parseMarketOverrides(next));
    });
    return () => detach();
  }, [sdk.field]);

  // ─── Persistence ─────────────────────────────────────────────────────
  const persist = async (next: MarketOverridesValue) => {
    const validation = validateMarketOverrides(next, {
      allowedMarkets: markets.map((m) => m.code),
      allowedFieldsForContentType: overrideableFields.map((f) => f.id),
      protectedFields: params.protectedFields,
      maxMarketsPerEntry: params.limits.maxMarketsPerEntry,
      maxOverridesPerMarket: params.limits.maxOverridesPerMarket,
    });

    setValidationErrors(validation.errors);
    if (!validation.ok) {
      sdk.notifier.error(
        "Could not save market overrides. See errors in the field editor."
      );
      return;
    }

    const compacted = compactMarketOverrides(validation.value);
    setValue(compacted ?? { version: MARKET_OVERRIDES_SCHEMA_VERSION, overrides: {} });

    try {
      if (compacted === null) {
        await sdk.field.removeValue();
      } else {
        await sdk.field.setValue(compacted);
      }
    } catch (err) {
      console.error("Failed to persist marketOverrides", err);
      sdk.notifier.error("Failed to persist market overrides.");
    }
  };

  // ─── Derived UI state ────────────────────────────────────────────────
  const persistedMarketKeys = Object.keys(value.overrides);
  const visibleMarketKeys = useMemo(() => {
    const extras = pendingMarkets.filter((k) => !persistedMarketKeys.includes(k));
    return [...persistedMarketKeys, ...extras];
  }, [persistedMarketKeys, pendingMarkets]);

  const marketsByCode = useMemo(() => {
    const m = new Map<string, MarketEntry>();
    for (const market of markets) m.set(market.code, market);
    return m;
  }, [markets]);

  const availableMarketsToAdd = useMemo(
    () => markets.filter((m) => !visibleMarketKeys.includes(m.code)),
    [markets, visibleMarketKeys]
  );

  const atMarketLimit = visibleMarketKeys.length >= params.limits.maxMarketsPerEntry;

  // ─── Mutations ───────────────────────────────────────────────────────
  const addMarket = (marketCode: string) => {
    if (!marketCode || visibleMarketKeys.includes(marketCode) || atMarketLimit) return;
    setPendingMarkets((p) => [...p, marketCode]);
    setExpanded((e) => ({ ...e, [marketCode]: true }));
    setMarketToAdd("");
  };

  const setOverride = (marketCode: string, fieldId: string, fieldValue: string) => {
    const market = value.overrides[marketCode] ?? {};
    void persist({
      ...value,
      overrides: {
        ...value.overrides,
        [marketCode]: { ...market, [fieldId]: fieldValue },
      },
    });
    setPendingMarkets((p) => p.filter((k) => k !== marketCode));
  };

  const deleteOverride = (marketCode: string, fieldId: string) => {
    const market = { ...(value.overrides[marketCode] ?? {}) };
    delete market[fieldId];
    void persist({
      ...value,
      overrides: { ...value.overrides, [marketCode]: market },
    });
  };

  const deleteMarket = (marketCode: string) => {
    const overrides = { ...value.overrides };
    delete overrides[marketCode];
    void persist({ ...value, overrides });
    setPendingMarkets((p) => p.filter((k) => k !== marketCode));
    setExpanded((e) => {
      const { [marketCode]: _omit, ...rest } = e;
      return rest;
    });
  };

  const dismissLocaleNotice = () => {
    setLocaleNoticeDismissed(true);
    try {
      sessionStorage.setItem(LOCALE_NOTICE_DISMISSED_KEY, "1");
    } catch {
      /* sessionStorage may be unavailable */
    }
  };

  // ─── Guard states ────────────────────────────────────────────────────
  // Forma36 entry-editor field wrappers already add their own padding around
  // the field iframe content, so we keep the outer container flush and only
  // use tokens for inner spacing. This avoids the "padding pile-up" that
  // pushes content off-screen in narrow live-preview columns.
  if (marketsLoading) {
    return (
      <Flex gap="spacingS" alignItems="center">
        <Spinner size="small" />
        <Text>Loading markets…</Text>
      </Flex>
    );
  }

  if (marketsError) {
    return (
      <Note variant="negative">
        Could not load market entries from{" "}
        <code>{params.marketContentType.id}</code>: {marketsError}
      </Note>
    );
  }

  if (!isSupported) {
    return (
      <Note variant="neutral">
        Market overrides aren&apos;t configured for{" "}
        <code>{contentTypeId}</code>. Enable it in the Market Override Helper
        app config.
      </Note>
    );
  }

  if (markets.length === 0) {
    return (
      <Note variant="warning">
        No <code>{params.marketContentType.id}</code> entries found.
        Create one (with a <code>code</code> and display name) before adding
        overrides.
      </Note>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────
  const showLocaleNotice =
    hasMultipleLocales && !localeNoticeDismissed;

  return (
    <Stack flexDirection="column" padding="spacingS" spacing="spacingS" alignItems="stretch">
      {/* Locale notice — concise, dismissable */}
      
      {showLocaleNotice && (
        <Box
          padding="spacingXs"
          style={{
            background: "#f0f5fd",
            border: "1px solid #bcd0f7",
            borderRadius: 4,
          }}
        >
          <Flex justifyContent="space-between" alignItems="center" gap="spacingXs">
            <Text fontSize="fontSizeS" fontColor="gray700">
              Editing overrides for <strong>{editingLocale}</strong>. Switch
              the entry locale to override another language.
            </Text>
            <IconButton
              variant="transparent"
              size="small"
              aria-label="Dismiss locale notice"
              icon={<XIcon />}
              onClick={dismissLocaleNotice}
            />
          </Flex>
        </Box>
      )}

      {/* Header row: count + add picker. flexWrap so the Select drops to
          its own line in narrow containers (e.g. the live-preview sidebar).
          `flex: 1 1 180px` lets it shrink down to 180px before wrapping. */}
      <Flex
        alignItems="center"
        gap="spacingS"
        flexWrap="wrap"
        justifyContent="space-between"
      >
        <Badge variant="secondary">
          {visibleMarketKeys.length} / {params.limits.maxMarketsPerEntry} markets
        </Badge>
        <Box style={{ flex: "1 1 180px", minWidth: 0 }}>
          <Select
            value={marketToAdd}
            isDisabled={availableMarketsToAdd.length === 0 || atMarketLimit}
            onChange={(e) => addMarket(e.target.value)}
          >
            <Select.Option value="">
              {atMarketLimit
                ? `Limit reached (${params.limits.maxMarketsPerEntry})`
                : availableMarketsToAdd.length === 0
                  ? "All markets added"
                  : "Add a market…"}
            </Select.Option>
            {availableMarketsToAdd.map((m) => (
              <Select.Option key={m.id} value={m.code}>
                {m.label} ({m.code})
                {!m.published ? " — draft" : ""}
              </Select.Option>
            ))}
          </Select>
        </Box>
      </Flex>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Note variant="negative">
          <Stack flexDirection="column" spacing="spacing2Xs" alignItems="flex-start">
            {validationErrors.map((err, i) => (
              <Text key={i}>{err}</Text>
            ))}
          </Stack>
        </Note>
      )}

      {/* Empty state */}
      {visibleMarketKeys.length === 0 && (
        <Note variant="neutral">
          No overrides yet. Pick a market above to start.
        </Note>
      )}

      {/* Accordion of markets */}
      {visibleMarketKeys.length > 0 && (
        <Accordion>
          {visibleMarketKeys.map((marketCode) => {
            const market = marketsByCode.get(marketCode);
            const overrides = value.overrides[marketCode] ?? {};
            const overrideCount = Object.keys(overrides).length;
            const isOrphan = !market;
            const isOpen = expanded[marketCode] ?? overrideCount === 0;

            return (
              <Accordion.Item
                key={marketCode}
                isExpanded={isOpen}
                onExpand={() =>
                  setExpanded((e) => ({ ...e, [marketCode]: true }))
                }
                onCollapse={() =>
                  setExpanded((e) => ({ ...e, [marketCode]: false }))
                }
                title={
                  <MarketAccordionHeader
                    market={market}
                    marketCode={marketCode}
                    overrideCount={overrideCount}
                    maxOverrides={params.limits.maxOverridesPerMarket}
                    isOrphan={isOrphan}
                  />
                }
              >
                <MarketSection
                  marketCode={marketCode}
                  market={market}
                  overrides={overrides}
                  overrideableFields={overrideableFields}
                  entry={sdk.entry}
                  editingLocale={editingLocale}
                  defaultLocale={defaultLocale}
                  maxOverridesPerMarket={params.limits.maxOverridesPerMarket}
                  onSetOverride={(fieldId, v) => setOverride(marketCode, fieldId, v)}
                  onDeleteOverride={(fieldId) => deleteOverride(marketCode, fieldId)}
                  onDeleteMarket={() => deleteMarket(marketCode)}
                />
              </Accordion.Item>
            );
          })}
        </Accordion>
      )}
    </Stack>
  );
}

// ─── Accordion header ─────────────────────────────────────────────────

function MarketAccordionHeader({
  market,
  marketCode,
  overrideCount,
  maxOverrides,
  isOrphan,
}: {
  market: MarketEntry | undefined;
  marketCode: string;
  overrideCount: number;
  maxOverrides: number;
  isOrphan: boolean;
}) {
  // `flexWrap` + `gap` lets the count badge drop under the label when the
  // accordion is rendered in a narrow column. Drop the old
  // `marginLeft: auto` pattern (which forces a single row) for a wrap-first
  // flow that always shows everything.
  return (
    <Flex alignItems="center" gap="spacingXs" flexWrap="wrap" style={{ width: "100%" }}>
      
      <FlagThumb market={market} marketCode={marketCode} size={18} />
      <Text fontWeight="fontWeightDemiBold">
        {market?.label ?? marketCode}
      </Text>
      <Text fontColor="gray500" fontSize="fontSizeS">
        {marketCode}
      </Text>
      <Badge variant={overrideCount > 0 ? "positive" : "secondary"}>
        {overrideCount} / {maxOverrides}
      </Badge>
      {isOrphan && <Badge variant="warning">orphan</Badge>}
    </Flex>
  );
}

// ─── Per-market section ───────────────────────────────────────────────

interface MarketSectionProps {
  marketCode: string;
  market: MarketEntry | undefined;
  overrides: Record<string, string>;
  overrideableFields: Array<{ id: string; name: string; type: string }>;
  entry: FieldAppSDK["entry"];
  editingLocale: string;
  defaultLocale: string;
  maxOverridesPerMarket: number;
  onSetOverride: (fieldId: string, value: string) => void;
  onDeleteOverride: (fieldId: string) => void;
  onDeleteMarket: () => void;
}

function MarketSection({
  marketCode,
  market,
  overrides,
  overrideableFields,
  entry,
  editingLocale,
  defaultLocale,
  maxOverridesPerMarket,
  onSetOverride,
  onDeleteOverride,
  onDeleteMarket,
}: MarketSectionProps) {
  const overriddenFieldIds = Object.keys(overrides);
  const availableFieldsToAdd = overrideableFields.filter(
    (f) => !overriddenFieldIds.includes(f.id)
  );
  const [pendingFieldId, setPendingFieldId] = useState<string>("");
  const atLimit = overriddenFieldIds.length >= maxOverridesPerMarket;
  const isOrphan = !market;

  const handleAddField = (fieldId: string) => {
    if (!fieldId || atLimit) return;
    onSetOverride(
      fieldId,
      readBaseValue(entry, fieldId, editingLocale, defaultLocale)
    );
    setPendingFieldId("");
  };

  return (
    <Stack flexDirection="column" spacing="spacingS" alignItems="stretch">
      {isOrphan && (
        <Note variant="warning">
          No <code>{marketCode}</code> market entry exists. Remove this
          section or create a market entry with that code.
        </Note>
      )}

      {overriddenFieldIds.length === 0 ? (
        <Text fontColor="gray600" fontSize="fontSizeS">
          No fields overridden yet. Add one below.
        </Text>
      ) : (
        <Stack flexDirection="column" spacing="spacingS" alignItems="stretch">
          {overriddenFieldIds.map((fieldId) => {
            const fieldDef = overrideableFields.find((f) => f.id === fieldId);
            if (!fieldDef) {
              return (
                <Note key={fieldId} variant="warning">
                  <Flex justifyContent="space-between" alignItems="center">
                    <Text>
                      Override for unknown field <code>{fieldId}</code>.
                    </Text>
                    <Button
                      size="small"
                      variant="negative"
                      onClick={() => onDeleteOverride(fieldId)}
                    >
                      Remove
                    </Button>
                  </Flex>
                </Note>
              );
            }
            return (
              <OverrideRow
                key={fieldId}
                field={fieldDef}
                baseValue={readBaseValue(entry, fieldId, editingLocale, defaultLocale)}
                overrideValue={overrides[fieldId] ?? ""}
                onChange={(v) => onSetOverride(fieldId, v)}
                onDelete={() => onDeleteOverride(fieldId)}
              />
            );
          })}
        </Stack>
      )}

      {/* Add-field + delete-market row. flexWrap allows the button to drop
          beneath the Select in narrow live-preview sidebars instead of
          getting clipped. */}
      <Flex
        gap="spacingS"
        alignItems="center"
        flexWrap="wrap"
        justifyContent="space-between"
      >
        <Box style={{ flex: "1 1 200px", minWidth: 0 }}>
          <Select
            value={pendingFieldId}
            isDisabled={availableFieldsToAdd.length === 0 || atLimit}
            onChange={(e) => {
              setPendingFieldId(e.target.value);
              if (e.target.value) handleAddField(e.target.value);
            }}
          >
            <Select.Option value="">
              {atLimit
                ? `Limit reached (${maxOverridesPerMarket})`
                : availableFieldsToAdd.length === 0
                  ? "All fields overridden"
                  : "+ Override a field…"}
            </Select.Option>
            {availableFieldsToAdd.map((f) => (
              <Select.Option key={f.id} value={f.id}>
                {f.name}
              </Select.Option>
            ))}
          </Select>
        </Box>
        <Button
          variant="negative"
          size="small"
          startIcon={<TrashSimpleIcon />}
          onClick={onDeleteMarket}
        >
          Remove
        </Button>
      </Flex>
    </Stack>
  );
}

// ─── Per-field override row ────────────────────────────────────────────

interface OverrideRowProps {
  field: { id: string; name: string; type: string };
  baseValue: string;
  overrideValue: string;
  onChange: (value: string) => void;
  onDelete: () => void;
}

function OverrideRow({
  field,
  baseValue,
  overrideValue,
  onChange,
  onDelete,
}: OverrideRowProps) {
  const isLongText = field.type === "Text";
  const isOverriding = overrideValue !== baseValue && overrideValue.length > 0;
  // Local state so typing isn't laggy on every keystroke; commit on blur.
  const [draft, setDraft] = useState(overrideValue);
  useEffect(() => setDraft(overrideValue), [overrideValue]);

  return (
    <FormControl marginBottom="none">
      {/* Label row: name + optional Overriding badge on the left, close icon
          on the right. `flexWrap` + `minWidth: 0` keeps the close button
          always visible even in very narrow columns. */}
      <Flex justifyContent="space-between" alignItems="center" gap="spacingXs" flexWrap="wrap">
        <Box style={{ flex: "1 1 auto", minWidth: 0 }}>
          <FormControl.Label marginBottom="none">
            <Flex alignItems="center" gap="spacingXs" flexWrap="wrap">
              <span>{field.name}</span>
              {isOverriding && <Badge variant="positive">Overriding</Badge>}
            </Flex>
          </FormControl.Label>
        </Box>
        <IconButton
          variant="transparent"
          size="small"
          aria-label={`Remove ${field.name} override`}
          icon={<XIcon />}
          onClick={onDelete}
        />
      </Flex>

      {isLongText ? (
        <Textarea
          value={draft}
          placeholder={baseValue || "(no base value)"}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== overrideValue) onChange(draft);
          }}
          rows={3}
        />
      ) : (
        <TextInput
          value={draft}
          placeholder={baseValue || "(no base value)"}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== overrideValue) onChange(draft);
          }}
        />
      )}

      <FormControl.HelpText>
        Base: {baseValue ? `"${truncate(baseValue, 100)}"` : "(empty)"}
      </FormControl.HelpText>
    </FormControl>
  );
}

// ─── Flag thumbnail ────────────────────────────────────────────────────

function FlagThumb({
  market,
  marketCode,
  size = 20,
}: {
  market: MarketEntry | undefined;
  marketCode: string;
  size?: number;
}) {
  if (market?.flagUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={market.flagUrl}
        alt={`${market.label} flag`}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: 2,
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <Box
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 2,
        background: "#eef2f5",
        color: "#536171",
        fontSize: Math.max(9, size * 0.5),
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {marketCode.slice(0, 2).toUpperCase()}
    </Box>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * Read a sibling field's value to show as the "base" reference next to the
 * override input.
 *
 * Resolution order:
 *  1. The locale this field editor instance is bound to (`editingLocale`).
 *  2. Default locale.
 *  3. First locale advertised by the sibling field.
 */
function readBaseValue(
  entry: FieldAppSDK["entry"],
  fieldId: string,
  editingLocale: string,
  defaultLocale: string
): string {
  const sibling = entry.fields[fieldId];
  if (!sibling) return "";
  const locales = sibling.locales ?? [defaultLocale];
  const preferredLocale = locales.includes(editingLocale)
    ? editingLocale
    : locales.includes(defaultLocale)
      ? defaultLocale
      : locales[0];
  const raw = sibling.getValue(preferredLocale);
  return typeof raw === "string" ? raw : "";
}
