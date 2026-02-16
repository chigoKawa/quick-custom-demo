"use client"

import { useState } from "react"
import { BookCard } from "@/components/book-card"
import { Button } from "@/components/ui/button"

const tabs = ["All", "Fiction", "Mystery", "Non-Fiction", "Young Adult"]

const bestsellers = [
  {
    title: "The Silent Patient",
    author: "Alex Michaelides",
    price: 19.95,
    originalPrice: 21.0,
    image: "/psychological-thriller-book-cover-dark.jpg",
  },
  {
    title: "Lessons in Chemistry",
    author: "Bonnie Garmus",
    price: 18.05,
    originalPrice: 19.0,
    image: "/vintage-style-fiction-book-cover.jpg",
  },
  {
    title: "Tomorrow, and Tomorrow",
    author: "Gabrielle Zevin",
    price: 18.05,
    originalPrice: 19.0,
    image: "/literary-fiction-colorful-book-cover.jpg",
  },
  {
    title: "The House in the Pines",
    author: "Ana Reyes",
    price: 20.9,
    originalPrice: 22.0,
    image: "/mystery-thriller-forest-book-cover.jpg",
    badge: "Top 10",
  },
  {
    title: "Fourth Wing",
    author: "Rebecca Yarros",
    price: 15.2,
    originalPrice: 16.0,
    image: "/fantasy-dragon-book-cover.jpg",
  },
  {
    title: "Happy Place",
    author: "Emily Henry",
    price: 18.05,
    originalPrice: 19.0,
    image: "/romance-beach-book-cover.jpg",
  },
  {
    title: "The Covenant of Water",
    author: "Abraham Verghese",
    price: 16.15,
    originalPrice: 17.0,
    image: "/literary-epic-book-cover-water.jpg",
  },
  {
    title: "Outlive",
    author: "Peter Attia",
    price: 19.0,
    originalPrice: 20.0,
    image: "/placeholder.svg?height=400&width=260",
  },
]

export function BestsellerSection() {
  const [activeTab, setActiveTab] = useState("All")

  return (
    <section className="py-12 md:py-16 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold mb-2">Bestsellers</h2>
          <p className="text-muted-foreground">The books readers are loving right now</p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "default" : "ghost"}
              className="rounded-full"
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </Button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-6">
          {bestsellers.map((book, idx) => (
            <BookCard key={idx} {...book} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button variant="outline" className="rounded-full bg-transparent">
            View Full Bestseller List
          </Button>
        </div>
      </div>
    </section>
  )
}
