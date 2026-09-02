import {
  FunctionEventHandler,
  FunctionTypeEnum,
} from "@contentful/node-apps-toolkit";

/**
 * Auto Translate Article — App Action pattern (matches compliance-review).
 *
 * Wiring:
 *   1. Author moves an entry into a workflow step (e.g. "Ready to translate").
 *   2. A Contentful **Automation** on that step calls this App Action.
 *   3. The Automation passes { entryId, environmentId, spaceId } in the body.
 *   4. This function reads the entry, discovers every localized field on its
 *      content type, and invokes the configured AI Action once per
 *      (localized field × target locale). Writes translations back as a draft.
 *
 * Configurable via App Installation Parameters (set in the app's Config screen):
 *   - CONTENT_TYPE_IDS      CSV allowlist; empty = every content type
 *   - SOURCE_LOCALE         e.g. "en-US"
 *   - TARGET_LOCALES        CSV, e.g. "de, fr, es, it"
 *   - AI_ACTION_ID          the published AI Action id (required)
 *   - OUTPUT_FORMAT         PlainText | Markdown | RichText
 *   - SKIP_EXISTING         "true" (default) skips already-populated locales
 *   - PUBLISH_AFTER_UPDATE  "true" to publish after write (default false — draft)
 *
 * The set of fields to translate is discovered at runtime by reading the
 * entry's content type and picking every `localized: true` field of a
 * translatable type (Symbol / Text / RichText). No manual field list.
 *
 * Baked-in tunables (constants at the top of the file).
 */

// -------- Installation parameters --------

interface AppInstallationParams {
  CONTENT_TYPE_IDS?: string;
  SOURCE_LOCALE?: string;
  TARGET_LOCALES?: string;
  AI_ACTION_ID?: string;
  OUTPUT_FORMAT?: string;
  SKIP_EXISTING?: string;
  PUBLISH_AFTER_UPDATE?: string;
}

// Field types the translation prompt can safely handle. Anything else
// (Link, Boolean, Number, Date, Location, Object, Array<Link>, etc.) is
// skipped even if `localized: true` on the content type.
const TRANSLATABLE_FIELD_TYPES = new Set(["Symbol", "Text", "RichText"]);

// App Action body the Automation sends.
interface AutoTranslateBody {
  entryId?: string;
  environmentId?: string;
  spaceId?: string;
}

// -------- Tunables --------

const MAX_CONCURRENCY = 4;
const INVOCATION_TIMEOUT_MS = 25_000;
const POLL_INTERVAL_MS = 750;

type OutputFormat = "PlainText" | "Markdown" | "RichText";
type LocaleValue = unknown;

// -------- Utilities --------

function parseCsv(input: string | undefined): string[] {
  if (!input) return [];
  return input.split(",").map((s) => s.trim()).filter(Boolean);
}

function isNonEmpty(v: LocaleValue): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "object") {
    // RichText document — non-empty when it has content nodes.
    const content = (v as { content?: unknown }).content;
    if (Array.isArray(content) && content.length > 0) return true;
    return false;
  }
  return true;
}

type CmaClient = {
  aiActionInvocation: {
    get: (params: {
      spaceId: string;
      environmentId: string;
      aiActionId: string;
      invocationId: string;
    }) => Promise<{
      sys: { status: string; errorCode?: string };
      result?: { content?: unknown };
    }>;
  };
};

async function pollInvocation(
  cma: CmaClient,
  spaceId: string,
  environmentId: string,
  aiActionId: string,
  invocationId: string
): Promise<unknown> {
  const deadline = Date.now() + INVOCATION_TIMEOUT_MS;
  let attempt = 0;
  for (;;) {
    const inv = await cma.aiActionInvocation.get({
      spaceId,
      environmentId,
      aiActionId,
      invocationId,
    });

    const status = inv.sys.status;
    if (status === "COMPLETED") {
      const content = inv.result?.content;
      if (content === undefined || content === null) {
        throw new Error("AI Action returned empty content");
      }
      return content;
    }
    if (status === "FAILED") {
      throw new Error(`AI Action FAILED (${inv.sys.errorCode ?? "unknown"})`);
    }
    if (status === "CANCELLED") {
      throw new Error("AI Action CANCELLED");
    }

    if (Date.now() >= deadline) {
      throw new Error(
        `AI Action timeout after ${INVOCATION_TIMEOUT_MS}ms (status=${status}, attempts=${attempt})`
      );
    }

    // Gentle backoff — 750ms, 900ms, 1080ms, capped at ~1.5s.
    const backoff = Math.min(
      POLL_INTERVAL_MS * Math.pow(1.2, Math.max(0, attempt - 1)),
      1_500
    );
    await new Promise((r) => setTimeout(r, backoff));
    attempt++;
  }
}

