import AppProviders from "@/features/app-providers";

// The mock app lives outside the (site)/[locale] route group, which is where
// AppProviders normally mounts NinetailedProvider. Without that wrapper,
// useFlag() returns the supplied default forever and Ninetailed Custom Flag
// experiences never resolve.
//
// This thin layout adds the same provider stack for the mock app — Ninetailed
// SDK + Preview plugin + Insights + LivePreviewProviderWrapper — so flag
// resolution works the same way as the rest of the site.
export default function MockAppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // skipLivePreviewWrapper: the mock pages mount their own
  // AppLivePreviewWrapper that's locale + environment aware. We only need
  // Ninetailed here so useFlag() resolves.
  return <AppProviders skipLivePreviewWrapper>{children}</AppProviders>;
}
