import Link from "next/link"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface BookCardProps {
  title: string
  author: string
  price: number
  originalPrice?: number
  image: string
  badge?: string
  href?: string
}

export function BookCard({ title, author, price, originalPrice, image, badge, href }: BookCardProps) {
  const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0

  const content = (
    <>
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary mb-3">
        <img
          src={image || "/placeholder.svg"}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {badge && <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground">{badge}</Badge>}
        {discount > 0 && (
          <Badge variant="destructive" className="absolute top-2 right-2">
            -{discount}%
          </Badge>
        )}
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-8 w-8"
          type="button"
        >
          <Heart className="h-4 w-4" />
        </Button>
      </div>
      <div>
        <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-xs text-muted-foreground mb-2">{author}</p>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-primary">€ {price.toFixed(2)}</span>
          {originalPrice && (
            <span className="text-xs text-muted-foreground line-through">€ {originalPrice.toFixed(2)}</span>
          )}
        </div>
      </div>
    </>
  )

  return (
    <div className="group">
      {href ? (
        <Link href={href} className="block">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  )
}
