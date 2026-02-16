"use client";

import type { SidebarAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { useEffect, useState, useCallback } from "react";
import { fetchWithTimeout } from "../utils";
import styles from "./commerce-sidebar.module.css";

type SidebarState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: any };

export default function CommerceSidebar() {
  const sdk = useSDK<SidebarAppSDK>();
  const [statsState, setStatsState] = useState<SidebarState>({ status: "idle" });

  const loadStats = useCallback(async () => {
    setStatsState({ status: "loading" });

    try {
      const result = await fetchWithTimeout<any>(
        "/api/integrations/products?limit=5",
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
        <h3 className={styles.title}>🛍️ Commerce</h3>
        <p className={styles.subtitle}>
          Quick stats and actions for your commerce integration.
        </p>
      </div>

      {isLoading && (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <div className={styles.loadingText}>Loading commerce data...</div>
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
                <span className={styles.statusLabel}>Products</span>
                <span className={styles.statusValue}>{statsState.data.count || 0}</span>
              </div>
            </div>
          </div>

          {/* Recent Products */}
          {statsState.data.products && statsState.data.products.length > 0 ? (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>📦 Recent Products</div>
              <div className={styles.productList}>
                {statsState.data.products.slice(0, 5).map((product: any) => (
                  <div key={product.id} className={styles.productItem}>
                    <div className={styles.productTitle}>{product.title}</div>
                    <div className={styles.productPrice}>${product.price.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📦</div>
              <div className={styles.emptyText}>No products available</div>
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
          <strong>💡 Tip:</strong> Use the Product Catalog field to add products to your content.
          Configure your commerce provider in the app settings.
        </p>
      </div>
    </div>
  );
}
