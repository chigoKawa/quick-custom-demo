import type { Metadata } from "next";

import DesignSystemShowcase from "./design-system-showcase";

// AppProviders (mounted by this route's layout) calls useSearchParams(), which
// cannot be statically prerendered. Every other route that mounts AppProviders
// opts out of static generation the same way.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Design system",
  description:
    "Every component this site renders, shown with placeholder content and labelled with its Contentful content type and source path.",
  // This is an internal reference page, not something that belongs in an index.
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  return <DesignSystemShowcase />;
}
