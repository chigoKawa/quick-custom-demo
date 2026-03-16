import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mobile Preview | Contentful",
  description: "Preview Contentful content in a mobile device frame",
  robots: { index: false, follow: false },
};

export default function MobilePreviewLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
