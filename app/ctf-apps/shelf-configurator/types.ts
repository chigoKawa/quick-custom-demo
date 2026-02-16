import type { CatalogIdType } from "@/lib/open-library.types";

export type ShelfConfigV1 = {
  version: 1;

  // Human friendly for editors
  internalName?: string;
  mode: "search";
  query: string;
  limit?: number;
  pinned?: Array<{ idType: CatalogIdType; id: string }>;
  presentation?: {
    variant?: "carousel" | "grid";
    showPrice?: boolean;
    showBadge?: boolean;
  };
  advanced?: {
    title?: string;
    author?: string;
    subject?: string;
    publisher?: string;
    language?: string;
    firstPublishYear?: number;
    firstPublishYearRange?: { from?: number; to?: number };
    ebookAccess?: "no_ebook" | "printdisabled" | "borrowable" | "public";
    sort?: "new" | "old" | "rating" | "editions" | "random" | "";
    hasFulltext?: boolean;
  };
  // Preview/debug flags (not required by frontend, but useful)
  debug?: boolean;
};

export type AppInstallationParameters = {
  catalogSearchUrlTemplate: string;
  bookDetailUrlTemplate: string;

  // Optional
  defaultLimit?: number;
  requestTimeoutMs?: number;
};
