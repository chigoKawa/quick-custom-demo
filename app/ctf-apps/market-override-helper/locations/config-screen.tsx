"use client";

import {
  Accordion,
  Badge,
  Box,
  Checkbox,
  Flex,
  Form,
  FormControl,
  Heading,
  List,
  Note,
  Paragraph,
  Select,
  Spinner,
  Stack,
  Subheading,
  Text,
  TextInput,
} from "@contentful/f36-components";
import type { ConfigAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SUPPORTED_FIELD_TYPES_V1,
  type ContentTypeOverrideConfig,
  type MarketOverrideInstallationParameters,
  type SupportedFieldType,
} from "@/lib/market-overrides";
import { APP_NAME, DEFAULT_MARKET_CONTENT_TYPE } from "../constants";
import { resolveInstallationParameters } from "../utils";
import { runInstallation, validateMarketContentType } from "../install";

interface CtSummary {
  id: string;
  name: string;
  displayField?: string;
  fields: Array<{ id: string; name: string; type: string; linkType?: string }>;
}

export default function ConfigScreen() {
  const sdk = useSDK<ConfigAppSDK>();

  const [params, setParams] = useState<MarketOverrideInstallationParameters>(() =>
    resolveInstallationParameters(sdk.parameters.installation)
  );
  const [contentTypes, setContentTypes] = useState<CtSummary[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);

  // Keep a ref to the latest params so the `onConfigure` callback registered
  // with the Contentful SDK can always read fresh state. The SDK only
  // accepts one configure handler, and React's `useCallback` would create a
  // new closure on every params change — re-registering frequently races
  // with the user clicking "Save" and can persist stale data. Reading
  // through a ref sidesteps the closure entirely.
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  // Re-hydrate from the SDK's authoritative parameters after first render.
  // `sdk.parameters.installation` is sometimes stale on initial mount; the
  // async `getParameters()` call returns whatever Contentful actually has
  // persisted, so we use it as the source of truth and call `setReady()`
  // only once the state matches storage.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await sdk.app.getParameters();
        if (!cancelled && saved) {
          setParams(resolveInstallationParameters(saved));
        }
      } finally {
        if (!cancelled) sdk.app.setReady();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sdk]);

  // Load all content types for both pickers (market content type + override content types).
  useEffect(() => {
    let cancelled = false;
    setLoadingTypes(true);
    sdk.cma.contentType
      .getMany({ query: { limit: 1000 } })
      .then((res) => {
        if (cancelled) return;
        const summaries: CtSummary[] = (res.items ?? []).map((ct) => ({
          id: ct.sys.id,
          name: ct.name,
          displayField: ct.displayField ?? undefined,
          fields: (ct.fields ?? []).map((f) => ({
            id: f.id,
            name: f.name,
            type: f.type,
            linkType: (f as { linkType?: string }).linkType,
          })),
        }));
        summaries.sort((a, b) => a.name.localeCompare(b.name));
        setContentTypes(summaries);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load content types."
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingTypes(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sdk]);

  // Look up the currently configured market content type from the loaded list
  // so we can preview field options and validate inline.
  const marketCt = useMemo(
    () => contentTypes.find((ct) => ct.id === params.marketContentType.id),
    [contentTypes, params.marketContentType.id]
  );

  const marketCtValidation = useMemo(
    () =>
      validateMarketContentType(marketCt ?? null, {
        codeFieldId: params.marketContentType.codeFieldId,
        displayFieldId: params.marketContentType.displayFieldId,
        flagFieldId: params.marketContentType.flagFieldId,
      }),
    [marketCt, params.marketContentType]
  );

  // Stable handler registered ONCE. It reads `paramsRef.current` so it
  // always sees the latest user input, even when Contentful invokes it
  // asynchronously after the Save button is clicked.
  const onConfigure = useCallback(async () => {
    const current = paramsRef.current;
    const cleanedContentTypes: Record<string, ContentTypeOverrideConfig> = {};
    for (const [ctId, cfg] of Object.entries(current.contentTypes)) {
      const fields = cfg.fields.filter((f) => f.length > 0);
      if (fields.length === 0) continue;
      cleanedContentTypes[ctId] = {
        fields,
        ...(cfg.fieldTypes && cfg.fieldTypes.length > 0
          ? { fieldTypes: cfg.fieldTypes }
          : {}),
      };
    }

    const parameters: MarketOverrideInstallationParameters = {
      ...current,
      contentTypes: cleanedContentTypes,
      protectedFields: (current.protectedFields ?? []).filter((f) => f.length > 0),
    };

    return { parameters } as unknown as ReturnType<
      Parameters<typeof sdk.app.onConfigure>[0]
    >;
  }, [sdk]);

  // Register once. Because `onConfigure` is stable (no `params` dep) and
  // reads through the ref, we avoid the common pitfall where the SDK keeps
  // a stale closure that overwrites saved data with first-render defaults.
  useEffect(() => {
    sdk.app.onConfigure(onConfigure as Parameters<typeof sdk.app.onConfigure>[0]);
  }, [sdk, onConfigure]);

  // After configuration completes, run the installer to make sure the market
  // content type exists with the canonical schema. Also reads via the ref so
  // the registered callback always sees the just-saved market content type.
  useEffect(() => {
    sdk.app.onConfigurationCompleted(async () => {
      try {
        setInstalling(true);
        await runInstallation({
          cma: sdk.cma,
          notifier: sdk.notifier,
          environmentId: sdk.ids.environment,
          marketContentTypeId:
            paramsRef.current.marketContentType.id ||
            DEFAULT_MARKET_CONTENT_TYPE.id,
        });
      } catch (err) {
        console.error("Market content type install failed", err);
        sdk.notifier.error(
          "Could not create the market content type. See browser console for details."
        );
      } finally {
        setInstalling(false);
      }
    });
  }, [sdk]);

  // ─── Override-content-type handlers ───────────────────────────────────
  const toggleContentType = (ctId: string, enabled: boolean) => {
    setParams((p) => {
      const next = { ...p.contentTypes };
      if (enabled) {
        if (!next[ctId]) next[ctId] = { fields: [] };
      } else {
        delete next[ctId];
      }
      return { ...p, contentTypes: next };
    });
  };

  const toggleField = (ctId: string, fieldId: string, enabled: boolean) => {
    setParams((p) => {
      const existing = p.contentTypes[ctId] ?? { fields: [] };
      const set = new Set(existing.fields);
      if (enabled) set.add(fieldId);
      else set.delete(fieldId);
      return {
        ...p,
        contentTypes: {
          ...p.contentTypes,
          [ctId]: { ...existing, fields: Array.from(set) },
        },
      };
    });
  };

  const toggleSupportedFieldType = (type: SupportedFieldType, enabled: boolean) => {
    setParams((p) => {
      const set = new Set(p.supportedFieldTypes);
      if (enabled) set.add(type);
      else set.delete(type);
      if (set.size === 0) return p;
      return { ...p, supportedFieldTypes: Array.from(set) as SupportedFieldType[] };
    });
  };

  const protectedInput = (params.protectedFields ?? []).join(", ");

  return (
    <Box padding="spacingXl" style={{ maxWidth: 960, margin: "0 auto" }}>
      <Heading>{APP_NAME}</Heading>
      <Paragraph>
        Configure which markets, content types, and fields editors may override.
        Markets are managed as Contentful entries (so they can be edited like
        any other content) and overrides are stored as a JSON delta on a single
        field per entry.
      </Paragraph>

      <Form>
        {/* ── Market content type ───────────────────────────────────── */}
        <Box marginTop="spacingXl">
          <Subheading>Market content type</Subheading>
          <Paragraph>
            Pick the content type that represents a market in this space. If a
            content type with this ID doesn&apos;t exist, this app will create
            it with the canonical schema (<code>internalName</code>,{" "}
            <code>code</code>, <code>description</code>, <code>locales</code>,{" "}
            <code>flag</code>) when you save.
          </Paragraph>

          <Flex gap="spacingS" alignItems="flex-end" flexWrap="wrap">
            <FormControl style={{ flex: 1, minWidth: 220 }}>
              <FormControl.Label>Content type ID</FormControl.Label>
              <Select
                value={
                  marketCt
                    ? params.marketContentType.id
                    : params.marketContentType.id || "__custom__"
                }
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    marketContentType: {
                      ...p.marketContentType,
                      id: e.target.value === "__custom__" ? "" : e.target.value,
                    },
                  }))
                }
              >
                <Select.Option value={DEFAULT_MARKET_CONTENT_TYPE.id}>
                  market (default — will be created if missing)
                </Select.Option>
                {contentTypes
                  .filter((ct) => ct.id !== DEFAULT_MARKET_CONTENT_TYPE.id)
                  .map((ct) => (
                    <Select.Option key={ct.id} value={ct.id}>
                      {ct.name} ({ct.id})
                    </Select.Option>
                  ))}
                <Select.Option value="__custom__">— Custom ID —</Select.Option>
              </Select>
            </FormControl>

            {!marketCt && (
              <FormControl style={{ flex: 1, minWidth: 220 }}>
                <FormControl.Label>Custom content type ID</FormControl.Label>
                <TextInput
                  value={params.marketContentType.id}
                  placeholder={DEFAULT_MARKET_CONTENT_TYPE.id}
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      marketContentType: { ...p.marketContentType, id: e.target.value },
                    }))
                  }
                />
              </FormControl>
            )}
          </Flex>

          <Flex gap="spacingS" marginTop="spacingS" flexWrap="wrap">
            <FormControl style={{ flex: 1, minWidth: 180 }}>
              <FormControl.Label>Code field ID</FormControl.Label>
              <TextInput
                value={params.marketContentType.codeFieldId}
                placeholder={DEFAULT_MARKET_CONTENT_TYPE.codeFieldId}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    marketContentType: {
                      ...p.marketContentType,
                      codeFieldId: e.target.value,
                    },
                  }))
                }
              />
            </FormControl>
            <FormControl style={{ flex: 1, minWidth: 180 }}>
              <FormControl.Label>Display field ID</FormControl.Label>
              <TextInput
                value={params.marketContentType.displayFieldId}
                placeholder={DEFAULT_MARKET_CONTENT_TYPE.displayFieldId}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    marketContentType: {
                      ...p.marketContentType,
                      displayFieldId: e.target.value,
                    },
                  }))
                }
              />
            </FormControl>
            <FormControl style={{ flex: 1, minWidth: 180 }}>
              <FormControl.Label>Flag field ID (optional)</FormControl.Label>
              <TextInput
                value={params.marketContentType.flagFieldId ?? ""}
                placeholder={DEFAULT_MARKET_CONTENT_TYPE.flagFieldId}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    marketContentType: {
                      ...p.marketContentType,
                      flagFieldId: e.target.value || undefined,
                    },
                  }))
                }
              />
            </FormControl>
          </Flex>

          <Box marginTop="spacingS">
            <MarketContentTypeStatus
              validation={marketCtValidation}
              configuredId={params.marketContentType.id}
              installing={installing}
            />
          </Box>
        </Box>

        {/* ── Supported field types ─────────────────────────────────── */}
        <Box marginTop="spacingXl">
          <Subheading>Supported field types</Subheading>
          <Paragraph>
            v1 only supports plain text fields. Symbol = short text, Text = long text.
          </Paragraph>
          <Stack spacing="spacingM">
            {SUPPORTED_FIELD_TYPES_V1.map((type) => (
              <Checkbox
                key={type}
                isChecked={params.supportedFieldTypes.includes(type)}
                onChange={(e) =>
                  toggleSupportedFieldType(type, e.target.checked)
                }
              >
                {type}
              </Checkbox>
            ))}
          </Stack>
        </Box>

        {/* ── Content types ─────────────────────────────────────────── */}
        <Box marginTop="spacingXl">
          <Subheading>Content types and fields</Subheading>
          <Paragraph>
            Pick which content types accept overrides, then whitelist the
            specific fields for each. Only Symbol and Text fields are shown.
          </Paragraph>

          {loadingTypes && (
            <Flex alignItems="center" gap="spacingS">
              <Spinner size="small" />
              <Text>Loading content types…</Text>
            </Flex>
          )}
          {loadError && (
            <Note variant="negative">
              <Text>Could not load content types: {loadError}</Text>
            </Note>
          )}

          {!loadingTypes && !loadError && contentTypes.length === 0 && (
            <Note variant="warning">
              <Text>No content types found in this environment.</Text>
            </Note>
          )}

          <Stack flexDirection="column" spacing="spacingM" alignItems="stretch">
            {contentTypes
              .filter((ct) => ct.id !== params.marketContentType.id)
              .map((ct) => {
                const enabled = Boolean(params.contentTypes[ct.id]);
                const selectedFields = new Set(
                  params.contentTypes[ct.id]?.fields ?? []
                );
                const overrideableFields = ct.fields.filter((f) =>
                  params.supportedFieldTypes.includes(f.type as SupportedFieldType)
                );
                return (
                  <Box
                    key={ct.id}
                    padding="spacingM"
                    style={{
                      border: "1px solid #e7ebee",
                      borderRadius: 6,
                      background: enabled ? "#fafbfc" : "#fff",
                    }}
                  >
                    <Flex alignItems="center" justifyContent="space-between">
                      <Checkbox
                        isChecked={enabled}
                        onChange={(e) => toggleContentType(ct.id, e.target.checked)}
                      >
                        <strong>{ct.name}</strong>{" "}
                        <Text fontColor="gray500" as="span">
                          ({ct.id})
                        </Text>
                      </Checkbox>
                      {enabled && (
                        <Text fontColor="gray600">
                          {selectedFields.size} field(s) selected
                        </Text>
                      )}
                    </Flex>

                    {enabled && (
                      <Box marginTop="spacingS" paddingLeft="spacingL">
                        {overrideableFields.length === 0 ? (
                          <Text fontColor="gray500">
                            No Symbol or Text fields on this content type.
                          </Text>
                        ) : (
                          <Stack
                            flexDirection="column"
                            spacing="spacing2Xs"
                            alignItems="flex-start"
                          >
                            {overrideableFields.map((f) => (
                              <Checkbox
                                key={f.id}
                                isChecked={selectedFields.has(f.id)}
                                onChange={(e) =>
                                  toggleField(ct.id, f.id, e.target.checked)
                                }
                              >
                                {f.name}{" "}
                                <Text fontColor="gray500" as="span">
                                  ({f.id} · {f.type})
                                </Text>
                              </Checkbox>
                            ))}
                          </Stack>
                        )}
                      </Box>
                    )}
                  </Box>
                );
              })}
          </Stack>
        </Box>

        {/* ── Protected fields ──────────────────────────────────────── */}
        <Box marginTop="spacingXl">
          <Subheading>Protected fields</Subheading>
          <Paragraph>
            Comma-separated field IDs that must never be overrideable, even if
            listed above. Useful for SEO, slug, or pricing fields.
          </Paragraph>
          <TextInput
            value={protectedInput}
            placeholder="slug, internalName"
            onChange={(e) =>
              setParams((p) => ({
                ...p,
                protectedFields: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              }))
            }
          />
        </Box>

        {/* ── Implementation guide (collapsed) ──────────────────────── */}
        <Box marginTop="spacingXl">
          <Accordion>
            <Accordion.Item title="Implementation guide for developers">
              <ImplementationGuide />
            </Accordion.Item>
          </Accordion>
        </Box>

        {/* ── Limits ────────────────────────────────────────────────── */}
        <Box marginTop="spacingXl">
          <Subheading>Hard limits</Subheading>
          <Paragraph>
            Enforced in the UI and on save to prevent override sprawl.
          </Paragraph>
          <Flex gap="spacingM">
            <FormControl style={{ flex: 1 }}>
              <FormControl.Label>Max markets per entry</FormControl.Label>
              <TextInput
                type="number"
                value={String(params.limits.maxMarketsPerEntry)}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    limits: {
                      ...p.limits,
                      maxMarketsPerEntry: Math.max(
                        1,
                        Number(e.target.value) || 1
                      ),
                    },
                  }))
                }
              />
            </FormControl>
            <FormControl style={{ flex: 1 }}>
              <FormControl.Label>Max overrides per market</FormControl.Label>
              <TextInput
                type="number"
                value={String(params.limits.maxOverridesPerMarket)}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    limits: {
                      ...p.limits,
                      maxOverridesPerMarket: Math.max(
                        1,
                        Number(e.target.value) || 1
                      ),
                    },
                  }))
                }
              />
            </FormControl>
          </Flex>
        </Box>
      </Form>
    </Box>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────

