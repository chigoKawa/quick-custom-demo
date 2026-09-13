import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Web Preview | Contentful",
  description: "Preview Contentful content in a desktop browser frame",
  robots: { index: false, follow: false },
};

export default function WebPreviewLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
