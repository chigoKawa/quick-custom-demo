export type KbDoc = {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  body?: string;
  categories?: string[];
  groups?: string[];
  updatedAt?: string | null;
  locale: string;
  // denormalized fields for quick contains checks
  categoriesJoined?: string;
  groupsJoined?: string;
};

export type KbIndexFile = {
  version: number;
  locale: string;
  docs: KbDoc[];
};
