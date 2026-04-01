"use client";

import React from "react";
import { useParams } from "next/navigation";
import type { IPropertyListings } from "../../type";
import PropertyListingsSection from "./property-listings-section";

export default function PropertyListingsWrapper(entry: IPropertyListings) {
  const params = useParams();
  const locale = (params?.locale as string) ?? "en-US";

  if (!entry?.sys?.id || !entry?.fields) return null;

  return <PropertyListingsSection entry={entry} locale={locale} />;
}
