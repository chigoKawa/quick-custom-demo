import { NextRequest, NextResponse } from "next/server";
import { createClient } from "contentful-management";

/**
 * POST /api/integrations/compliance-review
 *
 * Webhook endpoint for Contentful Automations to trigger compliance review.
 * When an entry enters the "Compliance Review" workflow step, the automation
 * calls this endpoint with the entry details.
 *
 * Request body:
 * {
 *   entryId: string,
 *   environmentId: string,
 *   spaceId: string
 * }
 */

interface ComplianceReviewRequest {
  entryId: string;
  environmentId: string;
  spaceId: string;
}

interface ComplianceResult {
  approved: boolean;
  score: number;
  notes: string;
  requestId: string;
}

const WORKFLOW_STEPS = {
  COMPLIANCE_REVIEW: "compliance-review",
  READY_TO_PUBLISH: "ready-to-publish",
  NEEDS_CHANGES: "needs-changes",
};

/**
 * Mock compliance check for testing
 */
async function mockComplianceCheck(content: string): Promise<ComplianceResult> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Simple mock logic
  const hasProhibitedContent = content.toLowerCase().includes("bad");
  const isTooShort = content.length < 10;

  const approved = !hasProhibitedContent && !isTooShort;
  const score = approved
    ? Math.floor(Math.random() * 20) + 80
    : Math.floor(Math.random() * 40) + 20;

  let notes = "";
  if (hasProhibitedContent) {
    notes =
      "Content contains prohibited terms. Please review and remove inappropriate language.";
  } else if (isTooShort) {
    notes = "Content is too short. Please provide more detailed information.";
  } else {
    notes = "Content meets compliance standards. Approved for publication.";
  }

  return {
    approved,
    score,
    notes,
    requestId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
}

/**
 * Call real third-party compliance API
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
    body: JSON.stringify({
      content,
      checkTypes: ["compliance", "quality", "brand-safety"],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Compliance API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  return {
    approved: data.decision === "approved",
    score: data.score ?? 0,
    notes: data.feedback ?? data.reason ?? "",
    requestId: data.requestId ?? data.id ?? "",
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: ComplianceReviewRequest = await request.json();
    const { entryId, environmentId, spaceId } = body;

    if (!entryId || !environmentId || !spaceId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: entryId, environmentId, spaceId",
        },
        { status: 400 }
      );
    }

    console.log(
      `[ComplianceReview] Starting review for entry ${entryId} in ${environmentId}`
    );

    // Get CMA token from environment
    const cmaToken = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
    if (!cmaToken) {
      throw new Error("CONTENTFUL_MANAGEMENT_TOKEN not configured");
    }

    // Configuration
    const mockMode = process.env.COMPLIANCE_MOCK_MODE !== "false";
    const apiKey = process.env.CARAVAL_API_KEY ?? "";
    const apiUrl =
      process.env.CARAVAL_API_URL ?? "https://api.caraval.example.com";

    // Create CMA client
    const client = createClient({ accessToken: cmaToken });
    const space = await client.getSpace(spaceId);
    const environment = await space.getEnvironment(environmentId);

    // 1. Fetch the entry
    const entry = await environment.getEntry(entryId);
    const currentVersion = entry.sys.version;
    const locale = "en-US";

    // 2. Check idempotency
    const existingStatus = entry.fields.complianceStatus?.[locale];
    const existingVersion = entry.fields.complianceRequestedForVersion?.[locale];

    if (
      existingStatus &&
      existingStatus !== "pending" &&
      existingVersion === currentVersion
    ) {
      console.log(
        `[ComplianceReview] Entry ${entryId} already reviewed for version ${currentVersion}, skipping`
      );
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "Already reviewed for this version",
        duration: Date.now() - startTime,
      });
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

    const pendingEntry = await entry.update();
    console.log(`[ComplianceReview] Set status to pending for entry ${entryId}`);

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
      console.log(`[ComplianceReview] Calling compliance API at ${apiUrl}`);
      result = await callComplianceApi(contentToReview, apiUrl, apiKey);
    }

    console.log(
      `[ComplianceReview] Got result: approved=${result.approved}, score=${result.score}`
    );

    // 6. Update entry with results
    // Re-fetch to get latest version
    const latestEntry = await environment.getEntry(entryId);
    const completedAt = new Date().toISOString();

    latestEntry.fields.complianceStatus = {
      [locale]: result.approved ? "approved" : "rejected",
    };
    latestEntry.fields.complianceScore = { [locale]: result.score };
    latestEntry.fields.complianceNotes = { [locale]: result.notes };
    latestEntry.fields.complianceRequestId = { [locale]: result.requestId };
    latestEntry.fields.complianceCompletedAt = { [locale]: completedAt };

    await latestEntry.update();
    console.log(
      `[ComplianceReview] Updated entry ${entryId} with compliance results`
    );

    // 7. Move workflow to next step (if workflow APIs are available)
    // Note: Workflow transitions are typically handled by a second Automation
    // that triggers when complianceStatus changes to "approved" or "rejected"
    // This keeps the architecture simpler and more reliable.
    const nextStepId = result.approved
      ? WORKFLOW_STEPS.READY_TO_PUBLISH
      : WORKFLOW_STEPS.NEEDS_CHANGES;
    console.log(
      `[ComplianceReview] Review complete. Recommended next step: ${nextStepId}`
    );
    console.log(
      `[ComplianceReview] Configure an Automation to move workflow based on complianceStatus field`
    );

    return NextResponse.json({
      success: true,
      entryId,
      result: {
        approved: result.approved,
        score: result.score,
        notes: result.notes,
      },
      duration: Date.now() - startTime,
    });
  } catch (error) {
    console.error(`[ComplianceReview] Error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/compliance-review
 *
 * Health check endpoint
 */
export async function GET() {
  const mockMode = process.env.COMPLIANCE_MOCK_MODE !== "false";
  const hasToken = !!process.env.CONTENTFUL_MANAGEMENT_TOKEN;

  return NextResponse.json({
    status: "ok",
    service: "compliance-review",
    mockMode,
    configured: hasToken,
  });
}
