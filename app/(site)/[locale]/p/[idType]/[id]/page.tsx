/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";

import { getI18nConfig } from "@/i18n-config";
import type { CatalogIdType } from "@/lib/open-library.types";
import { resolveBookDetail } from "@/lib/open-library";
import AddToCartButton from "@/components/add-to-cart-button";
import {
  applyBookReferenceOverrideToDetail,
  getBookReferenceOverrides,
} from "@/lib/book-references";

function parseIdType(value: string): CatalogIdType | null {
  if (value === "olid") return "OLID";
  if (value === "isbn13") return "ISBN13";
  if (value === "work") return "WORK";
  return null;
}

export default async function ProductPage(
  props: {
    params: Promise<{ locale: string; idType: string; id: string }>;
  }
) {
  const { locale, idType: idTypeRaw, id } = await props.params;
  const { locales, defaultLocale } = await getI18nConfig();
  const effectiveLocale = locales.includes(locale as any) ? locale : defaultLocale;

  const idType = parseIdType(idTypeRaw);
  if (!idType) notFound();

  const result = await resolveBookDetail({
    id,
    idType,
    revalidateSeconds: 300,
    debug: false,
  });

  if (!result.ok) notFound();

  const overrides = await getBookReferenceOverrides({
    locale: effectiveLocale,
    preview: false,
  });
  const override = applyBookReferenceOverrideToDetail(result.book, overrides);

  const book = {
    ...result.book,
    title: override.title,
    description: override.description,
    cover: override.cover,
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="grid md:grid-cols-[240px_1fr] gap-8">
        <div>
          <div className="aspect-[2/3] rounded-lg overflow-hidden bg-secondary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={book.cover?.large || book.cover?.medium || book.cover?.small || "/placeholder.svg"}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div>
          <h1 className="text-3xl md:text-4xl font-semibold mb-2">{book.title}</h1>
          <div className="text-muted-foreground mb-6">
            {Array.isArray(book.authors) && book.authors.length > 0
              ? book.authors.map((a) => a.name).filter(Boolean).join(", ")
              : ""}
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="text-lg font-semibold text-primary">{book.price.formatted}</div>
            <AddToCartButton book={book} />
          </div>

          {book.description ? (
            <div className="prose prose-neutral max-w-none">
              <p>{book.description}</p>
            </div>
          ) : null}

          <div className="mt-8 text-sm text-muted-foreground">
            <div>OLID: {book.olid || "—"}</div>
            <div>ISBN13: {book.isbn13 || "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
