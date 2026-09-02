"use client";

import React from "react";
import ModuleRenderer from "./module-renderer";
import { useLiveLinkedIds } from "./entries-context";

// Renders an appScreen's modules by subscribing live to the screen entry's
// `modules` array. Reorders, additions, and removals propagate instantly.
// Each module then subscribes to its own entry (in ModuleRenderer) so any
// field edit anywhere in the tree is live too.
export default function LiveScreenContent({ screenId }: { screenId: string }) {
  const moduleIds = useLiveLinkedIds(screenId, "modules");

  if (moduleIds.length === 0) {
    return (
      <div className="flex flex-col">
        <div className="p-6 text-center text-sm text-neutral-500">
          This screen has no modules yet.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {moduleIds.map((id) => (
        <ModuleRenderer key={id} moduleId={id} />
      ))}
    </div>
  );
}
