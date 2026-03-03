import {
  FunctionEventHandler,
  FunctionTypeEnum,
} from "@contentful/node-apps-toolkit";

// App installation parameters type
interface AppInstallationParams {
  CARAVAL_API_KEY?: string;
  CARAVAL_API_URL?: string;
  MOCK_MODE?: string;
}

// App action body parameters
interface ComplianceReviewBody {
  entryId: string;
  environmentId: string;
  spaceId: string;
}

// Compliance API response
interface ComplianceResult {
  approved: boolean;
  score: number;
  notes: string;
  requestId: string;
}

/**
 * Mock compliance check for testing
 */
async function mockComplianceCheck(content: string): Promise<ComplianceResult> {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const hasProhibitedContent = content.toLowerCase().includes("bad");
  const isTooShort = content.length < 10;
  const approved = !hasProhibitedContent && !isTooShort;
  const score = approved
    ? Math.floor(Math.random() * 20) + 80
    : Math.floor(Math.random() * 40) + 20;

  let notes = "";
  if (hasProhibitedContent) {
    notes = "Content contains prohibited terms.";
  } else if (isTooShort) {
    notes = "Content is too short.";
  } else {
    notes = "Content meets compliance standards.";
  }

  return { approved, score, notes, requestId: `mock-${Date.now()}` };
}

/**
 * Call real compliance API
 */
async function callComplianceApi(
  content: string,
  apiUrl: string,
  apiKey: string
): Promise<ComplianceResult> {
  const response = await fetch(`${apiUrl}/v1/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error(`Compliance API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    approved: data.decision === "approved",
    score: data.score ?? 0,
    notes: data.feedback ?? "",
    requestId: data.requestId ?? "",
  };
}

/**
 * Main handler for the Compliance Review App Action
 */
export const handler: FunctionEventHandler<
  FunctionTypeEnum.AppActionCall,
  AppInstallationParams
> = async (event, context) => {
  const { spaceId, environmentId, appInstallationParameters, cma } = context;

  // Get parameters from the app action call body
  const body = event.body as ComplianceReviewBody;
  const entryId = body.entryId;

  // Use context spaceId/environmentId if not provided in body
  const targetSpaceId = body.spaceId || spaceId;
  const targetEnvId = body.environmentId || environmentId;

  // App installation parameters
  const mockMode = appInstallationParameters.MOCK_MODE === "true";
  const apiKey = appInstallationParameters.CARAVAL_API_KEY ?? "";
  const apiUrl = appInstallationParameters.CARAVAL_API_URL ?? "https://api.caraval.example.com";

  console.log(`[ComplianceReview] Starting review for entry ${entryId}`);

  // CMA client is optional - check if available
  if (!cma) {
    console.error("[ComplianceReview] CMA client not available");
    return { success: false, error: "CMA client not available" };
  }

  try {
    // 1. Fetch the entry
    const entry = await cma.entry.get({
      spaceId: targetSpaceId,
      environmentId: targetEnvId,
      entryId,
    });

    const currentVersion = entry.sys.version;
    const locale = "en-US";

    // 2. Check idempotency
    const existingStatus = entry.fields.complianceStatus?.[locale];
    const existingVersion = entry.fields.complianceRequestedForVersion?.[locale];

    if (existingStatus && existingStatus !== "pending" && existingVersion === currentVersion) {
      console.log(`[ComplianceReview] Already reviewed for version ${currentVersion}`);
      return { success: true, skipped: true, reason: "Already reviewed" };
    }

    // 3. Set status to pending
    const now = new Date().toISOString();
    entry.fields.complianceStatus = { [locale]: "pending" };
    entry.fields.complianceRequestedAt = { [locale]: now };
    entry.fields.complianceRequestedForVersion = { [locale]: currentVersion };
    entry.fields.complianceScore = { [locale]: null };
    entry.fields.complianceNotes = { [locale]: null };
    entry.fields.complianceRequestId = { [locale]: null };
    entry.fields.complianceCompletedAt = { [locale]: null };

    const pendingEntry = await cma.entry.update(
      { spaceId: targetSpaceId, environmentId: targetEnvId, entryId },
      entry
    );

    console.log(`[ComplianceReview] Set status to pending`);

    // 4. Extract content to review
    const topic = pendingEntry.fields.topic?.[locale] ?? "";
    const definition = pendingEntry.fields.definition?.[locale] ?? "";
    const contentToReview = `Topic: ${topic}\n\nDefinition: ${definition}`;

    // 5. Call compliance API
    let result: ComplianceResult;
    if (mockMode) {
      console.log(`[ComplianceReview] Using mock mode`);
      result = await mockComplianceCheck(contentToReview);
    } else {
      if (!apiKey) {
        throw new Error("CARAVAL_API_KEY is not configured");
      }
      result = await callComplianceApi(contentToReview, apiUrl, apiKey);
    }

    console.log(`[ComplianceReview] Result: approved=${result.approved}, score=${result.score}`);

    // 6. Update entry with results
    const latestEntry = await cma.entry.get({
      spaceId: targetSpaceId,
      environmentId: targetEnvId,
      entryId,
    });

    latestEntry.fields.complianceStatus = { [locale]: result.approved ? "approved" : "rejected" };
    latestEntry.fields.complianceScore = { [locale]: result.score };
    latestEntry.fields.complianceNotes = { [locale]: result.notes };
    latestEntry.fields.complianceRequestId = { [locale]: result.requestId };
    latestEntry.fields.complianceCompletedAt = { [locale]: new Date().toISOString() };

    await cma.entry.update(
      { spaceId: targetSpaceId, environmentId: targetEnvId, entryId },
      latestEntry
    );

    console.log(`[ComplianceReview] Updated entry with results`);

    return {
      success: true,
      entryId,
      approved: result.approved,
      score: result.score,
      notes: result.notes,
    };
  } catch (error) {
    console.error(`[ComplianceReview] Error:`, error);

    // Try to update entry with error status
    if (cma) {
      try {
        const errorEntry = await cma.entry.get({
          spaceId: targetSpaceId,
          environmentId: targetEnvId,
          entryId,
        });

        const locale = "en-US";
        errorEntry.fields.complianceStatus = { [locale]: "error" };
        errorEntry.fields.complianceNotes = {
          [locale]: `Error: ${error instanceof Error ? error.message : String(error)}`,
        };
        errorEntry.fields.complianceCompletedAt = { [locale]: new Date().toISOString() };

        await cma.entry.update(
          { spaceId: targetSpaceId, environmentId: targetEnvId, entryId },
          errorEntry
        );
      } catch (updateError) {
        console.error(`[ComplianceReview] Failed to update error status:`, updateError);
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
