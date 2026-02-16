"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const slides = [
  {
    title: "Discover the Booker Prize 2025",
    subtitle: "The finalists and the winner",
    description: "Explore the books that captivated the jury of the most prestigious literary award.",
    image: "/literary-award-winning-books-elegant-display.jpg",
    cta: "Learn More",
  },
  {
    title: "College Textbooks",
    subtitle: "Everything for your courses",
    description: "Find textbooks for any major with discounts up to 15%.",
    image: "/university-textbooks-stack-elegant-warm-lighting.jpg",
    cta: "Browse Catalog",
  },
  {
    title: "New This Month",
    subtitle: "Latest releases",
    description: "The most anticipated novels and must-read non-fiction. Discover new releases.",
    image: "/new-book-releases-bookstore-warm-lighting.jpg",
    cta: "Explore",
  },
]

export function HeroSection() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  const slide = slides[current]

  return (
    <section className="relative overflow-hidden">
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Content */}
          <div className="order-2 lg:order-1">
            <p className="text-accent font-medium mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {slide.subtitle}
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-4 text-balance animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
              {slide.title}
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-md leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
              {slide.description}
            </p>
            <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-300">
              <Button size="lg" className="rounded-full px-8">
                {slide.cta}
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8 bg-transparent">
                View All
              </Button>
            </div>
          </div>

          {/* Image */}
          <div className="order-1 lg:order-2 relative animate-in fade-in zoom-in-95 duration-700">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-secondary">
              <img src={slide.image || "/placeholder.svg"} alt={slide.title} className="w-full h-full object-cover" />
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-accent/20 rounded-full blur-2xl" />
          </div>
        </div>

        {/* Navigation dots & arrows */}
        <div className="flex items-center justify-between mt-8 lg:mt-12">
          <div className="flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === current ? "w-8 bg-primary" : "w-2 bg-border hover:bg-muted-foreground"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-transparent"
              onClick={() => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-transparent"
              onClick={() => setCurrent((prev) => (prev + 1) % slides.length)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