function ImplementationGuide() {
  const codeBlockStyle: React.CSSProperties = {
    background: "#f7f9fa",
    border: "1px solid #e7ebee",
    borderRadius: 4,
    padding: "12px 14px",
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 12,
    lineHeight: 1.55,
    whiteSpace: "pre",
    overflowX: "auto",
    color: "#1a2026",
  };

  return (
    <Stack flexDirection="column" spacing="spacingL" alignItems="stretch">
      <Box>
        <Paragraph>
          This app stores per-market deltas as JSON on a single field of each
          entry. Your frontend resolves <em>base content + market overrides</em>{" "}
          at request time using a pure merge function — no SDK, no special
          server, no proprietary protocol. The same pattern works in any
          framework that can fetch from Contentful.
        </Paragraph>
      </Box>

      <Box>
        <Subheading>1. Stored JSON shape</Subheading>
        <Paragraph>
          Every <code>marketOverride</code> field stores a v1 payload like
          this. Top-level keys are <code>code</code> values from{" "}
          <code>market</code> entries. Per-market buckets are flat{" "}
          <code>fieldId → string</code> maps. The whole JSON is itself
          localized, so each locale has its own market deltas.
        </Paragraph>
        <Box style={codeBlockStyle}>
{`{
  "version": 1,
  "overrides": {
    "NG": {
      "headline": "Nigeria-specific headline",
      "subCopy": "Locally relevant copy"
    },
    "US": { "headline": "US headline" }
  }
}`}
        </Box>
      </Box>

      <Box>
        <Subheading>2. The contract</Subheading>
        <Paragraph>
          Integrating with this app comes down to a single pure function:
        </Paragraph>
        <Box style={codeBlockStyle}>
{`resolveFieldsForMarket(baseFields, overridesJson, marketCode) -> resolvedFields`}
        </Box>
        <Paragraph>
          If <code>marketCode</code> is <code>null</code> or unknown, the
          base fields are returned unchanged. Otherwise, any field whose ID
          appears in the override bucket gets the override value applied.
          Lookup is case-insensitive, so <code>/market/ng/</code> matches a{" "}
          <code>NG</code> override key.
        </Paragraph>
      </Box>

      <Box>
        <Subheading>3. Reference implementation (~30 lines)</Subheading>
        <Paragraph>
          Drop this into any TypeScript codebase. It has no runtime
          dependencies and works in Node, browsers, edge runtimes, and
          workers.
        </Paragraph>
        <Box style={codeBlockStyle}>
{`type Overrides = {
  version?: number;
  overrides?: Record<string, Record<string, string>>;
};

export function resolveFieldsForMarket<T extends Record<string, unknown>>(
  baseFields: T,
  overridesJson: unknown,
  marketCode: string | null | undefined,
): T {
  if (!marketCode) return baseFields;
  const parsed = parseOverrides(overridesJson);
  const bucket = findBucket(parsed.overrides, marketCode);
  if (!bucket) return baseFields;
  const next: Record<string, unknown> = { ...baseFields };
  for (const [fieldId, value] of Object.entries(bucket)) {
    if (fieldId in next) next[fieldId] = value;
  }
  return next as T;
}

function parseOverrides(raw: unknown): Required<Overrides> {
  if (!raw || typeof raw !== "object") return { version: 1, overrides: {} };
  const r = raw as Overrides;
  return { version: r.version ?? 1, overrides: r.overrides ?? {} };
}

function findBucket(
  o: Record<string, Record<string, string>>,
  key: string,
): Record<string, string> | undefined {
  if (o[key]) return o[key];
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(o)) {
    if (k.toLowerCase() === lower) return v;
  }
  return undefined;
}`}
        </Box>
      </Box>

      <Box>
        <Subheading>4. Frontend wiring (3 steps)</Subheading>
        <List>
          <List.Item>
            <strong>Fetch the entry in the active locale.</strong> Use your
            existing Contentful client (REST, GraphQL, JS SDK).{" "}
            <code>marketOverride</code> is localized, so it always arrives
            scoped to the current locale.
          </List.Item>
          <List.Item>
            <strong>Discover the active market.</strong> Common patterns:
            URL segment (<code>/market/&lt;code&gt;/...</code>), cookie,
            subdomain, geo-IP, or a manual switcher. Normalize at the server
            boundary so all downstream code reads from one place.
          </List.Item>
          <List.Item>
            <strong>Merge on the boundary.</strong> Call{" "}
            <code>resolveFieldsForMarket(...)</code> once per overrideable
            component before rendering.
          </List.Item>
        </List>
      </Box>

      <Box>
        <Subheading>5. Example — Next.js App Router</Subheading>
        <Box style={codeBlockStyle}>
{`// app/[locale]/[slug]/page.tsx
import { headers } from "next/headers";
import { resolveFieldsForMarket } from "./market-overrides";

export default async function Page({ params }) {
  const marketCode = (await headers()).get("x-market-code");
  const entry = await client.getEntries({
    content_type: "heroModule",
    locale: params.locale,
    include: 6,
  }).then(r => r.items[0]);

  const fields = resolveFieldsForMarket(
    entry.fields,
    entry.fields.marketOverride,
    marketCode,
  );

  return <Hero {...fields} />;
}`}
        </Box>
      </Box>

      <Box>
        <Subheading>6. Example — Plain Node / Express</Subheading>
        <Box style={codeBlockStyle}>
{`app.get("/market/:code/products/:slug", async (req, res) => {
  const entry = await client.getEntries({
    content_type: "productStory",
    "fields.slug": req.params.slug,
    locale: req.query.locale ?? "en-US",
  }).then(r => r.items[0]);

  const fields = resolveFieldsForMarket(
    entry.fields,
    entry.fields.marketOverride,
    req.params.code,
  );

  res.send(render(fields));
});`}
        </Box>
      </Box>

      <Box>
        <Subheading>7. SEO & 404s</Subheading>
        <List>
          <List.Item>
            Add <code>noindex</code> on any URL where a market is active —
            the unmarketed URL stays canonical.
          </List.Item>
          <List.Item>
            Validate the URL&apos;s market code against the published{" "}
            <code>market.code</code> list. Unknown codes should 404, not
            silently render base content (otherwise typo&apos;d URLs get
            indexed).
          </List.Item>
        </List>
      </Box>

      <Box>
        <Subheading>Common pitfalls</Subheading>
        <List>
          <List.Item>
            Override saved but storefront still shows base — make sure your
            fetch passes <code>locale</code>;{" "}
            <code>marketOverride</code> is locale-scoped.
          </List.Item>
          <List.Item>
            Case mismatch — use the <code>findBucket</code> helper above so{" "}
            <code>/market/ng/</code> matches a saved <code>NG</code> key.
          </List.Item>
          <List.Item>
            Live Preview &quot;Maximum call stack&quot; error — don&apos;t pass
            deeply-nested entries to <code>useContentfulLiveUpdates</code>.
            See <code>CLAUDE.md</code> in this repo for the pattern.
          </List.Item>
          <List.Item>
            Editor sees default-locale base value — the field editor must read{" "}
            <code>sdk.field.locale</code>, not <code>sdk.locales.default</code>.
          </List.Item>
        </List>
      </Box>

      <Box>
        <Subheading>More reading</Subheading>
        <Paragraph>
          The app folder ships a <code>README.md</code> at{" "}
          <code>app/ctf-apps/market-override-helper/README.md</code> with
          full reference implementations for Next.js (App Router & Pages),
          Express, Astro, SvelteKit, and plain browser JS. The same merge
          function backs all of them.
        </Paragraph>
      </Box>
    </Stack>
  );
}

