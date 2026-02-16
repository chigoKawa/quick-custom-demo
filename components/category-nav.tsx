import { BookOpen, GraduationCap, Headphones, Pen, Gift, Percent } from "lucide-react"

const categories = [
  { name: "Fiction", icon: BookOpen, color: "bg-primary/10 text-primary" },
  { name: "Textbooks", icon: GraduationCap, color: "bg-accent/20 text-accent-foreground" },
  { name: "Audiobooks", icon: Headphones, color: "bg-chart-1/10 text-chart-1" },
  { name: "Stationery", icon: Pen, color: "bg-chart-2/20 text-chart-2" },
  { name: "Gift Ideas", icon: Gift, color: "bg-chart-4/20 text-chart-4" },
  { name: "50% Off", icon: Percent, color: "bg-destructive/10 text-destructive" },
]

export function CategoryNav() {
  return (
    <section className="py-8 border-y border-border/50 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <a
              key={cat.name}
              href="#"
              className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-card transition-colors group"
            >
              <div
                className={`w-12 h-12 rounded-full ${cat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}
              >
                <cat.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-center">{cat.name}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
