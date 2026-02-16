export type CatalogIdType = "ISBN13" | "OLID" | "WORK";

export type BookHref = {
  href: string;
};

export type BookCover = {
  small?: string;
  medium?: string;
  large?: string;
};

export type BookPrice = {
  amount: number;
  currency: "USD";
  formatted: string;
};

export type BookAuthor = {
  name: string;
};

export type BookDetail = {
  id: string;
  idType: CatalogIdType;
  title: string;
  subtitle?: string;
  authors: BookAuthor[];
  description?: string;
  subjects?: string[];
  isbn13?: string;
  olid?: string;
  workId?: string;
  cover?: BookCover;
  price: BookPrice;
  href: string;
};

export type BookListItem = {
  title: string;
  authors: BookAuthor[];
  isbn13?: string;
  olid?: string;
  workId?: string;
  coverUrl?: string;
  price: BookPrice;
  originalPrice?: number;
  badge?: string;
  href: string;
};

export type CatalogErrorPayload = {
  error: string;
  details?: unknown;
};

export type CatalogDebug = {
  queryUsed?: string;
  upstreamUrls?: string[];
  counts?: Record<string, number>;
};

export type BookDetailResponse = {
  book: BookDetail;
  debug?: CatalogDebug;
};

export type SearchResponse = {
  items: BookListItem[];
  debug?: CatalogDebug;
};