interface StatusProps {
  validation: ReturnType<typeof validateMarketContentType>;
  configuredId: string;
  installing: boolean;
}

function MarketContentTypeStatus({ validation, configuredId, installing }: StatusProps) {
  if (installing) {
    return (
      <Note variant="neutral">
        <Flex alignItems="center" gap="spacingS">
          <Spinner size="small" />
          <Text>Installing market content type…</Text>
        </Flex>
      </Note>
    );
  }

  if (!validation.exists) {
    return (
      <Note variant="warning">
        <Text>
          Content type <code>{configuredId || "(none)"}</code> doesn&apos;t exist
          in this environment yet. It will be created with the canonical schema
          when you save this config.
        </Text>
      </Note>
    );
  }

  const variant = validation.problems.length === 0 ? "positive" : "warning";
  return (
    <Note variant={variant}>
      <Stack flexDirection="column" spacing="spacingXs" alignItems="flex-start">
        <Flex gap="spacingXs" alignItems="center" flexWrap="wrap">
          <Badge variant={validation.hasCodeField ? "positive" : "negative"}>
            code field {validation.hasCodeField ? "✓" : "✗"}
          </Badge>
          <Badge variant={validation.hasDisplayField ? "positive" : "negative"}>
            display field {validation.hasDisplayField ? "✓" : "✗"}
          </Badge>
          <Badge variant={validation.hasFlagField ? "positive" : "secondary"}>
            flag {validation.hasFlagField ? "✓" : "—"}
          </Badge>
        </Flex>
        {validation.problems.length > 0 && (
          <Box>
            {validation.problems.map((p, i) => (
              <Text key={i} as="div" fontColor="gray700">
                • {p}
              </Text>
            ))}
          </Box>
        )}
        {validation.problems.length === 0 && (
          <Text>
            Content type <code>{configuredId}</code> is ready to be used as the
            market catalogue.
          </Text>
        )}
      </Stack>
    </Note>
  );
}
