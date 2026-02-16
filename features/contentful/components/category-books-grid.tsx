"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { BookCard } from "@/components/book-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BookListItem } from "@/lib/open-library.types";

const ITEMS_PER_PAGE = 20;

type SearchResponse = {
  items: BookListItem[];
  total: number;
};

function quoteIfNeeded(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /\s/.test(trimmed) ? `"${trimmed.replaceAll('"', '\\"')}"` : trimmed;
}

function buildOpenLibraryQueryFromShelfApp(shelfApp: unknown): string {
  if (!shelfApp || typeof shelfApp !== "object") return "";
  
  const app = shelfApp as Record<string, unknown>;
  const parts: string[] = [];
  const base = typeof app.query === "string" ? app.query.trim() : "";
  if (base) parts.push(base);

  const adv = app.advanced as Record<string, unknown> | undefined;
  if (adv) {
    const title = typeof adv.title === "string" ? adv.title.trim() : "";
    if (title) parts.push(`title:${quoteIfNeeded(title)}`);

    const author = typeof adv.author === "string" ? adv.author.trim() : "";
    if (author) parts.push(`author:${quoteIfNeeded(author)}`);

    const subject = typeof adv.subject === "string" ? adv.subject.trim() : "";
    if (subject) parts.push(`subject:${quoteIfNeeded(subject)}`);

    const language = typeof adv.language === "string" ? adv.language.trim() : "";
    if (language) parts.push(`language:${language}`);

    const year = adv.firstPublishYear;
    if (typeof year === "number" && Number.isFinite(year)) {
      parts.push(`first_publish_year:${Math.trunc(year)}`);
    }

    const ebookAccess = typeof adv.ebookAccess === "string" ? adv.ebookAccess.trim() : "";
    if (ebookAccess) parts.push(`ebook_access:${ebookAccess}`);
  }

  return parts.join(" ").trim();
}

function BookCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="aspect-[2/3] w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

type Props = {
  shelfApp: unknown;
  title?: string;
};

export default function CategoryBooksGrid({ shelfApp, title }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [items, setItems] = useState<BookListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const query = buildOpenLibraryQueryFromShelfApp(shelfApp);
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const updateUrl = useCallback((newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage > 1) {
      params.set("page", String(newPage));
    } else {
      params.delete("page");
    }
    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    router.push(newUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  const fetchBooks = useCallback(async (q: string, pageNum: number) => {
    if (!q.trim()) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const offset = (pageNum - 1) * ITEMS_PER_PAGE;
    
    try {
      const res = await fetch(
        `/api/catalog/search?q=${encodeURIComponent(q)}&limit=${ITEMS_PER_PAGE}&offset=${offset}`
      );
      if (res.ok) {
        const data = (await res.json()) as SearchResponse;
        setItems(data.items || []);
        setTotal(data.total || 0);
      } else {
        setItems([]);
        setTotal(0);
      }
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync page from URL
  useEffect(() => {
    const urlPage = Number(searchParams.get("page")) || 1;
    setPage(urlPage);
  }, [searchParams]);

  // Fetch books when query or page changes
  useEffect(() => {
    if (query) {
      fetchBooks(query, page);
    }
  }, [query, page, fetchBooks]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      updateUrl(newPage);
      // Scroll to the grid section
      document.getElementById("category-books-grid")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (!query) return null;

  return (
    <section id="category-books-grid" className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          {title && (
            <h2 className="text-2xl md:text-3xl font-semibold mb-2">{title}</h2>
          )}
          {!loading && total > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(page * ITEMS_PER_PAGE, total)} of {total.toLocaleString()} books
            </p>
          )}
        </div>

        {/* Book Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {loading ? (
            Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <BookCardSkeleton key={i} />
            ))
          ) : items.length > 0 ? (
            items.map((book, idx) => (
              <BookCard
                key={`${book.isbn13 || book.olid || idx}`}
                title={book.title}
                author={book.authors?.map(a => a.name).join(", ") || "Unknown"}
                price={book.price?.amount || 0}
                originalPrice={book.originalPrice}
                image={book.coverUrl || "/placeholder.svg"}
                badge={book.badge}
                href={book.href}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No books found in this category.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              {/* First page */}
              {page > 3 && (
                <>
                  <Button
                    variant={page === 1 ? "default" : "ghost"}
                    size="sm"
                    className="rounded-full w-10 h-10"
                    onClick={() => handlePageChange(1)}
                  >
                    1
                  </Button>
                  {page > 4 && <span className="px-2 text-muted-foreground">...</span>}
                </>
              )}
              
              {/* Page numbers around current */}
              {Array.from({ length: 5 }, (_, i) => page - 2 + i)
                .filter(p => p >= 1 && p <= totalPages)
                .map(p => (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "ghost"}
                    size="sm"
                    className="rounded-full w-10 h-10"
                    onClick={() => handlePageChange(p)}
                  >
                    {p}
                  </Button>
                ))}
              
              {/* Last page */}
              {page < totalPages - 2 && (
                <>
                  {page < totalPages - 3 && <span className="px-2 text-muted-foreground">...</span>}
                  <Button
                    variant={page === totalPages ? "default" : "ghost"}
                    size="sm"
                    className="rounded-full w-10 h-10"
                    onClick={() => handlePageChange(totalPages)}
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
