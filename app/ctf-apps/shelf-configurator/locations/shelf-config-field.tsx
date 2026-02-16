"use client";

import styles from "./shelf-config-field.module.css";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  Heading,
  Note,
  Paragraph,
  Select,
  Spinner,
  Text,
  TextInput,
} from "@contentful/f36-components";
import type { FieldAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type {
  BookDetailResponse,
  BookListItem,
  CatalogErrorPayload,
  SearchResponse,
} from "@/lib/open-library.types";
import type { AppInstallationParameters, ShelfConfigV1 } from "../types";
import {
  clampInt,
  fetchJsonWithTimeout,
  fillTemplate,
  getDefaultsFromParams,
  normalizeOptionalString,
  normalizeShelfConfig,
} from "../utils";

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string; details?: unknown }
  | { status: "success"; data: SearchResponse };

type PinnedValidationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string; details?: unknown }
  | { status: "success"; data: BookDetailResponse };

function readInitialConfig(value: unknown): ShelfConfigV1 {
  if (!value || typeof value !== "object") {
    return { version: 1, mode: "search", query: "" };
  }

  const v = value as Partial<ShelfConfigV1>;
  return normalizeShelfConfig({
    internalName: v.internalName,
    query: v.query,
    limit: v.limit,
    pinned: v.pinned,
    presentation: v.presentation,
    advanced: v.advanced,
    debug: v.debug,
  });
}

