/**
 * Installation helpers for the Market Override Helper.
 *
 * Creates (or top-ups) the `market` content type used as the catalogue of
 * markets editors can target. Idempotent — re-running adds only the fields
 * that are missing and never removes or renames existing ones.
 *
 * Schema mirrors the canonical shape already used in the MB Crusher space:
 *
 *   internalName  Symbol  required, unique          (displayField)
 *   code          Symbol  required, unique          (stable JSON key)
 *   description   Text    optional
 *   locales       Array<Symbol>  optional
 *   flag          Link<Asset, image>  optional
 */

type Notifier = {
  info?: (message: string) => void;
  success?: (message: string) => void;
  error?: (message: string) => void;
};

export type InstallStep = "creating-market-content-type" | "done";

interface RunInstallationOptions {
  cma: unknown;
  notifier?: Notifier;
  environmentId: string;
  marketContentTypeId?: string;
  onProgress?: (step: InstallStep) => void;
}

const MARKET_CONTENT_TYPE_FIELDS = [
  {
    id: "internalName",
    name: "Internal Name",
    type: "Symbol",
    localized: false,
    required: true,
    validations: [{ unique: true }],
  },
  {
    id: "code",
    name: "Code",
    type: "Symbol",
    localized: false,
    required: true,
    validations: [{ unique: true }],
  },
  {
    id: "description",
    name: "Description",
    type: "Text",
    localized: false,
    required: false,
  },
  {
    id: "locales",
    name: "Locales (Optional)",
    type: "Array",
    localized: false,
    required: false,
    items: { type: "Symbol" },
  },
  {
    id: "flag",
    name: "Flag",
    type: "Link",
    linkType: "Asset",
    localized: false,
    required: false,
    validations: [{ linkMimetypeGroup: ["image"] }],
  },
] as const;

export async function runInstallation(options: RunInstallationOptions) {
  const {
    cma,
    notifier,
    environmentId,
    marketContentTypeId = "market",
    onProgress,
  } = options;

  const client = cma as any;

  const report = (step: InstallStep) => {
    onProgress?.(step);
    notifier?.info?.(`Market Override Helper: ${step.replace(/-/g, " ")}`);
  };

  report("creating-market-content-type");

  // Look for the configured market content type first.
  let existing: any = null;
  try {
    existing = await client.contentType.get({
      contentTypeId: marketContentTypeId,
      environmentId,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; sys?: { id?: string }; message?: string };
    const isNotFound =
      error?.status === 404 ||
      error?.sys?.id === "NotFound" ||
      /could not be found/i.test(error?.message ?? "");
    if (!isNotFound) throw err;
  }

  if (existing) {
    const existingFields: any[] = Array.isArray(existing.fields) ? existing.fields : [];
    const missing = MARKET_CONTENT_TYPE_FIELDS.filter(
      (f) => !existingFields.some((ef) => ef.id === f.id || ef.apiName === f.id)
    );
    if (missing.length === 0) {
      report("done");
      notifier?.success?.(
        `Market content type "${marketContentTypeId}" is already installed.`
      );
      return existing;
    }
    const updated = {
      ...existing,
      fields: [...existingFields, ...missing],
    };
    const updatedCt = await client.contentType.update(
      { contentTypeId: marketContentTypeId, environmentId },
      updated
    );
    const published = await client.contentType.publish(
      { contentTypeId: marketContentTypeId, environmentId },
      updatedCt
    );
    report("done");
    notifier?.success?.(
      `Market content type "${marketContentTypeId}" updated with missing fields.`
    );
    return published;
  }

  // Create from scratch.
  const payload = {
    name: "Market",
    description:
      "Catalogue of markets editors can target with content overrides. Managed by the Market Override Helper app.",
    fields: MARKET_CONTENT_TYPE_FIELDS as unknown as object[],
    displayField: "internalName",
  };

  const created = await client.contentType.createWithId(
    { contentTypeId: marketContentTypeId, environmentId },
    payload
  );
  const published = await client.contentType.publish(
    { contentTypeId: marketContentTypeId, environmentId },
    created
  );

  report("done");
  notifier?.success?.(
    `Market content type "${marketContentTypeId}" created in environment ${environmentId}.`
  );
  return published;
}

export interface MarketContentTypeValidation {
  exists: boolean;
  hasCodeField: boolean;
  hasDisplayField: boolean;
  hasFlagField: boolean;
  resolvedDisplayFieldId?: string;
  problems: string[];
}

/**
 * Inspect a content type and check whether it can be used as the market
 * catalogue for this app. Returns granular flags so the config screen can
 * render per-field status, plus a list of human-readable problems.
 */
export function validateMarketContentType(
  ct: { displayField?: string; fields?: Array<{ id: string; type: string; linkType?: string }> } | null,
  expected: { codeFieldId: string; displayFieldId?: string; flagFieldId?: string }
): MarketContentTypeValidation {
  if (!ct) {
    return {
      exists: false,
      hasCodeField: false,
      hasDisplayField: false,
      hasFlagField: false,
      problems: ["Content type not found in this environment."],
    };
  }

  const fields = ct.fields ?? [];
  const byId = new Map(fields.map((f) => [f.id, f] as const));
  const problems: string[] = [];

  const codeField = byId.get(expected.codeFieldId);
  const hasCodeField = !!codeField && codeField.type === "Symbol";
  if (!codeField) {
    problems.push(`Missing "${expected.codeFieldId}" field (required Symbol field for the market code).`);
  } else if (codeField.type !== "Symbol") {
    problems.push(`Field "${expected.codeFieldId}" must be type Symbol, found ${codeField.type}.`);
  }

  const resolvedDisplayFieldId = expected.displayFieldId || ct.displayField;
  const displayField = resolvedDisplayFieldId ? byId.get(resolvedDisplayFieldId) : undefined;
  const hasDisplayField = !!displayField;
  if (!displayField) {
    problems.push(
      resolvedDisplayFieldId
        ? `Display field "${resolvedDisplayFieldId}" not found on content type.`
        : "Content type has no displayField configured."
    );
  }

  let hasFlagField = false;
  if (expected.flagFieldId) {
    const flagField = byId.get(expected.flagFieldId);
    if (!flagField) {
      problems.push(`Optional flag field "${expected.flagFieldId}" not found — flags will be hidden.`);
    } else if (flagField.type !== "Link" || flagField.linkType !== "Asset") {
      problems.push(
        `Field "${expected.flagFieldId}" must be a Link to Asset to be used as the flag.`
      );
    } else {
      hasFlagField = true;
    }
  }

  return {
    exists: true,
    hasCodeField,
    hasDisplayField,
    hasFlagField,
    resolvedDisplayFieldId,
    problems,
  };
}
