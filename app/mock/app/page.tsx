import { getEntriesInEnvironment } from "@/lib/contentful";
import AppShell from "./_components/app-shell";
import AppLivePreviewWrapper from "./_components/app-live-preview-wrapper";
import type { EntrySkeletonType } from "contentful";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function str(val: string | string[] | undefined): string | undefined {
  if (Array.isArray(val)) return val[0];
  return val;
}

interface KbCategorySkeleton extends EntrySkeletonType {
  contentTypeId: "kbCategory";
  fields: { name: string; slug: string; description?: string };
}

interface MicrocopySkeleton extends EntrySkeletonType {
  contentTypeId: "microcopy";
  fields: { key: string; value: string };
}

export default async function MockAppPage({ searchParams }: Props) {
  const sp = await searchParams;
  const isPreview = str(sp.preview) === "true";

  const [categoriesRaw, microcopyRaw] = await Promise.all([
    getEntriesInEnvironment<KbCategorySkeleton>({
      options: {
        content_type: "kbCategory",
        locale: "en-US",
        order: ["fields.name"],
        limit: 20,
      },
      isPreviewEnabled: isPreview,
      environment: "rebel",
    }),
    getEntriesInEnvironment<MicrocopySkeleton>({
      options: {
        content_type: "microcopy",
        locale: "en-US",
        limit: 200,
      },
      isPreviewEnabled: isPreview,
      environment: "rebel",
    }),
  ]);

  const kbCategories = categoriesRaw.map((e) => ({
    sys: { id: e.sys.id },
    fields: {
      name: (e.fields as any).name as string | undefined,
      slug: (e.fields as any).slug as string | undefined,
      description: (e.fields as any).description as string | undefined,
    },
  }));

  // microcopy: key → { value, entryId } so inspector tags can point to the right entry
  const microcopy: Record<string, { value: string; entryId: string }> = {};
  for (const entry of microcopyRaw) {
    const key = (entry.fields as any).key as string | undefined;
    const value = (entry.fields as any).value as string | undefined;
    if (key?.startsWith("app.") && value) {
      microcopy[key] = { value, entryId: entry.sys.id };
    }
  }

  return (
    <AppLivePreviewWrapper isPreview={isPreview}>
      <AppShell
        microcopy={microcopy}
        kbCategories={kbCategories}
        isPreview={isPreview}
      />
    </AppLivePreviewWrapper>
  );
}
