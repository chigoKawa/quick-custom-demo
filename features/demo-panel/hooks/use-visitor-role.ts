"use client";

import { useState, useEffect, useCallback } from "react";
import { useNinetailed } from "@ninetailed/experience.js-react";
import { VisitorRole } from "../constants";

const STORAGE_KEY = "demo_visitor_role";

/**
 * Hook to manage visitor role persistence and Ninetailed identification.
 * - Persists selected role to localStorage
 * - Re-applies role on page load
 * - Calls Ninetailed identify with role trait
 */
export function useVisitorRole() {
  const { identify } = useNinetailed();
  const [selectedRole, setSelectedRole] = useState<VisitorRole | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Load persisted role on mount and re-apply it
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const role = stored as VisitorRole;
        setSelectedRole(role);
        // Re-apply the role to Ninetailed
        identify("", { role }).catch((err) => {
          console.warn("[DemoPanel] Failed to re-apply persisted role:", err);
        });
      }
    } catch {
      // localStorage may be unavailable
    }
  }, [identify]);

  const applyRole = useCallback(
    async (role: VisitorRole) => {
      setIsApplying(true);
      try {
        // Identify with the role trait
        await identify("", { role });

        // Persist to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, role);
        }

        setSelectedRole(role);
        console.info("[DemoPanel] Applied visitor role:", role);
      } catch (err) {
        console.error("[DemoPanel] Failed to apply role:", err);
        throw err;
      } finally {
        setIsApplying(false);
      }
    },
    [identify]
  );

  const clearRole = useCallback(async () => {
    setIsApplying(true);
    try {
      // Identify with empty role to clear
      await identify("", { role: "" });

      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }

      setSelectedRole(null);
      console.info("[DemoPanel] Cleared visitor role");
    } catch (err) {
      console.error("[DemoPanel] Failed to clear role:", err);
    } finally {
      setIsApplying(false);
    }
  }, [identify]);

  return {
    selectedRole,
    setSelectedRole,
    applyRole,
    clearRole,
    isApplying,
  };
}
