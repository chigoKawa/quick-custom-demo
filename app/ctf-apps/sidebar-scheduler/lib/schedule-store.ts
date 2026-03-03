/**
 * In-memory schedule store.
 *
 * ⚠️  Prototype only – schedules are lost on server restart / redeploy.
 * Replace with a database or Contentful entries for production use.
 */

import type { ScheduleRecord, ScheduleStatus, CreateScheduleBody } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `sch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Deterministic key to prevent duplicate schedules. */
export function buildIdempotencyKey(
  entryId: string,
  action: string,
  runAt: string,
  locales: string[],
): string {
  const sortedLocales = [...locales].sort().join(",");
  return `${entryId}:${action}:${runAt}:${sortedLocales}`;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const store = new Map<string, ScheduleRecord>();

/** List schedules, optionally filtered by entry. */
export function listSchedules(filters?: {
  spaceId?: string;
  environmentId?: string;
  entryId?: string;
}): ScheduleRecord[] {
  const all = Array.from(store.values());
  if (!filters) return all;

  return all.filter((s) => {
    if (filters.spaceId && s.spaceId !== filters.spaceId) return false;
    if (filters.environmentId && s.environmentId !== filters.environmentId) return false;
    if (filters.entryId && s.entryId !== filters.entryId) return false;
    return true;
  });
}

/** Get a single schedule by ID. */
export function getSchedule(id: string): ScheduleRecord | undefined {
  return store.get(id);
}

/**
 * Create a new schedule.
 * Returns the record or throws if a duplicate idempotency key already exists
 * with status pending / running / succeeded.
 */
export function createSchedule(body: CreateScheduleBody): ScheduleRecord {
  const key = buildIdempotencyKey(body.entryId, body.action, body.runAt, body.locales);

  // Check for duplicates
  for (const existing of store.values()) {
    if (
      existing.idempotencyKey === key &&
      (existing.status === "pending" || existing.status === "running" || existing.status === "succeeded")
    ) {
      throw new Error(
        `Duplicate schedule: an identical ${existing.status} schedule already exists (${existing.id}).`,
      );
    }
  }

  const now = new Date().toISOString();
  const record: ScheduleRecord = {
    id: generateId(),
    spaceId: body.spaceId,
    environmentId: body.environmentId,
    entryId: body.entryId,
    locales: body.locales,
    action: body.action,
    runAt: body.runAt,
    timezone: body.timezone,
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
    idempotencyKey: key,
    includeReferences: body.includeReferences ?? true,
  };

  store.set(record.id, record);
  return record;
}

/** Cancel a pending schedule. Only pending schedules can be canceled. */
export function cancelSchedule(id: string): ScheduleRecord {
  const record = store.get(id);
  if (!record) throw new Error(`Schedule ${id} not found.`);
  if (record.status !== "pending") {
    throw new Error(`Cannot cancel schedule with status "${record.status}".`);
  }
  record.status = "canceled";
  record.updatedAt = new Date().toISOString();
  return record;
}

/** Update a schedule's status (used by the worker). */
export function updateScheduleStatus(
  id: string,
  status: ScheduleStatus,
  error?: string,
): ScheduleRecord {
  const record = store.get(id);
  if (!record) throw new Error(`Schedule ${id} not found.`);
  record.status = status;
  if (status === "running") record.attempts += 1;
  if (error !== undefined) record.lastError = error;
  record.updatedAt = new Date().toISOString();
  return record;
}

/** Return all schedules that are due now (runAt <= now, status = pending). */
export function getDueSchedules(): ScheduleRecord[] {
  const now = new Date().toISOString();
  return Array.from(store.values()).filter(
    (s) => s.status === "pending" && s.runAt <= now,
  );
}

/** Delete all schedules (useful for tests / reset). */
export function clearAll(): void {
  store.clear();
}
