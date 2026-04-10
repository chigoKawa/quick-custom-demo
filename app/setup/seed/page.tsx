import type { Metadata } from "next";
import EventSeeder from "./_components/event-seeder";

export const metadata: Metadata = {
  title: "Seed Ninetailed Events",
  description: "Fire Ninetailed metric events for testing",
  robots: { index: false, follow: false },
};

export default function SeedPage() {
  return (
    <div className="min-h-screen bg-background">
      <EventSeeder />
    </div>
  );
}
