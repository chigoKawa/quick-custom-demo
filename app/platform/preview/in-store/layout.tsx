import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "In-store Preview | Contentful",
  description: "Preview Contentful content on an in-store retail display",
  robots: { index: false, follow: false },
};

export default function InStorePreviewLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
