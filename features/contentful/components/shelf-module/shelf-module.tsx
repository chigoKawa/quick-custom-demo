"use client";

import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookCard } from "@/components/book-card";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";

export type ShelfBookCard = {
  title: string;
  author: string;
  price: number;
  originalPrice?: number;
  image: string;
  badge?: string;
  href?: string;
};

type Props = {
  title: string;
  subtitle?: string;
  books: ShelfBookCard[];
  viewAllLabel?: string;
  onViewAll?: () => void;
  entryId?: string;
};

export default function ShelfModule({ title, subtitle, books, viewAllLabel, onViewAll, entryId }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inspectorProps = useContentfulInspectorMode({ entryId: entryId || "" });

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 {...inspectorProps({ fieldId: "title" })} className="text-2xl md:text-3xl font-semibold mb-2">{title}</h2>
            {subtitle ? <p {...inspectorProps({ fieldId: "subtitle" })} className="text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-transparent"
              onClick={() => scroll("left")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-transparent"
              onClick={() => scroll("right")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {books.map((book, idx) => (
            <div key={idx} className="flex-shrink-0 w-[160px] md:w-[200px] snap-start">
              <BookCard {...book} />
            </div>
          ))}
        </div>

        {viewAllLabel ? (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              className="rounded-full bg-transparent"
              onClick={onViewAll}
            >
              {viewAllLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
