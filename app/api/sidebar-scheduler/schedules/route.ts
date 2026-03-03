import { NextRequest, NextResponse } from "next/server";
import {
  listSchedules,
  createSchedule,
  cancelSchedule,
} from "@/app/ctf-apps/sidebar-scheduler/lib/schedule-store";
import type {
  ApiResponse,
  CreateScheduleBody,
  CancelScheduleBody,
  ScheduleRecord,
} from "@/app/ctf-apps/sidebar-scheduler/types";

const LOG_PREFIX = "[SidebarScheduler:API:schedules]";

// ---------------------------------------------------------------------------
// GET /api/sidebar-scheduler/schedules?entryId=...&spaceId=...&environmentId=...
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ScheduleRecord[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get("entryId") ?? undefined;
    const spaceId = searchParams.get("spaceId") ?? undefined;
    const environmentId = searchParams.get("environmentId") ?? undefined;

    const schedules = listSchedules({ spaceId, environmentId, entryId });

    // Sort newest first
    schedules.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({ success: true, data: schedules });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} GET error: ${msg}`);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/sidebar-scheduler/schedules – create a new schedule
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ScheduleRecord>>> {
  try {
    const body: CreateScheduleBody = await request.json();

    // Validate required fields
    const missing: string[] = [];
    if (!body.spaceId) missing.push("spaceId");
    if (!body.environmentId) missing.push("environmentId");
    if (!body.entryId) missing.push("entryId");
    if (!body.locales || body.locales.length === 0) missing.push("locales");
    if (!body.action) missing.push("action");
    if (!body.runAt) missing.push("runAt");
    if (!body.timezone) missing.push("timezone");

    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    // Validate action
    if (body.action !== "publish" && body.action !== "unpublish") {
      return NextResponse.json(
        { success: false, error: `Invalid action "${body.action}". Must be "publish" or "unpublish".` },
        { status: 400 },
      );
    }

    // Validate runAt is a valid ISO date
    const runAtDate = new Date(body.runAt);
    if (isNaN(runAtDate.getTime())) {
      return NextResponse.json(
        { success: false, error: `Invalid runAt date: "${body.runAt}". Must be ISO 8601.` },
        { status: 400 },
      );
    }

    const record = createSchedule(body);

    console.log(
      `${LOG_PREFIX} Created schedule ${record.id}: ${record.action} entry ${record.entryId} ` +
        `locales=[${record.locales.join(",")}] at ${record.runAt}`,
    );

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} POST error: ${msg}`);

    // Duplicate schedule → 409
    if (msg.includes("Duplicate schedule")) {
      return NextResponse.json({ success: false, error: msg }, { status: 409 });
    }

    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/sidebar-scheduler/schedules – cancel a schedule
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<ScheduleRecord>>> {
  try {
    const body: CancelScheduleBody = await request.json();

    if (!body.scheduleId) {
      return NextResponse.json(
        { success: false, error: "Missing required field: scheduleId" },
        { status: 400 },
      );
    }

    const record = cancelSchedule(body.scheduleId);
    console.log(`${LOG_PREFIX} Canceled schedule ${record.id}`);

    return NextResponse.json({ success: true, data: record });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} PATCH error: ${msg}`);

    if (msg.includes("not found")) {
      return NextResponse.json({ success: false, error: msg }, { status: 404 });
    }
    if (msg.includes("Cannot cancel")) {
      return NextResponse.json({ success: false, error: msg }, { status: 409 });
    }

    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
