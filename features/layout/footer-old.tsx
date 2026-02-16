import LocaleSwitcher from "../locale-switching/locale-switcher";
import React from "react";
import { getLocales } from "@/lib/contentful";
import { getI18nConfig } from "@/i18n-config";
import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  CreditCard,
  Truck,
  ShieldCheck,
  Headphones,
} from "lucide-react";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Footer = async () => {
  const thisyear = new Date().getFullYear();

  let localesData: Array<{ code: string; name?: string; default?: boolean }> =
    [];
  try {
    localesData = await getLocales();
  } catch {
    localesData = [];
  }
  if (!Array.isArray(localesData) || localesData.length === 0) {
    const cfg = await getI18nConfig();
    localesData = cfg.locales.map((code) => ({
      code,
      default: code === cfg.defaultLocale,
    }));
  }

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
  };

  const features = [
    { icon: Truck, title: "Free Shipping", desc: "Over $25" },
    { icon: ShieldCheck, title: "Secure Payments", desc: "100% protected" },
    { icon: Headphones, title: "Support", desc: "Always available" },
    { icon: CreditCard, title: "Easy Returns", desc: "Within 30 days" },
  ];

  return (
    <footer className="bg-foreground text-background">
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

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img
                width={100}
                height={100}
                src="data:image/svg+xml;base64,PHN2ZyBpZD0ibG9nb19zdmdfX0xheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeD0iMCIgeT0iMCIgd2lkdGg9IjE5OCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDgyNi4xIDE1OCIgc3R5bGU9Ii0taWNvbi1zaXplOmF1dG8iIHhtbDpzcGFjZT0icHJlc2VydmUiIHRpdGxlPSJMb2dvIiBhcmlhLWxhYmVsPSJMb2dvIiBjbGFzcz0iU3RhbmRhcmRfbG9nb1N2Z19fTWpSNUwiPjxzdHlsZT4ubG9nb19zdmdfX3N0MXtmaWxsOiMzYzNjM2J9PC9zdHlsZT48cGF0aCBkPSJNMCAwdjE1OGgxNjUuNFYwSDB6bTE0OS45IDQ0LjFjLS44IDIuNy0xLjkgNS4zLTIuOSA4LjEtLjggMi4yLTIgNC4yLTMuMiA2LjMtMS4yIDItNC41IDYuMi00LjUgNi4ycy0zLjYgNC43LTUuNSA2LjljLTIuNyAzLjItNC41IDUuOS03IDguOC0xLjMgMS41LTQuNCA1LTQuNCA1LTEuNCAxLjMtMi45IDIuNS00LjYgMy40LS43LjQtMy41LTEuMy00LjgtMi43LS44LS44LjctMS45IDEuNC0yLjYgMS4zLTEuMiAzLjUtMyAzLjUtM3MyLjctMy43IDQtNS4zYy4xLTQuMi0xLjctOC41LTMtMTEuNy0uOC0yLTEuOC0zLjUtMy41LTQuOC0xLjYtMS4zLTQuOC0yLjgtNC44LTIuOHMtMy4xLS44LTUtMS4xYy0yLjctLjUtNi4yLjQtNy45LjYtNy4xLjgtNS41LjktOS4yIDEuNC4xIDIgLjMgNC41LjQgNy40LjEgMS41LS4yIDMuMy0uMSA0LjcuMSAxLjUuNCAzLjkuNCAzLjlzLjYgMy45IDEuNCA1LjdjMS4zIDMuMSA0LjcgNy4yIDguNCAxMC4yIDIuMSAxLjcgMy45IDMuNyA1LjQgNS4zIDMuNCAzLjcgOS40IDEyLjggOS40IDEyLjhzMy43IDkuMiA1LjMgMTMuN2MuNSAxLjMgMS43IDQuNyAxLjcgNC43czEuNiAzLjcgMiA1LjZjMSA0LjUgMSA5LTIuNCAxMC0xLjYuNS0yIC42LTQuMi4yLTEuMi0uMi0zLjYtNC45LTQtNi44LS40LTEuOS0yLTkuNC0yLTkuNHMtMi43LTcuNi0zLjctOS40Yy0xLjgtMy40LTQuMS02LjMtNi4zLTkuNS0xLjgtMi42LTYuMy03LjItNi4zLTcuMnMtNS4zLTMuNy04LTUuNWMtMi45LTItNS45LTIuNC05LTEuNS0xLjIuMy0yLjQuOC00IDEuMi0yIC41LTMuMiAyLjYtNC45IDQuMS0yLjQgMi4xLTYuNiA2LjgtNi42IDYuOHMtNSA3LTYuMSA5LjdjLTEuOCA0LjQtMy45IDguNy00LjggMTMuNS0xIDUtMi42IDEzLjgtOS41IDkuMi0xLjQtLjktMS4xLTQuMS0uOS02LjIuNS00IDIuMi04LjcgMi42LTExLjYuNi00LjYgNC42LTExLjYgNC42LTExLjZzMi40LTUuNCA0LjMtNy45YzEuOS0yLjYgNy03LjggNy03LjhzMy42LTIuOSA1LjQtNC43YzEuOS0xLjkgMi42LTguOCAyLjYtOC44cy41LTUuOC4yLTguMmMtLjItMS40LS44LTcuNS0uOC03LjVzLS43LTUuNS0uOC02LjZjLTEuNC4xLTIuOC4yLTUgMC0xLjktLjItNi41LS42LTYuNS0uNnMtNS41LjUtOC4xLjdjLTIuMy4yLTYuNCAxLjUtNi40IDEuNXMtMy40LjQtNC4yLjhjLjIgMS4zIDEuMSA0LjEgMS4xIDQuMWwxIDYuNWMuNSAzLjUuMyA0LjYtMiA1LjEtMy45LjgtMy42LjYtNC41LTIuOS0uNS0xLjktMS42LTQuNS0yLjItNy41LS42LTIuNy0xLjMtOC4zLTEuMy04LjNsLTEuNy04LjhzLTEtMy42LTEuOC03LjFjLS40LTEuNC0xLjYtMS4xLTIuOS0xLTQuMy42LTUuNC0uOS01LjQtLjlsLS41LTMuN3MtLjgtMi41LS44LTMuN2MwLTEuNS4zLTIuOCAzLjgtMy4zIDMuOS0uNiAxMC4xLS40IDEzLjctLjlzNS43LTEuNSA2LjktMS4xYzEgLjQgMSAxLjkgMS40IDMuNy4yLjcuOCAzLjEuOCAzLjFsLjMgMi43Yy0xLjIuMi0yLjQuOC0zLjUgMS0xLjUuNC0yLjkuNS00IC43LTEuNy4zLTEuNyAyLTEuNyAyLjggMCAyLjMgMS4xIDYgMi4yIDEwLjUgMi4zLjIgNy45LTEuMSA5LjktMS4xIDMuMi0uMiAxNC0xLjYgMTQtMS42bDkuOS0uM2MyLjMtLjQgMi0xLjkgMi0zLjYgMC0xLjYtMS4zLTMuNi0xLjMtMy42cy0xLjMtMS41LTIuMS0yLjFjLTMuMy0yLjgtMi0xMi42LjctMTUuNi43LS44IDIuNi0yIDMuMy0yLjUgMi0xLjQgMy4yLTEuNSA1LjItMS41IDQuMSAwIDcuNSAxLjMgOS4zIDMuNyAyLjEgMi44IDMuNiA1LjkgMy42IDguMiAwIDQuMi0uNyA1LjctMy4zIDguNy0yIDIuNC0yLjMgMy4yLTIuMyA2IDAgMS4xIDEgMS42IDEuOSAxLjcgMS41LjIgMy4xLS4yIDQuOC0uM3MzLjQuMSA1LjEuMWMzLjUgMCA2LjkuNyA5LjkgMSA0LjUuNCAxMC40IDEuNCAxMi41IDMuMSAyIDEuNyAzLjcgMy4yIDQuOSA0LjggMS4xIDEuNSAyLjIgMi45IDMuMiA0LjQgMi4yIDMuMSAyLjMgNi41IDMuMyA5LjggMS44LTEuNiA1LjUtNi45IDcuMS0xMCAxLjItMi4yIDIuOS0zLjkgMi40LTQuMi0xLjgtMS4xLTQuMS0xLjItNi4xLTIuNC0xLS42LjUtMi4yIDIuOC01LjMuNC0uNiAxLjEtMi4zIDEuNS0yLjkgMS4yLTIuMyA0LjctNS42IDQuNy01LjZzMy43LTIuMSA1LjMtMi4xYzMuMi4xIDUuNCAyLjYgMy44IDguNnoiIHN0eWxlPSJmaWxsOiNlNzMzMzEiPjwvcGF0aD48cGF0aCBjbGFzcz0ibG9nb19zdmdfX3N0MSIgZD0iTTIwOS44IDI4LjZoMjcuOWwyMCA0Mi43YzIuNCA1LjEgMy45IDEwIDQuOSAxNy4zaC40YzAtNi40LS4xLTEzLjYtLjEtMjAuMlYyOC42aDIzLjhWMTI3aC0yNS44TDIzOSA4MS4zYy0yLjgtNS44LTQuMy0xMS4yLTUtMTcuM2gtLjNjMCA0LjkuMSAxMy4zLjEgMjAuMXY0M2gtMjRWMjguNnpNMzYyIDEwNy45VjEyN2gtNjAuN1YyOC42SDM2MXYxOS4xaC0zMy41djE5LjRIMzU5Vjg2aC0zMS41djIxLjlIMzYyek0zOTguMyAyOC42djY3LjVjMCA3LjYgNCAxMi4xIDExIDEyLjFzMTEuMS00LjQgMTEuMS0xMi4xVjI4LjZoMjYuMXY2OC41YzAgMjAuMS0xMy43IDMyLjMtMzcuMiAzMi4zcy0zNy4yLTEyLjItMzcuMi0zMi4zVjI4LjZoMjYuMnpNNDYwIDI4LjZoMzQuOGwxMCA0Ni43YzEuMSA0LjkgMS44IDEwLjUgMS45IDEzLjloLjRjLjEtMy4zIDEtOSAxLjktMTRsOS40LTQ2LjZoMzUuMVYxMjdoLTIzVjc0YzAtNi4yIDAtMTIuOC40LTE5aC0uNGMtLjQgMy42LTEgNy41LTEuNyAxMC43TDUxNi4xIDEyN2gtMTkuM2wtMTMuNC02MS4zYy0uNy0zLjMtMS40LTcuMi0xLjctMTAuNWgtLjRjLjQgNiAuNiAxMi41LjYgMTguOXY1M0g0NjBWMjguNnpNNjE4LjQgMTA2LjloLTI1LjVsLTQuNCAyMC4xaC0yNi4xbDI3LTk4LjRINjIybDI3IDk4LjRoLTI2LjJsLTQuNC0yMC4xem0tNC0xOC01LjUtMjUuNGMtMS4xLTQuOS0yLjItOS42LTMtMTUuNGgtLjNjLS43IDUuOC0xLjkgMTAuNS0zIDE1LjRsLTUuNSAyNS40aDE3LjN6TTY1Ny44IDI4LjZoMjcuOWwyMCA0Mi43YzIuNCA1LjEgMy45IDEwIDQuOSAxNy4zaC40YzAtNi40LS4xLTEzLjYtLjEtMjAuMlYyOC42aDIzLjhWMTI3aC0yNS44TDY4NyA4MS4zYy0yLjgtNS44LTQuMy0xMS4yLTUtMTcuM2gtLjNjMCA0LjkuMSAxMy4zLjEgMjAuMXY0M2gtMjRWMjguNnpNNzQ5LjMgMjguNmgyNy45bDIwIDQyLjdjMi40IDUuMSAzLjkgMTAgNC45IDE3LjNoLjRjMC02LjQtLjEtMTMuNi0uMS0yMC4yVjI4LjZoMjMuOFYxMjdoLTI1LjhsLTIxLjktNDUuN2MtMi44LTUuOC00LjMtMTEuMi01LTE3LjNoLS4zYzAgNC45LjEgMTMuMy4xIDIwLjF2NDNoLTI0VjI4LjZ6Ij48L3BhdGg+PC9zdmc+"
              />
              {/* <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center">
                <span className="text-foreground font-bold">TXT</span>
              </div>
              <div>
                <p className="font-semibold">University</p>
                <p className="text-xs text-background/60 -mt-1">Bookstore</p>
              </div> */}
            </div>
            {/* <p className="text-sm text-background/60 mb-4">
              Your online bookstore since 1997. Over 15 million books available.
            </p> */}
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

          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h4 className="font-medium mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-background/60 hover:text-background transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-background/60">
            © {thisyear} University Bookstore. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <div className="min-w-[180px]">
              <LocaleSwitcher localesData={localesData} />
            </div>
            <img
              src="/placeholder.svg?height=24&width=40"
              alt="Visa"
              className="h-6 opacity-60"
            />
            <img
              src="/placeholder.svg?height=24&width=40"
              alt="Mastercard"
              className="h-6 opacity-60"
            />
            <img
              src="/placeholder.svg?height=24&width=40"
              alt="PayPal"
              className="h-6 opacity-60"
            />
            <img
              src="/placeholder.svg?height=24&width=40"
              alt="Apple Pay"
              className="h-6 opacity-60"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
