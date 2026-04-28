"use client";

import React from "react";
import Link from "next/link";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import type { IBaseButton } from "@/features/contentful/type";
import { extractUrlFromTarget, cn } from "@/lib/utils";
import { useSiteChromeLocale } from "@/features/site-chrome-locale";

type Props = {
  button: IBaseButton;
  fullWidth?: boolean;
};

const variantStyles: Record<string, string> = {
  Primary: "bg-primary text-primary-foreground",
  Secondary: "bg-secondary text-secondary-foreground",
  Outline: "bg-transparent border border-border text-foreground",
  Ghost: "bg-transparent text-foreground",
  Destructive: "bg-destructive text-destructive-foreground",
};

export default function MobileButton({ button, fullWidth = false }: Props) {
  const inspectorProps = useContentfulInspectorMode({ entryId: button?.sys?.id ?? "" });
  const { locale, defaultLocale } = useSiteChromeLocale();

  if (!button?.sys?.id || !button?.fields?.label) return null;

  const label = button.fields.label;
  const href = extractUrlFromTarget(button.fields.target, { locale, defaultLocale }) || "#";
  const variant = button.fields.variant || "Primary";

  return (
    <Link
      href={href}
      {...inspectorProps({ fieldId: "label" })}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium transition-colors",
        variantStyles[variant] || variantStyles.Primary,
        fullWidth && "w-full"
      )}
    >
      {label}
    </Link>
  );
}
