"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { BookCard } from "@/components/book-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { BookListItem } from "@/lib/open-library.types";

const ITEMS_PER_PAGE = 20;

type SearchResponse = {
  items: BookListItem[];
  total: number;
};

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

export default function CatalogPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [items, setItems] = useState<BookListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const updateUrl = useCallback((newQuery: string, newPage: number) => {
    const params = new URLSearchParams();
    if (newQuery) params.set("q", newQuery);
    if (newPage > 1) params.set("page", String(newPage));
    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    router.push(newUrl, { scroll: false });
  }, [pathname, router]);

  const fetchBooks = useCallback(async (q: string, pageNum: number) => {
    if (!q.trim()) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      setInitialLoad(false);
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
      setInitialLoad(false);
    }
  }, []);

  // Sync state from URL on mount and URL changes
  useEffect(() => {
    const urlQuery = searchParams.get("q") || "";
    const urlPage = Number(searchParams.get("page")) || 1;
    
    setQuery(urlQuery);
    setSearchInput(urlQuery);
    setPage(urlPage);
    
    if (urlQuery) {
      fetchBooks(urlQuery, urlPage);
    } else {
      // Default search to show some books
      fetchBooks("programming", 1);
    }
  }, [searchParams, fetchBooks]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setPage(1);
      setQuery(searchInput.trim());
      updateUrl(searchInput.trim(), 1);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      updateUrl(query, newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold mb-4">Browse Catalog</h1>
        <p className="text-muted-foreground mb-6">
          Explore our extensive collection of books
        </p>
        
        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by title, author, subject..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 rounded-full"
            />
          </div>
          <Button type="submit" className="rounded-full px-6">
            Search
          </Button>
        </form>
      </div>

      {/* Results Info */}
      {!initialLoad && query && (
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {loading ? (
              "Searching..."
            ) : total > 0 ? (
              <>
                Showing {((page - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(page * ITEMS_PER_PAGE, total)} of {total.toLocaleString()} results for &quot;{query}&quot;
              </>
            ) : (
              <>No results found for &quot;{query}&quot;</>
            )}
          </p>
          {totalPages > 1 && (
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages.toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Book Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
        {loading || initialLoad ? (
          // Skeleton loading state
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
        ) : query ? (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No books found. Try a different search term.</p>
          </div>
        ) : null}
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
  );
}
