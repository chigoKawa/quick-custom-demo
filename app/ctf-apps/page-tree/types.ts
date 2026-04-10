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

export interface ContentTypeConfig {
  contentTypeId: string;
  parentFieldName: string;
  fullPathFieldName: string;
  slugFieldName: string;
}

export interface PageTreeInstallationParameters {
  /** @deprecated Use contentTypes[] instead. Kept for backward compatibility. */
  contentTypeId?: string;
  /** @deprecated Use contentTypes[] instead. */
  parentFieldName?: string;
  /** @deprecated Use contentTypes[] instead. */
  fullPathFieldName?: string;
  /** @deprecated Use contentTypes[] instead. */
  slugFieldName?: string;

  contentTypes?: ContentTypeConfig[];

  locale?: string;
  siteBaseUrl?: string;
  homeSlug?: string;
}
