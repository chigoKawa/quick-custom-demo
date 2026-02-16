"use client"

import { useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookCard } from "@/components/book-card"

const newReleases = [
  {
    title: "The Midnight Library",
    author: "Matt Haig",
    price: 19.0,
    originalPrice: 20.0,
    image: "/literary-fiction-book-cover-dark-blue.jpg",
    badge: "New",
  },
  {
    title: "Project Hail Mary",
    author: "Andy Weir",
    price: 20.9,
    originalPrice: 22.0,
    image: "/sci-fi-space-book-cover.jpg",
  },
  {
    title: "The Seven Husbands",
    author: "Taylor Jenkins Reid",
    price: 16.05,
    originalPrice: 16.9,
    image: "/romance-novel-book-cover-glamorous.jpg",
    badge: "Bestseller",
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    price: 20.9,
    originalPrice: 22.0,
    image: "/self-help-book-cover-minimalist.jpg",
  },
  {
    title: "Where the Crawdads Sing",
    author: "Delia Owens",
    price: 19.0,
    originalPrice: 20.0,
    image: "/literary-fiction-nature-book-cover.jpg",
  },
  {
    title: "The Psychology of Money",
    author: "Morgan Housel",
    price: 18.52,
    originalPrice: 19.5,
    image: "/finance-book-cover-modern.jpg",
  },
]

export function FeaturedBooks() {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold mb-2">New Arrivals</h2>
            <p className="text-muted-foreground">The latest releases you can not miss</p>
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
          {newReleases.map((book, idx) => (
            <div key={idx} className="flex-shrink-0 w-[160px] md:w-[200px] snap-start">
              <BookCard {...book} />
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Button variant="outline" className="rounded-full bg-transparent">
            View All New Releases
          </Button>
        </div>
      </div>
    </section>
  )
}
