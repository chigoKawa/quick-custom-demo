/**
 * Worker – executes due schedules.
 *
 * Called by POST /api/sidebar-scheduler/worker/run.
 * Iterates all "pending" schedules whose runAt <= now, marks them running,
 * invokes the appropriate CMA publish/unpublish, and updates status.
 */

import { getCmaClient } from "./cma-client";
import {
  getDueSchedules,
  updateScheduleStatus,
} from "./schedule-store";
import {
  publishEntryLocales,
  unpublishEntryLocales,
} from "./publish-utils";
import type { ScheduleRecord } from "../types";

const LOG_PREFIX = "[SidebarScheduler:worker]";

export interface WorkerResult {
  processed: number;
  succeeded: number;
  failed: number;
  details: Array<{
    scheduleId: string;
    entryId: string;
    action: string;
    locales: string[];
    status: "succeeded" | "failed";
    error?: string;
  }>;
}

/**
 * Process all due schedules.
 * If `dryRun` is true, returns the list of due schedules without executing.
 */
export async function runDueSchedules(dryRun = false): Promise<WorkerResult> {
  const due = getDueSchedules();
  console.log(`${LOG_PREFIX} Found ${due.length} due schedule(s)${dryRun ? " (dry run)" : ""}`);

  const result: WorkerResult = {
    processed: due.length,
    succeeded: 0,
    failed: 0,
    details: [],
  };

  if (dryRun || due.length === 0) {
    // In dry-run mode, populate details but don't execute
    for (const schedule of due) {
      result.details.push({
        scheduleId: schedule.id,
        entryId: schedule.entryId,
        action: schedule.action,
        locales: schedule.locales,
        status: "succeeded",
      });
    }
    return result;
  }

  const cma = getCmaClient();

  for (const schedule of due) {
    await executeSchedule(cma, schedule, result);
  }

  return result;
}

async function executeSchedule(
  cma: ReturnType<typeof getCmaClient>,
  schedule: ScheduleRecord,
  result: WorkerResult,
): Promise<void> {
  const { id, spaceId, environmentId, entryId, locales, action, includeReferences } = schedule;

  // Mark running
  updateScheduleStatus(id, "running");
  console.log(
    `${LOG_PREFIX} Executing ${action} for entry ${entryId}, locales=[${locales.join(",")}]`,
  );

  try {
    if (action === "publish") {
      const pubResult = await publishEntryLocales(
        cma,
        spaceId,
        environmentId,
        entryId,
        locales,
        includeReferences,
      );

      if (pubResult.ok) {
        updateScheduleStatus(id, "succeeded");
        result.succeeded += 1;
        result.details.push({
          scheduleId: id,
          entryId,
          action,
          locales,
          status: "succeeded",
        });
      } else {
        const errorSummary = pubResult.errors.map((e) => `${e.type}:${e.id} – ${e.error}`).join("; ");
        updateScheduleStatus(id, "failed", errorSummary);
        result.failed += 1;
        result.details.push({
          scheduleId: id,
          entryId,
          action,
          locales,
          status: "failed",
          error: errorSummary,
        });
      }
    } else {
      // unpublish
      const unpubResult = await unpublishEntryLocales(
        cma,
        spaceId,
        environmentId,
        entryId,
        locales,
      );

      if (unpubResult.ok) {
        updateScheduleStatus(id, "succeeded");
        result.succeeded += 1;
        result.details.push({
          scheduleId: id,
          entryId,
          action,
          locales,
          status: "succeeded",
        });
      } else {
        const errorSummary = unpubResult.errors
          .map((e) => `${e.type}:${e.id} – ${e.error}`)
          .join("; ");
        updateScheduleStatus(id, "failed", errorSummary);
        result.failed += 1;
        result.details.push({
          scheduleId: id,
          entryId,
          action,
          locales,
          status: "failed",
          error: errorSummary,
        });
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} Unhandled error for schedule ${id}: ${msg}`);
    updateScheduleStatus(id, "failed", msg);
    result.failed += 1;
    result.details.push({
      scheduleId: id,
      entryId,
      action,
      locales,
      status: "failed",
      error: msg,
    });
  }
}
