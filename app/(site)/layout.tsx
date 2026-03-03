import Footer from "@/features/layout/footer";
import AppProviders from "@/features/app-providers";
import { Header } from "@/components/header";
import { DemoPanel } from "@/features/demo-panel";
import { getSiteSettings } from "@/lib/site-settings";
import { draftMode } from "next/headers";

// Revalidate site settings frequently to pick up changes
export const revalidate = 60; // Revalidate every 60 seconds

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check if we're in preview/draft mode
  const { isEnabled: isPreviewEnabled } = await draftMode();

  // Fetch site settings server-side with preview mode support
  let siteSettings = null;
  try {
    siteSettings = await getSiteSettings(undefined, isPreviewEnabled);
  } catch (error) {
    console.error("Failed to fetch site settings:", error);
  }

  return (
    <AppProviders>
      <DemoPanel />
      {/* <NavBar /> */}
      <Header siteSettings={siteSettings} />

      {children}
      <Footer siteSettings={siteSettings} />
    </AppProviders>
  );
}
