import Footer from "@/features/layout/footer";
import AppProviders from "@/features/app-providers";
import { Header } from "@/components/header";
import { DemoPanel } from "@/features/demo-panel";
import { getSiteSettings } from "@/lib/site-settings";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch site settings server-side
  let siteSettings = null;
  try {
    siteSettings = await getSiteSettings();
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
