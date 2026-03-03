"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSDK } from "@contentful/react-apps-toolkit";
import type { SidebarAppSDK } from "@contentful/app-sdk";
import type {
  ApiResponse,
  ScheduleRecord,
  ScheduleAction,
  SchedulerInstallationParameters,
} from "../types";
import styles from "./sidebar.module.css";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function apiBase(params: SchedulerInstallationParameters): string {
  return (params.apiBaseUrl || "").replace(/\/+$/, "") || "";
}

function headers(params: SchedulerInstallationParameters): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (params.apiSecret) h["x-scheduler-secret"] = params.apiSecret;
  return h;
}

function formatDate(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: tz,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "⏳ Pending",
    running: "⚙️ Running",
    succeeded: "✅ Succeeded",
    failed: "❌ Failed",
    canceled: "🚫 Canceled",
  };
  return map[status] ?? status;
}

function statusClass(status: string): string {
  const map: Record<string, string> = {
    pending: styles.statusPending,
    running: styles.statusRunning,
    succeeded: styles.statusSucceeded,
    failed: styles.statusFailed,
    canceled: styles.statusCanceled,
  };
  return map[status] ?? "";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SchedulerSidebar() {
  const sdk = useSDK<SidebarAppSDK>();

  const entryId = sdk.entry.getSys().id;
  const spaceId = sdk.ids.space;
  const environmentId = sdk.ids.environment;
  const installParams = (sdk.parameters.installation ?? {}) as SchedulerInstallationParameters;

  // Available locales from the space
  const allLocales = useMemo(
    () => sdk.locales.available.map((code) => code),
    [sdk.locales.available],
  );

  // ----- State -----
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create-form state
  const [showForm, setShowForm] = useState(false);
  const [formAction, setFormAction] = useState<ScheduleAction>("publish");
  const [formLocales, setFormLocales] = useState<string[]>([]);
  const [formRunAt, setFormRunAt] = useState("");
  const [formTimezone, setFormTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [formIncludeRefs, setFormIncludeRefs] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Worker state
  const [workerRunning, setWorkerRunning] = useState(false);
  const [workerResult, setWorkerResult] = useState<string | null>(null);
  const [workerOk, setWorkerOk] = useState(true);

  // ----- API calls -----
  const base = apiBase(installParams);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${base}/api/sidebar-scheduler/schedules?entryId=${entryId}&spaceId=${spaceId}&environmentId=${environmentId}`;
      const res = await fetch(url, { headers: headers(installParams) });
      const json: ApiResponse<ScheduleRecord[]> = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");
      setSchedules(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [base, entryId, spaceId, environmentId, installParams]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Auto-resize sidebar height
  useEffect(() => {
    sdk.window.startAutoResizer();
    return () => sdk.window.stopAutoResizer();
  }, [sdk.window]);

  const handleCreate = useCallback(async () => {
    setFormSubmitting(true);
    setFormError(null);
    try {
      if (formLocales.length === 0) throw new Error("Select at least one locale.");
      if (!formRunAt) throw new Error("Select a date and time.");

      // Convert local datetime to UTC ISO string
      const localDate = new Date(formRunAt);
      if (isNaN(localDate.getTime())) throw new Error("Invalid date/time.");

      const res = await fetch(`${base}/api/sidebar-scheduler/schedules`, {
        method: "POST",
        headers: headers(installParams),
        body: JSON.stringify({
          spaceId,
          environmentId,
          entryId,
          locales: formLocales,
          action: formAction,
          runAt: localDate.toISOString(),
          timezone: formTimezone,
          includeReferences: formIncludeRefs,
        }),
      });

      const json: ApiResponse<ScheduleRecord> = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to create schedule.");

      // Reset form and refresh
      setShowForm(false);
      setFormLocales([]);
      setFormRunAt("");
      setFormIncludeRefs(true);
      await fetchSchedules();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setFormSubmitting(false);
    }
  }, [
    base,
    installParams,
    spaceId,
    environmentId,
    entryId,
    formLocales,
    formAction,
    formRunAt,
    formTimezone,
    formIncludeRefs,
    fetchSchedules,
  ]);

  const handleCancel = useCallback(
    async (scheduleId: string) => {
      try {
        const res = await fetch(`${base}/api/sidebar-scheduler/schedules`, {
          method: "PATCH",
          headers: headers(installParams),
          body: JSON.stringify({ scheduleId }),
        });
        const json: ApiResponse = await res.json();
        if (!json.success) throw new Error(json.error ?? "Cancel failed.");
        await fetchSchedules();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [base, installParams, fetchSchedules],
  );

  const handleWorkerRun = useCallback(async () => {
    setWorkerRunning(true);
    setWorkerResult(null);
    try {
      const res = await fetch(`${base}/api/sidebar-scheduler/worker/run`, {
        method: "POST",
        headers: headers(installParams),
        body: JSON.stringify({ dryRun: false }),
      });
      const json: ApiResponse<{
        processed: number;
        succeeded: number;
        failed: number;
      }> = await res.json();

      if (!json.success) throw new Error(json.error ?? "Worker run failed.");

      const d = json.data!;
      setWorkerOk(d.failed === 0);
      setWorkerResult(
        `Processed ${d.processed} schedule(s): ${d.succeeded} succeeded, ${d.failed} failed.`,
      );
      await fetchSchedules();
    } catch (err) {
      setWorkerOk(false);
      setWorkerResult(err instanceof Error ? err.message : String(err));
    } finally {
      setWorkerRunning(false);
    }
  }, [base, installParams, fetchSchedules]);

  // ----- Toggle locale checkbox -----
  const toggleLocale = (code: string) => {
    setFormLocales((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  // ----- Render -----
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>📅 Locale Scheduler</h3>
        <p className={styles.subtitle}>
          Schedule publish / unpublish per locale for this entry.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className={styles.scheduleError} style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Schedule list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 16, color: "#8492a6" }}>
          <div className={styles.spinner} style={{ borderTopColor: "#0066cc", borderColor: "rgba(0,102,204,0.2)" }} />
          <div style={{ marginTop: 8, fontSize: 12 }}>Loading schedules…</div>
        </div>
      ) : schedules.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📅</div>
          <div className={styles.emptyText}>
            No schedules for this entry yet.
          </div>
        </div>
      ) : (
        <div className={styles.scheduleList}>
          {schedules.map((s) => (
            <div key={s.id} className={styles.scheduleCard}>
              <div className={styles.scheduleCardHeader}>
                <span
                  className={`${styles.scheduleAction} ${
                    s.action === "publish" ? styles.actionPublish : styles.actionUnpublish
                  }`}
                >
                  {s.action}
                </span>
                {s.status === "pending" && (
                  <button
                    className={styles.cancelBtn}
                    onClick={() => handleCancel(s.id)}
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className={styles.scheduleLocales}>
                {s.locales.map((loc) => (
                  <span key={loc} className={styles.localeBadge}>
                    {loc}
                  </span>
                ))}
              </div>

              <div className={styles.scheduleTime}>
                {formatDate(s.runAt, s.timezone)} ({s.timezone})
              </div>

              <span className={`${styles.scheduleStatus} ${statusClass(s.status)}`}>
                {statusLabel(s.status)}
              </span>

              {s.lastError && (
                <div className={styles.scheduleError}>{s.lastError}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create form toggle */}
      {!showForm ? (
        <button className={styles.btnPrimary} onClick={() => setShowForm(true)}>
          + New Schedule
        </button>
      ) : (
        <div className={styles.formSection}>
          <h4 className={styles.formTitle}>New Schedule</h4>

          {/* Action */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Action</label>
            <select
              className={styles.formSelect}
              value={formAction}
              onChange={(e) => setFormAction(e.target.value as ScheduleAction)}
            >
              <option value="publish">Publish</option>
              <option value="unpublish">Unpublish</option>
            </select>
          </div>

          {/* Locales */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Locales</label>
            <div className={styles.localeCheckboxes}>
              {allLocales.map((loc) => (
                <label key={loc} className={styles.localeCheckbox}>
                  <input
                    type="checkbox"
                    checked={formLocales.includes(loc)}
                    onChange={() => toggleLocale(loc)}
                  />
                  {loc}
                </label>
              ))}
            </div>
          </div>

          {/* Date/time */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Date &amp; Time ({formTimezone})
            </label>
            <input
              type="datetime-local"
              className={styles.formInput}
              value={formRunAt}
              onChange={(e) => setFormRunAt(e.target.value)}
            />
          </div>

          {/* Include references */}
          {formAction === "publish" && (
            <div className={styles.formGroup}>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={formIncludeRefs}
                  onChange={(e) => setFormIncludeRefs(e.target.checked)}
                />
                Also publish referenced entries &amp; assets
              </label>
            </div>
          )}

          {/* Form error */}
          {formError && (
            <div className={styles.scheduleError} style={{ marginBottom: 8 }}>
              {formError}
            </div>
          )}

          {/* Buttons */}
          <div className={styles.btnRow}>
            <button
              className={styles.btnSecondary}
              onClick={() => {
                setShowForm(false);
                setFormError(null);
              }}
              disabled={formSubmitting}
            >
              Cancel
            </button>
            <button
              className={styles.btnPrimary}
              onClick={handleCreate}
              disabled={formSubmitting}
            >
              {formSubmitting ? (
                <>
                  <span className={styles.spinner} /> Creating…
                </>
              ) : (
                "Create Schedule"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Worker / Run now */}
      <div className={styles.workerSection}>
        <button
          className={styles.workerBtn}
          onClick={handleWorkerRun}
          disabled={workerRunning}
        >
          {workerRunning ? (
            <>
              <span className={styles.spinner} /> Running…
            </>
          ) : (
            "▶ Run Due Schedules Now"
          )}
        </button>

        {workerResult && (
          <div
            className={`${styles.workerResult} ${
              workerOk ? styles.workerResultOk : styles.workerResultFail
            }`}
          >
            {workerResult}
          </div>
        )}
      </div>

      {/* Refresh */}
      <button
        className={styles.btnSecondary}
        style={{ marginTop: 8 }}
        onClick={fetchSchedules}
        disabled={loading}
      >
        🔄 Refresh
      </button>

      {/* Tip */}
      <div className={styles.tipBox}>
        <p>
          <strong>💡 Tip:</strong> Schedules are stored in-memory for this demo.
          They will be lost on server restart. In production, persist to a
          database or Contentful entries.
        </p>
      </div>
    </div>
  );
}
