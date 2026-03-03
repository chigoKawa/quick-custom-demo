import { NextRequest, NextResponse } from "next/server";
import { runDueSchedules } from "@/app/ctf-apps/sidebar-scheduler/lib/worker";
import type { ApiResponse } from "@/app/ctf-apps/sidebar-scheduler/types";
import type { WorkerResult } from "@/app/ctf-apps/sidebar-scheduler/lib/worker";

const LOG_PREFIX = "[SidebarScheduler:API:worker]";

/**
 * POST /api/sidebar-scheduler/worker/run
 *
 * Executes all due schedules (runAt <= now, status = pending).
 * Body: { dryRun?: boolean }
 *
 * Can be called:
 *   - Manually from the sidebar "Run now" button
 *   - By an external cron job hitting this endpoint
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<WorkerResult>>> {
  const startTime = Date.now();

  try {
    let dryRun = false;
    try {
      const body = await request.json();
      dryRun = body?.dryRun === true;
    } catch {
      // Empty body is fine – defaults to dryRun=false
    }

    console.log(`${LOG_PREFIX} Worker run triggered (dryRun=${dryRun})`);

    const result = await runDueSchedules(dryRun);

    console.log(
      `${LOG_PREFIX} Worker complete: ${result.processed} processed, ` +
        `${result.succeeded} succeeded, ${result.failed} failed ` +
        `(${Date.now() - startTime}ms)`,
    );

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} Worker error: ${msg}`);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 },
    );
  }
}

/**
 * GET /api/sidebar-scheduler/worker/run
 *
 * Health check for the worker endpoint.
 */
export async function GET(): Promise<NextResponse<ApiResponse>> {
  const hasToken = !!process.env.CONTENTFUL_MANAGEMENT_TOKEN;
  return NextResponse.json({
    success: true,
    data: {
      service: "sidebar-scheduler-worker",
      configured: hasToken,
    },
  });
}
