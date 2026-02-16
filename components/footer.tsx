import { Facebook, Instagram, Twitter, Youtube, CreditCard, Truck, ShieldCheck, Headphones } from "lucide-react"

const footerLinks = {
  shop: {
    title: "Shop",
    links: [
      { name: "Books", href: "#" },
      { name: "E-books", href: "#" },
      { name: "Audiobooks", href: "#" },
      { name: "Stationery", href: "#" },
      { name: "Gift Ideas", href: "#" },
    ],
  },
  services: {
    title: "Services",
    links: [
      { name: "Teacher Discount", href: "#" },
      { name: "Student Deals", href: "#" },
      { name: "Gift Cards", href: "#" },
      { name: "School Orders", href: "#" },
      { name: "Bulk Orders", href: "#" },
    ],
  },
  help: {
    title: "Help",
    links: [
      { name: "FAQ", href: "#" },
      { name: "Shipping", href: "#" },
      { name: "Returns & Refunds", href: "#" },
      { name: "Contact Us", href: "#" },
      { name: "Track Order", href: "#" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { name: "About Us", href: "#" },
      { name: "Careers", href: "#" },
      { name: "Privacy Policy", href: "#" },
      { name: "Terms & Conditions", href: "#" },
      { name: "Cookie Policy", href: "#" },
    ],
  },
}

const features = [
  { icon: Truck, title: "Free Shipping", desc: "Over $25" },
  { icon: ShieldCheck, title: "Secure Payments", desc: "100% protected" },
  { icon: Headphones, title: "Support", desc: "Always available" },
  { icon: CreditCard, title: "Easy Returns", desc: "Within 30 days" },
]

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      {/* Features bar */}
      <div className="border-b border-background/10">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{feature.title}</p>
                  <p className="text-xs text-background/60">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Logo & socials - Translated to English */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              
              <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center">
                <span className="text-foreground font-bold">TXT</span>
              </div>
              <div>
                <p className="font-semibold">University</p>
                <p className="text-xs text-background/60 -mt-1">Bookstore</p>
              </div>
            </div>
            <p className="text-sm text-background/60 mb-4">
              Your online bookstore since 1997. Over 15 million books available.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
              >
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h4 className="font-medium mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <a href={link.href} className="text-sm text-background/60 hover:text-background transition-colors">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar - Translated copyright */}
        <div className="mt-12 pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-background/60">© 2025 University Bookstore. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <img src="/placeholder.svg?height=24&width=40" alt="Visa" className="h-6 opacity-60" />
            <img src="/placeholder.svg?height=24&width=40" alt="Mastercard" className="h-6 opacity-60" />
            <img src="/placeholder.svg?height=24&width=40" alt="PayPal" className="h-6 opacity-60" />
            <img src="/placeholder.svg?height=24&width=40" alt="Apple Pay" className="h-6 opacity-60" />
          </div>
        </div>
      </div>
    </footer>
  )
}
