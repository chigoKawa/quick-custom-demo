"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, BookOpen, Gift, Bell } from "lucide-react"

const benefits = [
  { icon: BookOpen, text: "Early access to new releases" },
  { icon: Gift, text: "Exclusive offers" },
  { icon: Bell, text: "Personalized deals" },
]

export function NewsletterSection() {
  const [email, setEmail] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle newsletter signup
    setEmail("")
  }

  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Mail className="h-7 w-7 text-primary" />
          </div>

          <h2 className="text-2xl md:text-3xl font-semibold mb-3">Stay Updated</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
            Subscribe to our newsletter and get 10% off your first order right away.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-8">
            <Input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-full px-5 py-5"
              required
            />
            <Button type="submit" className="rounded-full px-8 whitespace-nowrap">
              Subscribe
            </Button>
          </form>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <benefit.icon className="h-4 w-4 text-primary" />
                <span>{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
