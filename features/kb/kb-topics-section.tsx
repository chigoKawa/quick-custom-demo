"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, CreditCard, Shield, User, Settings, HelpCircle } from "lucide-react";

type TopicCardProps = {
  slug: string;
  name: string;
  articleCount: number;
  locale: string;
  icon?: React.ReactNode;
};

const TOPIC_ICONS: Record<string, React.ReactNode> = {
  payments: <CreditCard className="h-8 w-8" />,
  security: <Shield className="h-8 w-8" />,
  products: <BookOpen className="h-8 w-8" />,
  "my-account": <User className="h-8 w-8" />,
  account: <User className="h-8 w-8" />,
  "getting-started": <BookOpen className="h-8 w-8" />,
  troubleshooting: <Settings className="h-8 w-8" />,
};

function TopicCard({ slug, name, articleCount, locale, icon }: TopicCardProps) {
  const displayIcon = icon || TOPIC_ICONS[slug] || <HelpCircle className="h-8 w-8" />;

  return (
    <Link
      href={`/${locale}/knowledge-base/topic/${encodeURIComponent(slug)}`}
      className="group flex flex-col items-center text-center p-6 rounded-xl border bg-background hover:border-primary hover:shadow-md transition-all"
    >
      <div className="text-primary mb-4">{displayIcon}</div>
      <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
        {name}
      </h3>
      <p className="text-sm text-muted-foreground">
        {articleCount} article{articleCount === 1 ? "" : "s"}
      </p>
    </Link>
  );
}

type Props = {
  locale: string;
  topics: Array<{ slug: string; name: string; articleCount: number }>;
};

export default function KbTopicsSection({ locale, topics }: Props) {
  if (!topics.length) return null;

  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <p className="text-center text-muted-foreground mb-10">
          Choose one of the main topics listed below to get started.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {topics.map((topic) => (
            <TopicCard
              key={topic.slug}
              slug={topic.slug}
              name={topic.name}
              articleCount={topic.articleCount}
              locale={locale}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
