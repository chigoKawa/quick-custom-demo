import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PromoBanner() {
  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-4">
          {/* University books promo - Translated to English */}
          <div className="relative rounded-2xl overflow-hidden bg-primary p-6 md:p-8 text-primary-foreground">
            <div className="relative z-10">
              <p className="text-sm font-medium opacity-80 mb-2">For Students</p>
              <h3 className="text-2xl md:text-3xl font-semibold mb-3">College Textbooks</h3>
              <p className="opacity-80 mb-6 max-w-xs">
                15% off all academic textbooks. Find the books for your courses.
              </p>
              <Button variant="secondary" className="rounded-full group">
                Browse Catalog
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            <div className="absolute right-0 bottom-0 w-1/2 h-full opacity-10">
              <img
                src="/placeholder.svg?height=300&width=200"
                alt=""
                className="w-full h-full object-contain object-right-bottom"
              />
            </div>
          </div>

          {/* Sale promo - Translated to English */}
          <div className="relative rounded-2xl overflow-hidden bg-accent/20 p-6 md:p-8">
            <div className="relative z-10">
              <p className="text-sm font-medium text-accent mb-2">Limited Time</p>
              <h3 className="text-2xl md:text-3xl font-semibold mb-3">Up to 50% Off</h3>
              <p className="text-muted-foreground mb-6 max-w-xs">
                Thousands of titles at unbeatable prices. Take advantage of our deals.
              </p>
              <Button className="rounded-full group">
                Shop Deals
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            <div className="absolute right-0 bottom-0 w-1/2 h-full opacity-20">
              <img
                src="/placeholder.svg?height=300&width=200"
                alt=""
                className="w-full h-full object-contain object-right-bottom"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
