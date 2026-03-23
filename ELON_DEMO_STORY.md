# Elon Demo Story — Selling Contentful + Personalization

## The Narrative Arc

> **"Elon's editorial team is small — just three people, no in-house devs. Today, every change to elon.se goes through Vaimo and Adobe. We're going to show how Contentful gives these three editors full control over their content, across both elon.se and elon.no, with built-in experimentation — without ever needing a developer ticket."**

---

## Act 1: "A Day in the Life" — Live Preview Editing

**Scene:** Open the Elon homepage in live preview. The hero says "Välkommen till Elon" with a general product promo.

**Demo moves:**
1. Change the hero headline from "Välkommen till Elon" → "Sommarkampanj – Upp till 30% rabatt" — watch it update in real-time.
2. Swap the hero image from the general product shot to the RoboRock robot vacuum.
3. Show how the same content block is reused on another page.

**Key message to Elon:** *"Your editors can make these changes in minutes, not days. No Vaimo ticket needed. And the preview shows your actual React front-end — not a mock."*

---

## Act 2: Localization — SE → NO in One Click

**Scene:** Show the same homepage in Swedish (sv), then switch to English (en-US) to demonstrate locale management.

**Demo moves:**
1. Show the Swedish hero copy.
2. Show the English fallback and how editors see which locales are complete.
3. Explain: "90% of your content is shared. The 10% that's market-specific — like a Norwegian-only promo — lives in its own locale override."

**Key message:** *"Today you manage this in code via Adobe. Here, your editors see it in a structured way. When you add elon.no, it's one new locale, not a new codebase."*

---

## Act 3: Personalization & Experimentation — The Differentiator

### Two Audiences

| Audience | Trigger | What They See | Business Goal |
|---|---|---|---|
| **Kampanjbesökare** (Campaign Visitors) | Arrive via `?utm_campaign=kampanj` or browse deals | "Handla nu – betala senare med Elon Flex" financing hero | Convert price-sensitive traffic |
| **Smart Home-intresserade** (Smart Home Enthusiasts) | Arrive via `?utm_campaign=smarthome` or browse cleaning/tech | "Gör hemmet smartare" connected-living hero + RoboRock showcase | Upsell premium smart-home bundle |

### How to Trigger in the Demo

- **Default (everyone):** Visit the homepage normally → general "Välkommen till Elon" hero
- **Campaign Visitors:** Add `?utm_campaign=kampanj` → hero swaps to financing promo
- **Smart Home:** Add `?utm_campaign=smarthome` → hero swaps to smart home promo

### The A/B Story

**Demo move:** "But what if Elon's team isn't sure which hero works better? They don't need to guess."

1. Show the experience setup: 50/50 split between standard promo and financing promo.
2. Explain how Ninetailed tracks which variant drives more add-to-cart events.
3. Reference Content Performance Insights: "Over time, editors see which content blocks actually perform — not just click-through, but real conversion impact."

**Key message:** *"Sanity can build you a CMS. Contentful gives you a content platform with experimentation built in. Your editors can run A/B tests on content without touching code or needing a separate testing tool."*

---

## Act 4: Product Stories — Editorial Commerce

### Product Story 1: RoboRock Q10 VF+ Black

**Slug:** `roborock-q10-vf-black`  
**Angle:** Smart Home · Automatiserad Städning · Connected Living

**Story:**
> The RoboRock Q10 VF+ is more than a vacuum — it's a home automation centerpiece. With its self-emptying dock and intelligent navigation, it takes daily cleaning completely off your plate. Let it handle the floors while you handle everything else.

**Cross-sell products:** Electrolux EP71UB14DB (stick vacuum), Electrolux EAF7B (airfryer)

### Product Story 2: Siemens TP515R01 Coffee Machine

**Slug:** `siemens-tp515r01`  
**Angle:** Premium Kök · Kaffeupplevelse · Siemens iQ500

**Story:**
> Start every morning like a barista. The Siemens EQ500 delivers 10 different specialty coffees at the touch of a button — from espresso to latte macchiato. The OneTouch DoubleCup function serves two cups simultaneously, and autoMilk Clean keeps maintenance effortless. This isn't just a coffee machine — it's a daily ritual upgrade.

**Cross-sell products:** Siemens SR63HX75ME (dishwasher), Electrolux EAF7B (airfryer)

---

## Act 5: Closing — Why Contentful, Not Sanity

**The setup:** "Let me summarize what we just showed, from Elon's editorial team perspective."

| Capability | Contentful (what we showed) | Sanity (what they'd need) |
|---|---|---|
| Live preview editing | Built-in, works with your React front-end | Requires custom preview setup |
| Localization (SE + NO) | Native locale model, editor-visible | Plugin-based, more config |
| Workflows & scheduling | Out-of-the-box approval + scheduling | Custom Groq queries + dev work |
| A/B testing | Ninetailed integration, editor-controlled | External tool + custom integration |
| Content Performance | CPI built into the platform | No equivalent |
| App marketplace | 400+ apps, build custom sidebar apps | More flexible but more dev work |

**Closing line:** *"Contentful is a platform your three editors can run independently. Sanity is a toolkit that always needs Vaimo in the loop. For Elon, that difference is the difference between weeks and minutes to market."*

---

## Content Created in Contentful (elon_start)

### Audiences
1. **Kampanjbesökare** — UTM campaign contains "kampanj"
2. **Smart Home-intresserade** — UTM campaign contains "smarthome"

### Hero Variants (on homepage heroModule)
- **Baseline:** "Välkommen till Elon" — general welcome
- **Variant A (Campaign):** "Handla nu – betala senare med Elon Flex"
- **Variant B (Smart Home):** "Gör hemmet smartare med Elon"

### Product Stories
1. RoboRock Q10 VF+ Black (`roborock-q10-vf-black`)
2. Siemens TP515R01 (`siemens-tp515r01`)