async function runBounded<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<Array<PromiseSettledResult<T>>> {
  const results: Array<PromiseSettledResult<T>> = new Array(tasks.length);
  let cursor = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor++;
      try {
        results[i] = { status: "fulfilled", value: await tasks[i]() };
      } catch (err) {
        results[i] = { status: "rejected", reason: err };
      }
    }
  }
  const workerCount = Math.min(Math.max(1, limit), tasks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

// -------- Handler --------

export const handler: FunctionEventHandler<
  FunctionTypeEnum.AppActionCall,
  AppInstallationParams
> = async (event, context) => {
  const { spaceId, environmentId, appInstallationParameters, cma } = context;

  // Loud, structured entry log. Whatever the Automation binds shows up here
  // so misconfigured runs are easy to spot in Function Logs.
  console.log(
    "[AutoTranslate] Invoked",
    JSON.stringify({
      spaceId,
      environmentId,
      hasCma: !!cma,
      headers: event.headers,
      bodyKeys: Object.keys((event.body ?? {}) as object),
      body: event.body,
      installParams: {
        AI_ACTION_ID: appInstallationParameters?.AI_ACTION_ID,
        SOURCE_LOCALE: appInstallationParameters?.SOURCE_LOCALE,
        TARGET_LOCALES: appInstallationParameters?.TARGET_LOCALES,
        CONTENT_TYPE_IDS: appInstallationParameters?.CONTENT_TYPE_IDS,
        SKIP_EXISTING: appInstallationParameters?.SKIP_EXISTING,
        PUBLISH_AFTER_UPDATE: appInstallationParameters?.PUBLISH_AFTER_UPDATE,
        OUTPUT_FORMAT: appInstallationParameters?.OUTPUT_FORMAT,
      },
    })
  );

  // Some Contentful Automation surfaces wrap the App Action call body as
  //   { parameters: { entryId } }
  // while direct App Action invocations send
  //   { entryId }
  // Accept both shapes so the function is robust to the exact automation
  // step configuration.
  const rawBody = (event.body ?? {}) as Record<string, unknown>;
  const nested = (rawBody.parameters ?? {}) as Record<string, unknown>;
  const body: AutoTranslateBody & { debug?: boolean | string } = {
    entryId: (rawBody.entryId as string | undefined) ?? (nested.entryId as string | undefined),
    spaceId: (rawBody.spaceId as string | undefined) ?? (nested.spaceId as string | undefined),
    environmentId:
      (rawBody.environmentId as string | undefined) ??
      (nested.environmentId as string | undefined),
    debug:
      (rawBody.debug as boolean | string | undefined) ??
      (nested.debug as boolean | string | undefined),
  };
  const entryId = body.entryId;
  const targetSpaceId = body.spaceId || spaceId;
  const targetEnvId = body.environmentId || environmentId;

  // Debug escape hatch — if the Automation binds a `debug: true` parameter,
  // we return the full context as a SUCCESSFUL response and short-circuit.
  // Lets you inspect what the App Action actually delivers without needing
  // to read Function Logs.
  if (body.debug === true || (body as unknown as { debug?: string }).debug === "true") {
    return {
      success: true,
      debug: true,
      received: {
        spaceId,
        environmentId,
        hasCma: !!cma,
        body,
        headers: event.headers,
        installParams: appInstallationParameters,
      },
    };
  }

  // We THROW on config/wiring errors instead of returning {success:false}.
  // Contentful Automations treat a rejected promise as a FAILED step and
  // surface the message in the execution row — a 200 with success:false
  // looks like a passed step and is easy to miss.
  if (!entryId) {
    throw new Error(
      `entryId is required in the App Action body. Automation must bind Parameters.entryId to the entry's sys.id. Received body: ${JSON.stringify(body)}`
    );
  }

  // 1. Read config. Fail fast when required config is missing.
  const params = appInstallationParameters ?? {};
  const aiActionId = (params.AI_ACTION_ID ?? "").trim();
  const sourceLocale = (params.SOURCE_LOCALE ?? "en-US").trim();
  const targetLocales = parseCsv(params.TARGET_LOCALES);
  const allowedContentTypes = parseCsv(params.CONTENT_TYPE_IDS);
  const skipExisting = params.SKIP_EXISTING !== "false";
  const publishAfterUpdate = params.PUBLISH_AFTER_UPDATE === "true";
  const outputFormat = (params.OUTPUT_FORMAT ?? "PlainText") as OutputFormat;

  if (!aiActionId) throw new Error("AI_ACTION_ID not set in app installation parameters");
  if (targetLocales.length === 0) throw new Error("TARGET_LOCALES must be set in app installation parameters");
  if (!cma) throw new Error("CMA client not available in FunctionEventContext");

  console.log(
    `[AutoTranslate] Starting for entry ${entryId} in ${targetEnvId} — aiAction=${aiActionId}`
  );

  try {
    // 2. Fetch the entry
    const entry = await cma.entry.get({
      spaceId: targetSpaceId,
      environmentId: targetEnvId,
      entryId,
    });

    const contentTypeId = entry.sys.contentType.sys.id;

    // 3. Content-type filter
    if (allowedContentTypes.length > 0 && !allowedContentTypes.includes(contentTypeId)) {
      console.log(
        `[AutoTranslate] Content type "${contentTypeId}" not in allowlist; skipping.`
      );
      return { success: true, skipped: true, reason: "content type not in allowlist" };
    }

    // 3.5. Fetch the space's locales and drop any configured targets that
    //      aren't installed in the space. Prevents the "Invalid field
    //      locale code" 422 that Contentful throws on entry.update when
    //      you try to write to an unknown locale.
    const spaceLocales = await cma.locale.getMany({
      spaceId: targetSpaceId,
      environmentId: targetEnvId,
      query: { limit: 100 },
    });
    const validLocaleCodes = new Set(
      (spaceLocales.items ?? []).map((l: { code: string }) => l.code)
    );

    if (!validLocaleCodes.has(sourceLocale)) {
      throw new Error(
        `Source locale "${sourceLocale}" is not installed in this space. ` +
          `Available: ${[...validLocaleCodes].join(", ")}`
      );
    }

    const missingTargets = targetLocales.filter((t) => !validLocaleCodes.has(t));
    const targetLocalesFiltered = targetLocales.filter((t) => validLocaleCodes.has(t));

    if (missingTargets.length > 0) {
      console.warn(
        `[AutoTranslate] Ignoring target locales not installed in space: [${missingTargets.join(", ")}]. Space has: [${[...validLocaleCodes].join(", ")}]`
      );
    }
    if (targetLocalesFiltered.length === 0) {
      throw new Error(
        `None of the configured target locales [${targetLocales.join(", ")}] exist in this space. ` +
          `Available locales: [${[...validLocaleCodes].join(", ")}]`
      );
    }

    // 4. Discover translatable fields by reading the content type. Every
    //    field where `localized: true` AND the type is Symbol/Text/RichText
    //    is a translation target. Non-text fields (Link, Number, Date, ...)
    //    are skipped even when marked localized — the AI Action wouldn't
    //    know what to do with them anyway.
    const contentType = await cma.contentType.get({
      spaceId: targetSpaceId,
      environmentId: targetEnvId,
      contentTypeId,
    });

    const translatableFields = (contentType.fields ?? [])
      .filter((f) => f && !f.disabled && !f.omitted)
      .filter((f) => f.localized === true)
      .filter((f) => TRANSLATABLE_FIELD_TYPES.has(f.type))
      .map((f) => ({ id: f.id, type: f.type }));

    // Fetch the AI Action definition and resolve variable IDs by TYPE.
    // The Contentful AI Action API expects variable IDs that match the
    // action's `instruction.variables[].id` (generated UUIDs), not the
    // display names. We identify them by their type:
    //   - `StandardInput` (or `Text`) → the content to translate
    //   - `Locale` → the target locale
    const aiAction = (await cma.aiAction.get({
      spaceId: targetSpaceId,
      aiActionId,
    })) as {
      name?: string;
      instruction?: {
        variables?: Array<{ id: string; type: string; name?: string }>;
      };
      configuration?: { modelType?: string };
    };

    const actionVars = aiAction.instruction?.variables ?? [];

    // Loud diagnostic — if variable detection ever misfires, this log line
    // tells us exactly what shape the AI Action returned.
    console.log(
      `[AutoTranslate] AI Action "${aiAction.name ?? aiActionId}" variables:`,
      JSON.stringify(actionVars)
    );

    // Match by type. Contentful uses `StandardInput` for the primary text
    // input variable; `Text` is the older label. `Locale` is stable. When
    // the action has TWO Locale variables (Source + Target), we disambiguate
    // by name — matching against "source"/"target" case-insensitively.
    const contentVarId =
      actionVars.find((v) => v.type === "StandardInput")?.id ??
      actionVars.find((v) => v.type === "Text")?.id;

    const localeVars = actionVars.filter((v) => v.type === "Locale");
    const findByName = (needle: string) =>
      localeVars.find((v) => (v.name ?? "").toLowerCase().includes(needle));

    // Prefer name match; fall back to positional order (source before target).
    const sourceLocaleVarId = (findByName("source") ?? localeVars[0])?.id;
    const targetLocaleVarId =
      (findByName("target") ?? localeVars[localeVars.length - 1])?.id;

    if (!contentVarId || !targetLocaleVarId) {
      throw new Error(
        `AI Action "${aiAction.name ?? aiActionId}" is missing a required variable. ` +
          `Found: [${actionVars.map((v) => `${v.name ?? v.id}(${v.type})`).join(", ")}]. ` +
          `Need one variable of type "StandardInput" (or "Text") for the content, ` +
          `and at least one of type "Locale" for the target locale.`
      );
    }

    // The source-locale variable is optional in the AI Action definition,
    // but if the prompt references it we must send it or the API rejects
    // with "Missing variable payload".
    console.log(
      `[AutoTranslate] AI Action variables resolved: content=${contentVarId}, sourceLocale=${sourceLocaleVarId ?? "(none)"}, targetLocale=${targetLocaleVarId}`
    );

    if (translatableFields.length === 0) {
      console.log(
        `[AutoTranslate] Content type "${contentTypeId}" has no localized text fields; skipping.`
      );
      return { success: true, skipped: true, reason: "no localized text fields on content type" };
    }

    // 5. Build the (field × locale) job list
    const jobs: Array<{
      fieldId: string;
      fieldType: string;
      targetLocale: string;
      sourceValue: LocaleValue;
    }> = [];

    for (const field of translatableFields) {
      const fieldValues = (entry.fields?.[field.id] ?? {}) as Record<string, LocaleValue>;
      const sourceValue = fieldValues[sourceLocale];
      if (!isNonEmpty(sourceValue)) continue;

      for (const targetLocale of targetLocalesFiltered) {
        if (targetLocale === sourceLocale) continue;
        if (skipExisting && isNonEmpty(fieldValues[targetLocale])) continue;
        jobs.push({
          fieldId: field.id,
          fieldType: field.type,
          targetLocale,
          sourceValue,
        });
      }
    }

    if (jobs.length === 0) {
      console.log(`[AutoTranslate] Nothing to translate for entry ${entryId}`);
      return { success: true, skipped: true, reason: "no work" };
    }

    console.log(
      `[AutoTranslate] ${contentTypeId}: ${translatableFields.length} localized field(s) × ${targetLocalesFiltered.length} target locale(s) = ${jobs.length} translation(s) queued (fields: ${translatableFields.map((f) => `${f.id}[${f.type}]`).join(", ")}; targets: ${targetLocalesFiltered.join(", ")})`
    );

    // 6. Invoke the AI Action for each job with bounded concurrency.
    //    RichText fields need RichText output regardless of the app default;
    //    other text fields use the configured OUTPUT_FORMAT.
    const results = await runBounded(
      jobs.map(({ fieldId, fieldType, targetLocale, sourceValue }) => async () => {
        const contentAsString =
          typeof sourceValue === "string"
            ? sourceValue
            : JSON.stringify(sourceValue);

        const perFieldOutputFormat: OutputFormat =
          fieldType === "RichText" ? "RichText" : outputFormat;

        const jobLabel = `${fieldId}[${fieldType}] → ${targetLocale}`;
        console.log(
          `[AutoTranslate] ▶ Invoke ${jobLabel}, outputFormat=${perFieldOutputFormat}, contentLen=${contentAsString.length}`
        );

        try {
          const invokeVariables: Array<{ id: string; value: string }> = [
            { id: contentVarId, value: contentAsString },
            { id: targetLocaleVarId, value: targetLocale },
          ];
          if (sourceLocaleVarId && sourceLocaleVarId !== targetLocaleVarId) {
            invokeVariables.push({ id: sourceLocaleVarId, value: sourceLocale });
          }

          const invocation = await cma.aiAction.invoke(
            { spaceId: targetSpaceId, environmentId: targetEnvId, aiActionId },
            {
              outputFormat: perFieldOutputFormat,
              variables: invokeVariables,
            }
          );

          console.log(
            `[AutoTranslate]   invocation ${invocation.sys.id} scheduled for ${jobLabel}`
          );

          const translated = await pollInvocation(
            cma,
            targetSpaceId,
            targetEnvId,
            aiActionId,
            invocation.sys.id
          );

          console.log(
            `[AutoTranslate] ✔ ${jobLabel} — got ${typeof translated === "string" ? `${translated.length} chars` : "RichText document"}`
          );

          return { fieldId, targetLocale, translated };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[AutoTranslate] ✘ ${jobLabel} — ${msg}`);
          throw err;
        }
      }),
      MAX_CONCURRENCY
    );

    // 6. Re-fetch to get latest version, then apply successes
    const latest = await cma.entry.get({
      spaceId: targetSpaceId,
      environmentId: targetEnvId,
      entryId,
    });

    let applied = 0;
    const errors: string[] = [];
    for (const r of results) {
      if (r.status === "rejected") {
        errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
        continue;
      }
      const { fieldId, targetLocale, translated } = r.value;
      latest.fields[fieldId] = latest.fields[fieldId] || {};
      (latest.fields[fieldId] as Record<string, unknown>)[targetLocale] = translated;
      applied++;
    }

    if (applied === 0) {
      // All AI Action calls failed — surface as a FAILED automation step.
      throw new Error(
        `All ${results.length} AI Action invocations failed. First errors: ${errors.slice(0, 3).join(" | ")}`
      );
    }

    // 7. Persist as draft (default) or publish
    const updated = await cma.entry.update(
      { spaceId: targetSpaceId, environmentId: targetEnvId, entryId },
      latest
    );

    if (publishAfterUpdate) {
      try {
        await cma.entry.publish(
          { spaceId: targetSpaceId, environmentId: targetEnvId, entryId },
          updated
        );
      } catch (err) {
        console.warn(
          `[AutoTranslate] Publish failed (${err instanceof Error ? err.message : String(err)}). Translations saved as draft.`
        );
      }
    }

    console.log(
      `[AutoTranslate] Entry ${entryId} — applied ${applied}/${results.length}${errors.length ? `; failed: ${errors.join(" | ")}` : ""}`
    );

    return {
      success: true,
      entryId,
      applied,
      total: results.length,
      failed: errors.length,
      errors: errors.length ? errors : undefined,
    };
  } catch (error) {
    // Rethrow with a bit of scaffolding so Contentful's execution UI shows
    // useful context. A 200 with { success: false } would look green in the
    // run history — we want this to be RED.
    const originalMsg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error && error.stack ? error.stack : "";
    console.error("[AutoTranslate] Error:", originalMsg, stack);
    throw new Error(
      `[AutoTranslate] entry=${entryId ?? "?"} — ${originalMsg}`
    );
  }
};
