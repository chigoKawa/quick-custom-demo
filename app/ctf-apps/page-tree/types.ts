export interface PageTreeEntry {
  id: string;
  title: string;
  slug: string;
  fullPath: string | null;
  parentId: string | null;
  contentTypeId: string;
  status: "published" | "draft" | "changed";
  updatedAt: string;
  publishedAt: string | null;
}

export interface PageTreeNode extends PageTreeEntry {
  children: PageTreeNode[];
  depth: number;
  computedPath: string;
}

export interface PageTreeInstallationParameters {
  contentTypeId?: string;
  parentFieldName?: string;
  fullPathFieldName?: string;
  slugFieldName?: string;
  locale?: string;
  siteBaseUrl?: string;
  homeSlug?: string;
}
