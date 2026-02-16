"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VISITOR_ROLES, VisitorRole } from "../constants";
import { useVisitorRole } from "../hooks/use-visitor-role";

/**
 * Visitor Role action component for the demo panel.
 * Allows selecting and applying a visitor role for personalization.
 */
export function VisitorRoleAction() {
  const { selectedRole, applyRole, clearRole, isApplying } = useVisitorRole();
  const [pendingRole, setPendingRole] = useState<VisitorRole | null>(null);

  const handleApply = async () => {
    const roleToApply = pendingRole ?? selectedRole;
    if (!roleToApply) return;

    try {
      await applyRole(roleToApply);
      setPendingRole(null);
    } catch {
      // Error already logged in hook
    }
  };

  const displayRole = pendingRole ?? selectedRole ?? undefined;

  return (
    <div className="flex flex-col gap-2">
      <Select
        value={displayRole}
        onValueChange={(val) => setPendingRole(val as VisitorRole)}
      >
        <SelectTrigger className="w-full h-9 text-sm">
          <SelectValue placeholder="Select role..." />
        </SelectTrigger>
        <SelectContent>
          {VISITOR_ROLES.map((role) => (
            <SelectItem key={role.value} value={role.value}>
              {role.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleApply}
          disabled={isApplying || (!pendingRole && !selectedRole)}
          className="flex-1 h-8"
        >
          {isApplying ? "Applying..." : "Apply role"}
        </Button>
        {selectedRole && (
          <Button
            size="sm"
            variant="outline"
            onClick={clearRole}
            disabled={isApplying}
            className="h-8"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
