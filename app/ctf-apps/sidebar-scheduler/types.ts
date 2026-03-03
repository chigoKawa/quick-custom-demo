/**
 * Sidebar Scheduler – shared types
 *
 * Used by both the API routes (server) and the sidebar UI (client).
 */

// ---------------------------------------------------------------------------
// Schedule record
// ---------------------------------------------------------------------------

export type ScheduleAction = "publish" | "unpublish";

export type ScheduleStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";

export interface ScheduleRecord {
  /** Unique schedule ID (UUID-like) */
  id: string;
  /** Contentful space ID */
  spaceId: string;
  /** Contentful environment ID */
  environmentId: string;
  /** Target entry ID */
  entryId: string;
  /** Locales to publish/unpublish */
  locales: string[];
  /** Action to perform */
  action: ScheduleAction;
  /** Scheduled execution time (ISO 8601 UTC) */
  runAt: string;
  /** IANA timezone the editor chose (display only; runAt is always UTC) */
  timezone: string;
  /** Current status */
  status: ScheduleStatus;
  /** Number of execution attempts */
  attempts: number;
  /** Last error message, if any */
  lastError?: string;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /**
   * Deterministic key derived from entryId + action + runAt + sorted locales.
   * Used to prevent duplicate schedules.
   */
  idempotencyKey: string;
  /** Whether to also publish/unpublish referenced entries & assets (publish only) */
  includeReferences: boolean;
}

// ---------------------------------------------------------------------------
// API request / response shapes
// ---------------------------------------------------------------------------

/** POST /api/sidebar-scheduler/schedules – create */
export interface CreateScheduleBody {
  spaceId: string;
  environmentId: string;
  entryId: string;
  locales: string[];
  action: ScheduleAction;
  /** ISO 8601 UTC */
  runAt: string;
  /** IANA timezone string */
  timezone: string;
  includeReferences?: boolean;
}

/** PATCH /api/sidebar-scheduler/schedules – cancel */
export interface CancelScheduleBody {
  scheduleId: string;
}

/** POST /api/sidebar-scheduler/worker/run – execute due schedules */
export interface WorkerRunBody {
  /** If true, only return what would run without executing */
  dryRun?: boolean;
}

/** Standard API envelope */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ---------------------------------------------------------------------------
// App installation parameters (config screen)
// ---------------------------------------------------------------------------

export interface SchedulerInstallationParameters {
  /** Base URL of the Next.js host, e.g. http://localhost:3000 */
  apiBaseUrl?: string;
  /** Shared secret sent as x-scheduler-secret header */
  apiSecret?: string;
}
