"use client";

import type { SidebarAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { useEffect, useState, useCallback } from "react";
import { fetchWithTimeout } from "../utils";
import styles from "./pms-sidebar.module.css";

type SidebarState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: any };

export default function PmsSidebar() {
  const sdk = useSDK<SidebarAppSDK>();
  const [statsState, setStatsState] = useState<SidebarState>({ status: "idle" });

  const loadStats = useCallback(async () => {
    setStatsState({ status: "loading" });

    try {
      const result = await fetchWithTimeout<any>(
        "/api/integrations/properties?limit=5",
        {},
        5000
      );

      if (!result.ok) {
        setStatsState({ status: "error", message: result.error });
        return;
      }

      setStatsState({ status: "success", data: result.data });
    } catch (error) {
      setStatsState({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const isLoading = statsState.status === "loading";
  const isError = statsState.status === "error";
  const isSuccess = statsState.status === "success";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>🏢 PMS</h3>
        <p className={styles.subtitle}>
          Quick stats and actions for your PMS integration.
        </p>
      </div>

      {isLoading && (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <div className={styles.loadingText}>Loading PMS data...</div>
        </div>
      )}

      {isError && (
        <div className={styles.errorState}>
          <div className={styles.errorTitle}>⚠️ Error</div>
          <div className={styles.errorMessage}>{statsState.message}</div>
        </div>
      )}

      {isSuccess && (
        <>
          {/* Status Card */}
          <div className={styles.statusCard}>
            <div className={styles.statusTitle}>Provider Status</div>
            <div className={styles.statusGrid}>
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>Provider</span>
                <span className={styles.statusValue}>
                  {statsState.data.provider || "Unknown"}
                </span>
              </div>
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>Health</span>
                <span className={styles.statusValue}>
                  <span className={`${styles.healthBadge} ${statsState.data.healthy ? styles.healthBadgeHealthy : styles.healthBadgeUnhealthy}`}>
                    {statsState.data.healthy ? "✓ Healthy" : "✗ Unhealthy"}
                  </span>
                </span>
              </div>
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>Properties</span>
                <span className={styles.statusValue}>{statsState.data.count || 0}</span>
              </div>
            </div>
          </div>

          {/* Property List */}
          {statsState.data.properties && statsState.data.properties.length > 0 ? (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>🏢 Properties</div>
              <div className={styles.productList}>
                {statsState.data.properties.slice(0, 5).map((property: any) => (
                  <div key={property.id} className={styles.productItem}>
                    <div className={styles.productTitle}>{property.name}</div>
                    <div className={styles.productPrice}>{property.city}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🏢</div>
              <div className={styles.emptyText}>No properties available</div>
            </div>
          )}

          {/* Refresh Button */}
          <button className={styles.refreshButton} onClick={loadStats}>
            🔄 Refresh Stats
          </button>
        </>
      )}

      {/* Tip Box */}
      <div className={styles.tipBox}>
        <p>
          <strong>💡 Tip:</strong> Use the Property Selector field to link a PMS property to this
          content entry.
        </p>
      </div>
    </div>
  );
}
