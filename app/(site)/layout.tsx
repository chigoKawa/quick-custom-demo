import AppProviders from "@/features/app-providers";
import { DemoPanel } from "@/features/demo-panel";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppProviders>
      <DemoPanel />
      {children}
    </AppProviders>
  );
}