async function copyToClipboard(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value) return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through
  }

  try {
    const el = document.createElement("textarea");
    el.value = value;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    el.style.top = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

function renderAuthors(item: { authors?: { name: string }[] }) {
  const authors = Array.isArray(item.authors) ? item.authors : [];
  const names = authors.map((a) => a.name).filter(Boolean);
  return names.length > 0 ? names.join(", ") : "—";
}

function cacheKeyFromConfig(cfg: ShelfConfigV1, template: string): string {
  return JSON.stringify({
    template,
    q: cfg.query.trim(),
    advanced: {
      title: cfg.advanced?.title ?? "",
      author: cfg.advanced?.author ?? "",
      subject: cfg.advanced?.subject ?? "",
      language: cfg.advanced?.language ?? "",
      firstPublishYear: cfg.advanced?.firstPublishYear ?? null,
      ebookAccess: cfg.advanced?.ebookAccess ?? "",
    },
    limit: cfg.limit ?? 10,
    debug: cfg.debug ? 1 : 0,
  });
}

function quoteIfNeeded(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /\s/.test(trimmed) ? `"${trimmed.replaceAll('"', "\\\"")}"` : trimmed;
}

function buildOpenLibraryQuery(cfg: ShelfConfigV1): string {
  const parts: string[] = [];
  const base = cfg.query.trim();
  if (base) parts.push(base);

  const title = cfg.advanced?.title?.trim();
  if (title) parts.push(`title:${quoteIfNeeded(title)}`);

  const author = cfg.advanced?.author?.trim();
  if (author) parts.push(`author:${quoteIfNeeded(author)}`);

  const subject = cfg.advanced?.subject?.trim();
  if (subject) parts.push(`subject:${quoteIfNeeded(subject)}`);

  const publisher = cfg.advanced?.publisher?.trim();
  if (publisher) parts.push(`publisher:${quoteIfNeeded(publisher)}`);

  const lang = cfg.advanced?.language?.trim();
  if (lang) parts.push(`language:${lang}`);

  const year = cfg.advanced?.firstPublishYear;
  if (typeof year === "number" && Number.isFinite(year)) {
    parts.push(`first_publish_year:${Math.trunc(year)}`);
  }

  // Year range support
  const yearFrom = cfg.advanced?.firstPublishYearRange?.from;
  const yearTo = cfg.advanced?.firstPublishYearRange?.to;
  if (typeof yearFrom === "number" && Number.isFinite(yearFrom)) {
    parts.push(`first_publish_year:[${Math.trunc(yearFrom)} TO *]`);
  }
  if (typeof yearTo === "number" && Number.isFinite(yearTo)) {
    parts.push(`first_publish_year:[* TO ${Math.trunc(yearTo)}]`);
  }

  const ebookAccess = cfg.advanced?.ebookAccess;
  if (ebookAccess) parts.push(`ebook_access:${ebookAccess}`);

  if (cfg.advanced?.hasFulltext) {
    parts.push(`has_fulltext:true`);
  }

  return parts.join(" ").trim();
}

// Build sort parameter for Open Library API
function buildSortParam(cfg: ShelfConfigV1): string {
  const sort = cfg.advanced?.sort;
  if (!sort) return "";
  
  switch (sort) {
    case "new": return "&sort=new";
    case "old": return "&sort=old";
    case "rating": return "&sort=rating";
    case "editions": return "&sort=editions";
    case "random": return "&sort=random";
    default: return "";
  }
}

export default function ShelfConfigField() {
  const sdk = useSDK<FieldAppSDK>();

  const params = sdk.parameters.installation as AppInstallationParameters | undefined;
  const defaults = useMemo(() => getDefaultsFromParams(params), [params]);

  const [config, setConfig] = useState<ShelfConfigV1>(() =>
    readInitialConfig(sdk.field.getValue())
  );

  const configRef = useRef<ShelfConfigV1>(config);
  const lastWrittenValueRef = useRef<string | null>(null);

  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const saveTimer = useRef<number | null>(null);

  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const previewCache = useRef<Map<string, SearchResponse>>(new Map());

  const [pinnedValidation, setPinnedValidation] = useState<
    Record<string, PinnedValidationState>
  >({});

  const [showStoredJson, setShowStoredJson] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const [advancedDraft, setAdvancedDraft] = useState<{ title: string; author: string; subject: string }>(
    () => ({
      title: config.advanced?.title ?? "",
      author: config.advanced?.author ?? "",
      subject: config.advanced?.subject ?? "",
    })
  );
  const advancedDraftRef = useRef(advancedDraft);
  const advancedDraftIsDirtyRef = useRef(false);
  const advancedDraftTimerRef = useRef<number | null>(null);

  const hasAutoPreviewedRef = useRef(false);

  useEffect(() => {
    sdk.window.startAutoResizer();
  }, [sdk.window]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const flushPendingSaves = () => {
    if (advancedDraftTimerRef.current) {
      window.clearTimeout(advancedDraftTimerRef.current);
      advancedDraftTimerRef.current = null;
    }

    let next = configRef.current;
    let shouldWriteImmediately = false;
    if (advancedDraftIsDirtyRef.current) {
      advancedDraftIsDirtyRef.current = false;
      const draft = advancedDraftRef.current;
      next = normalizeShelfConfig({
        ...next,
        advanced: {
          ...next.advanced,
          title: draft.title,
          author: draft.author,
          subject: draft.subject,
        },
      });
      configRef.current = next;
      setConfig(next);
      shouldWriteImmediately = true;
    }

    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
      shouldWriteImmediately = true;
    }

    if (shouldWriteImmediately) {
      try {
        lastWrittenValueRef.current = JSON.stringify(next);
      } catch {
        lastWrittenValueRef.current = null;
      }
      sdk.field.setValue(next);
      setLastSavedAt(Date.now());
    }
  };

  useEffect(() => {
    return sdk.field.onValueChanged((value) => {
      const serialized = (() => {
        try {
          return JSON.stringify(value ?? null);
        } catch {
          return null;
        }
      })();

      if (serialized && lastWrittenValueRef.current === serialized) {
        return;
      }

      if (serialized) {
        try {
          const currentSerialized = JSON.stringify(configRef.current ?? null);
          if (currentSerialized === serialized) return;
        } catch {
          // ignore
        }
      }

      const next = readInitialConfig(value);
      configRef.current = next;
      setConfig(next);
    });
  }, [sdk.field]);

  useEffect(() => {
    return () => {
      flushPendingSaves();
    };
  }, []);

  useEffect(() => {
    if (advancedDraftIsDirtyRef.current) return;
    const next = {
      title: config.advanced?.title ?? "",
      author: config.advanced?.author ?? "",
      subject: config.advanced?.subject ?? "",
    };
    advancedDraftRef.current = next;
    setAdvancedDraft(next);
  }, [config.advanced?.title, config.advanced?.author, config.advanced?.subject]);

  const scheduleAdvancedDraftCommit = () => {
    if (advancedDraftTimerRef.current) {
      window.clearTimeout(advancedDraftTimerRef.current);
    }
    advancedDraftTimerRef.current = window.setTimeout(() => {
      advancedDraftIsDirtyRef.current = false;
      const draft = advancedDraftRef.current;
      updateConfig({
        advanced: {
          ...configRef.current.advanced,
          title: draft.title,
          author: draft.author,
          subject: draft.subject,
        },
      });
    }, 350);
  };

  const writeConfigDebounced = (next: ShelfConfigV1) => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }

    try {
      lastWrittenValueRef.current = JSON.stringify(next);
    } catch {
      lastWrittenValueRef.current = null;
    }

    saveTimer.current = window.setTimeout(() => {
      sdk.field.setValue(next);
      setLastSavedAt(Date.now());
    }, 450);
  };

  useEffect(() => {
    if (hasAutoPreviewedRef.current) return;
    if (preview.status !== "idle") return;
    const q = buildOpenLibraryQuery(config);
    if (!q) return;

    hasAutoPreviewedRef.current = true;
    void onPreview();
  }, [
    config,
    preview.status,
    // onPreview is a closure but we guard with hasAutoPreviewedRef.
  ]);

  const updateConfig = (patch: Partial<ShelfConfigV1>) => {
    setConfig((prev) => {
      const next = normalizeShelfConfig({ ...prev, ...patch });
      configRef.current = next;
      writeConfigDebounced(next);
      return next;
    });
  };

  const catalogSearchUrl = useMemo(() => {
    const composedQuery = buildOpenLibraryQuery(config);
    const q = encodeURIComponent(composedQuery);
    const limit = String(clampInt(config.limit ?? defaults.defaultLimit, 1, 50));
    const debug = config.debug ? "1" : "0";
    const sortParam = buildSortParam(config);

    return fillTemplate(defaults.catalogSearchUrlTemplate, {
      q,
      limit,
      debug,
    }) + sortParam;
  }, [
    config.query,
    config.limit,
    config.debug,
    config.advanced?.title,
    config.advanced?.author,
    config.advanced?.subject,
    config.advanced?.publisher,
    config.advanced?.language,
    config.advanced?.firstPublishYear,
    config.advanced?.ebookAccess,
    config.advanced?.sort,
    config.advanced?.hasFulltext,
    defaults,
  ]);

  const onPreview = async () => {
    const q = buildOpenLibraryQuery(config);
    if (!q) {
      sdk.notifier.error("Query is required.");
      return;
    }

    const cacheKey = cacheKeyFromConfig(config, defaults.catalogSearchUrlTemplate);
    const cached = previewCache.current.get(cacheKey);
    if (cached) {
      setPreview({ status: "success", data: cached });
      return;
    }

    setPreview({ status: "loading" });

    const res = await fetchJsonWithTimeout<SearchResponse | CatalogErrorPayload>(
      catalogSearchUrl,
      { method: "GET" },
      defaults.requestTimeoutMs
    );

    if (!res.ok) {
      setPreview({ status: "error", message: res.error, details: res.details });
      return;
    }

    const data = res.data as SearchResponse;
    if (!data || !Array.isArray((data as any).items)) {
      setPreview({
        status: "error",
        message: "Unexpected response shape from catalog search",
        details: data,
      });
      return;
    }

    previewCache.current.set(cacheKey, data);
    setPreview({ status: "success", data });
  };

  const validatePinned = async (idType: "ISBN13" | "OLID" | "WORK", id: string) => {
    const trimmedId = id.trim();
    if (!trimmedId) return;

    const debug = config.debug ? "1" : "0";
    const detailUrl = fillTemplate(defaults.bookDetailUrlTemplate, {
      id: encodeURIComponent(trimmedId),
      idType,
      debug,
    });

    const key = `${idType}:${trimmedId}`;
    setPinnedValidation((prev) => ({ ...prev, [key]: { status: "loading" } }));

    const res = await fetchJsonWithTimeout<BookDetailResponse | CatalogErrorPayload>(
      detailUrl,
      { method: "GET" },
      defaults.requestTimeoutMs
    );

    if (!res.ok) {
      setPinnedValidation((prev) => ({
        ...prev,
        [key]: { status: "error", message: res.error, details: res.details },
      }));
      return;
    }

    const data = res.data as BookDetailResponse;
    if (!data || !(data as any).book) {
      setPinnedValidation((prev) => ({
        ...prev,
        [key]: {
          status: "error",
          message: "Unexpected response shape from book detail",
          details: data,
        },
      }));
      return;
    }

    setPinnedValidation((prev) => ({
      ...prev,
      [key]: { status: "success", data },
    }));
  };

  const addPinned = () => {
    const nextPinned = Array.isArray(config.pinned) ? [...config.pinned] : [];
    nextPinned.push({ idType: "ISBN13", id: "" });
    updateConfig({ pinned: nextPinned });
  };

  const updatePinned = (idx: number, patch: Partial<{ idType: "ISBN13" | "OLID"; id: string }>) => {
    const nextPinned = Array.isArray(config.pinned) ? [...config.pinned] : [];
    const prev = nextPinned[idx] ?? { idType: "ISBN13", id: "" };
    nextPinned[idx] = { ...prev, ...patch };
    updateConfig({ pinned: nextPinned });
  };

  const removePinned = (idx: number) => {
    const nextPinned = Array.isArray(config.pinned) ? [...config.pinned] : [];
    nextPinned.splice(idx, 1);
    updateConfig({ pinned: nextPinned.length > 0 ? nextPinned : undefined });
  };

  const gridVariant = config.presentation?.variant ?? "grid";
  const showPrice = config.presentation?.showPrice ?? true;

  const queryPresets = useMemo(
    () => [
      { label: "Fiction", value: "fiction" },
      { label: "Science", value: "science" },
      { label: "Business", value: "business" },
      { label: "Self-help", value: "self help" },
      { label: "History", value: "history" },
      { label: "Fantasy", value: "fantasy" },
    ],
    []
  );

  return (
    <div ref={containerRef} className={styles.container}>
    <Box padding="spacingM">
      {/* Adaptive Header */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>📚</div>
        <h2 className={styles.headerTitle}>Shelf Configurator</h2>
        <Button
          size="small"
          variant={showSettings ? "primary" : "secondary"}
          onClick={() => setShowSettings(!showSettings)}
          className={styles.settingsToggle}
        >
          {showSettings ? "Preview" : "Settings"}
        </Button>
      </div>

      {/* Quick search for compact mode */}
      {!showSettings && (
        <div className={styles.quickSearch}>
          <TextInput
            value={config.query}
            onChange={(e) => updateConfig({ query: e.target.value })}
            placeholder="Search books..."
          />
          <Button size="small" variant="primary" onClick={onPreview} isDisabled={!buildOpenLibraryQuery(config)}>
            Go
          </Button>
        </div>
      )}

      <Heading as="h2" style={{ display: "none" }}>Shelf Configurator</Heading>

      {/* <Note style={{ marginTop: 12 }}>
        <Text>
          Editing field: <strong>{sdk.field.id}</strong>
        </Text>
        <Text>
          Autosave: {lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}` : "Not saved yet"}
        </Text>
      </Note> */}

      <Box marginTop="spacingL">
        {/* <Heading as="h3">Shelf settings</Heading> */}

        <Box marginTop="spacingM" style={{ display: "grid", gap: 12 }}>
                <Box marginTop="spacingXl">
        <Heading as="h3">Preview</Heading>

        {preview.status === "idle" ? (
          <Note style={{ marginTop: 12 }}>
            <Text>Click “Preview results” to fetch matching books.</Text>
          </Note>
        ) : null}

        {preview.status === "loading" ? (
          <Box marginTop="spacingM" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Spinner size="small" />
            <Text>Loading…</Text>
          </Box>
        ) : null}

        {preview.status === "error" ? (
          <Note variant="negative" style={{ marginTop: 12 }}>
            <Text>
              {preview.message}
              {config.debug && preview.details ? (
                <pre style={{ marginTop: 8, fontSize: 12, whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(preview.details, null, 2)}
                </pre>
              ) : null}
            </Text>
          </Note>
        ) : null}

        {preview.status === "success" ? (
          <>
            <div
              className={styles.previewGrid}
              style={{ marginTop: 12 }}
            >
              {preview.data.items.map((item: BookListItem, idx: number) => (
                <div
                  key={`${item.href}-${idx}`}
                  className={styles.bookCard}
                >
                  <div className={styles.bookCardInner}>
                    <div className={styles.bookCover}>
                      {item.coverUrl ? (
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                        />
                      ) : (
                        <span>No cover</span>
                      )}
                    </div>

                    <div className={styles.bookInfo}>
                      <div className={styles.bookTitle}>
                        {item.title}
                      </div>
                      <div className={styles.bookAuthor}>
                        {renderAuthors(item)}
                      </div>
                      <Box
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          marginTop: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span className={styles.bookId}>
                          {item.isbn13
                            ? `ISBN13:${item.isbn13}`
                            : item.olid
                            ? `OLID:${item.olid}`
                            : (item as any).workId
                            ? `WORK:${(item as any).workId}`
                            : "—"}
                        </span>
                        {item.isbn13 || item.olid || (item as any).workId ? (
                          <Button
                            size="small"
                            variant="transparent"
                            onClick={async () => {
                              const value = item.isbn13 ?? item.olid ?? (item as any).workId;
                              if (!value) return;
                              const ok = await copyToClipboard(value);
                              if (ok) sdk.notifier.success("Copied");
                              else sdk.notifier.error("Could not copy");
                            }}
                          >
                            Copy
                          </Button>
                        ) : null}
                      </Box>
                      {showPrice ? (
                        <div className={styles.bookPrice}>
                          {item.price?.formatted ?? ""}
                        </div>
                      ) : null}
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.bookLink}
                      >
                        Open PDP →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {config.debug && preview.data.debug ? (
              <Box marginTop="spacingM">
                <Heading as="h4">Debug</Heading>
                <pre style={{ marginTop: 8, fontSize: 12, whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(preview.data.debug, null, 2)}
                </pre>
              </Box>
            ) : null}
          </>
        ) : null}
      </Box>

          <FormControl isRequired>
            <FormControl.Label>Mode</FormControl.Label>
            <TextInput value="search" isDisabled />
          </FormControl>

          <FormControl isRequired>
            <FormControl.Label>Query</FormControl.Label>
            <TextInput
              value={config.query}
              onChange={(e) => updateConfig({ query: e.target.value })}
            />
            <Box marginTop="spacingXs" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {queryPresets.map((p) => (
                <Button
                  key={p.value}
                  variant="transparent"
                  size="small"
                  onClick={() => updateConfig({ query: p.value })}
                >
                  {p.label}
                </Button>
              ))}
            </Box>
          </FormControl>

          <Box
            padding="spacingS"
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              background: "#fafafa",
            }}
          >
            <Box style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <Heading as="h4">Advanced search</Heading>
              <Button
                size="small"
                variant="transparent"
                onClick={() => setIsAdvancedOpen((v) => !v)}
              >
                {isAdvancedOpen ? "Hide" : "Show"}
              </Button>
            </Box>

            {isAdvancedOpen ? (
              <>
                <Paragraph>
                  These filters are appended to the search query using Open Library&apos;s query syntax.
                </Paragraph>

                <Box style={{ display: "grid", gap: 8, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
                  <FormControl>
                    <FormControl.Label>Title contains</FormControl.Label>
                    <TextInput
                      value={advancedDraft.title}
                      onChange={(e) => {
                        const next = { ...advancedDraftRef.current, title: e.target.value };
                        advancedDraftIsDirtyRef.current = true;
                        advancedDraftRef.current = next;
                        setAdvancedDraft(next);
                        scheduleAdvancedDraftCommit();
                      }}
                      onBlur={() => flushPendingSaves()}
                    />
                  </FormControl>

                  <FormControl>
                    <FormControl.Label>Author contains</FormControl.Label>
                    <TextInput
                      value={advancedDraft.author}
                      onChange={(e) => {
                        const next = { ...advancedDraftRef.current, author: e.target.value };
                        advancedDraftIsDirtyRef.current = true;
                        advancedDraftRef.current = next;
                        setAdvancedDraft(next);
                        scheduleAdvancedDraftCommit();
                      }}
                      onBlur={() => flushPendingSaves()}
                    />
                  </FormControl>

                  <FormControl>
                    <FormControl.Label>Subject</FormControl.Label>
                    <TextInput
                      value={advancedDraft.subject}
                      onChange={(e) => {
                        const next = { ...advancedDraftRef.current, subject: e.target.value };
                        advancedDraftIsDirtyRef.current = true;
                        advancedDraftRef.current = next;
                        setAdvancedDraft(next);
                        scheduleAdvancedDraftCommit();
                      }}
                      onBlur={() => flushPendingSaves()}
                    />
                  </FormControl>

                  <FormControl>
                    <FormControl.Label>Language</FormControl.Label>
                    <Select
                      value={config.advanced?.language ?? ""}
                      onChange={(e) =>
                        updateConfig({
                          advanced: {
                            ...config.advanced,
                            language: e.target.value || undefined,
                          },
                        })
                      }
                    >
                      <Select.Option value="">Any</Select.Option>
                      <Select.Option value="eng">English (eng)</Select.Option>
                      <Select.Option value="spa">Spanish (spa)</Select.Option>
                      <Select.Option value="fre">French (fre)</Select.Option>
                      <Select.Option value="ger">German (ger)</Select.Option>
                      <Select.Option value="ita">Italian (ita)</Select.Option>
                      <Select.Option value="jpn">Japanese (jpn)</Select.Option>
                    </Select>
                  </FormControl>
                </Box>

                <Box
                  marginTop="spacingS"
                  style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}
                >
                  <FormControl>
                    <FormControl.Label>Publisher</FormControl.Label>
                    <TextInput
                      value={config.advanced?.publisher ?? ""}
                      placeholder="e.g. Penguin"
                      onChange={(e) =>
                        updateConfig({
                          advanced: {
                            ...config.advanced,
                            publisher: e.target.value || undefined,
                          },
                        })
                      }
                    />
                  </FormControl>

                  <FormControl>
                    <FormControl.Label>Sort by</FormControl.Label>
                    <Select
                      value={config.advanced?.sort ?? ""}
                      onChange={(e) =>
                        updateConfig({
                          advanced: {
                            ...config.advanced,
                            sort: (e.target.value || undefined) as any,
                          },
                        })
                      }
                    >
                      <Select.Option value="">Relevance</Select.Option>
                      <Select.Option value="new">Newest first</Select.Option>
                      <Select.Option value="old">Oldest first</Select.Option>
                      <Select.Option value="rating">Highest rated</Select.Option>
                      <Select.Option value="editions">Most editions</Select.Option>
                      <Select.Option value="random">Random</Select.Option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormControl.Label>First publish year</FormControl.Label>
                    <TextInput
                      value={
                        typeof config.advanced?.firstPublishYear === "number"
                          ? String(config.advanced.firstPublishYear)
                          : ""
                      }
                      placeholder="e.g. 2020"
                      onChange={(e) => {
                        const raw = e.target.value.trim();
                        const n = raw ? Number(raw) : NaN;
                        updateConfig({
                          advanced: {
                            ...config.advanced,
                            firstPublishYear:
                              raw === "" || !Number.isFinite(n)
                                ? undefined
                                : Math.trunc(n),
                          },
                        });
                      }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormControl.Label>Ebook availability</FormControl.Label>
                    <Select
                      value={config.advanced?.ebookAccess ?? ""}
                      onChange={(e) =>
                        updateConfig({
                          advanced: {
                            ...config.advanced,
                            ebookAccess: (e.target.value || undefined) as any,
                          },
                        })
                      }
                    >
                      <Select.Option value="">Any</Select.Option>
                      <Select.Option value="public">Public</Select.Option>
                      <Select.Option value="borrowable">Borrowable</Select.Option>
                      <Select.Option value="printdisabled">Print-disabled</Select.Option>
                      <Select.Option value="no_ebook">No ebook</Select.Option>
                    </Select>
                  </FormControl>
                </Box>

                <Box marginTop="spacingS" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <Checkbox
                    isChecked={Boolean(config.advanced?.hasFulltext)}
                    onChange={(e) =>
                      updateConfig({
                        advanced: {
                          ...config.advanced,
                          hasFulltext: e.target.checked || undefined,
                        },
                      })
                    }
                  >
                    Has full text available
                  </Checkbox>
                </Box>

                <Note style={{ marginTop: 8, overflow: "hidden" }}>
                  <Text style={{ fontSize: 11 }}>
                    Query: <code style={{ fontSize: 10, wordBreak: "break-all" }}>{buildOpenLibraryQuery(config)}</code>
                  </Text>
                </Note>
              </>
            ) : null}
          </Box>

          <Box style={{ display: "grid", gap: 8, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
            <FormControl>
              <FormControl.Label>Limit (1–50)</FormControl.Label>
              <TextInput
                value={String(config.limit ?? defaults.defaultLimit)}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  updateConfig({ limit: Number.isFinite(n) ? n : defaults.defaultLimit });
                }}
              />
            </FormControl>

            <FormControl>
              <FormControl.Label>Variant</FormControl.Label>
              <Select
                value={gridVariant}
                onChange={(e) =>
                  updateConfig({
                    presentation: {
                      ...config.presentation,
                      variant: e.target.value as any,
                    },
                  })
                }
              >
                <Select.Option value="grid">grid</Select.Option>
                <Select.Option value="carousel">carousel</Select.Option>
              </Select>
            </FormControl>
          </Box>

          <Box style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Checkbox
              isChecked={Boolean(config.debug)}
              onChange={(e) => updateConfig({ debug: e.target.checked })}
            >
              Debug preview
            </Checkbox>

            <Checkbox
              isChecked={Boolean(showPrice)}
              onChange={(e) =>
                updateConfig({
                  presentation: {
                    ...config.presentation,
                    showPrice: e.target.checked,
                  },
                })
              }
            >
              Show price
            </Checkbox>

            <Checkbox
              isChecked={showStoredJson}
              onChange={(e) => setShowStoredJson(e.target.checked)}
            >
              Show stored JSON
            </Checkbox>
          </Box>

          <Note style={{ overflow: "hidden" }}>
            <Text style={{ fontSize: 11 }}>
              Preview URL:{" "}
              <code style={{ fontSize: 10, wordBreak: "break-all", display: "inline-block", maxWidth: "100%" }}>
                {catalogSearchUrl}
              </code>
            </Text>
          </Note>

          <Box style={{ display: "flex", gap: 12 }}>
            <Button variant="primary" onClick={onPreview}>
              Preview results
            </Button>
          </Box>
        </Box>
      </Box>

      <Box marginTop="spacingXl" className="hidden">
        <Heading as="h3">Pinned items</Heading>
        <Paragraph>Optional IDs to pin (not yet merged into preview in v1).</Paragraph>

        <Box marginTop="spacingM" style={{ display: "grid", gap: 12 }}>
          {(config.pinned ?? []).map((p, idx) => {
            const idType = p.idType;
            const id = p.id;
            const key = `${idType}:${id.trim()}`;
            const vState = pinnedValidation[key] ?? { status: "idle" as const };

            return (
              <Box
                key={`${idx}`}
                padding="spacingS"
                style={{ border: "1px solid #e5e7eb", borderRadius: 8 }}
              >
                <Box style={{ display: "grid", gap: 12, gridTemplateColumns: "140px 1fr" }}>
                  <FormControl>
                    <FormControl.Label>idType</FormControl.Label>
                    <Select
                      value={idType}
                      onChange={(e) => updatePinned(idx, { idType: e.target.value as any })}
                    >
                      <Select.Option value="ISBN13">ISBN13</Select.Option>
                      <Select.Option value="OLID">OLID</Select.Option>
                      <Select.Option value="WORK">WORK</Select.Option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormControl.Label>id</FormControl.Label>
                    <TextInput value={id} onChange={(e) => updatePinned(idx, { id: e.target.value })} />
                  </FormControl>
                </Box>

                <Box marginTop="spacingS" style={{ display: "flex", gap: 12 }}>
                  <Button
                    variant="secondary"
                    isDisabled={!normalizeOptionalString(id)}
                    onClick={() => validatePinned(idType, id)}
                  >
                    Validate pinned item
                  </Button>
                  <Button variant="negative" onClick={() => removePinned(idx)}>
                    Remove
                  </Button>
                </Box>

                {vState.status === "loading" ? (
                  <Box marginTop="spacingS" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Spinner size="small" />
                    <Text>Validating…</Text>
                  </Box>
                ) : null}

                {vState.status === "error" ? (
                  <Note variant="negative" style={{ marginTop: 12 }}>
                    <Text>
                      {vState.message}
                      {config.debug && vState.details ? (
                        <pre style={{ marginTop: 8, fontSize: 12, whiteSpace: "pre-wrap" }}>
                          {JSON.stringify(vState.details, null, 2)}
                        </pre>
                      ) : null}
                    </Text>
                  </Note>
                ) : null}

                {vState.status === "success" ? (
                  <Note variant="positive" style={{ marginTop: 12 }}>
                    <Text>
                      Found: <strong>{vState.data.book.title}</strong> — {renderAuthors(vState.data.book)}
                    </Text>
                  </Note>
                ) : null}
              </Box>
            );
          })}

          <Button variant="secondary" onClick={addPinned}>
            Add pinned item
          </Button>
        </Box>
      </Box>



      {showStoredJson ? (
        <Box marginTop="spacingXl">
          <Heading as="h3">Stored JSON</Heading>
          <pre
            style={{
              marginTop: 8,
              fontSize: 12,
              padding: 12,
              background: "#f7f9fa",
              borderRadius: 8,
              maxHeight: 260,
              overflow: "auto",
            }}
          >
            {JSON.stringify(config, null, 2)}
          </pre>
        </Box>
      ) : null}
    </Box>
    </div>
  );
}
