"use client";

import React from "react";
import Link from "next/link";

export interface RelatedStoryPost {
  id: string;
  title: string;
  slug: string;
  fullPath?: string;
  publishedDate?: string;
  summary?: string;
  imageUrl?: string;
  locale: string;
  defaultLocale: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildHref(post: RelatedStoryPost) {
  const path = post.fullPath ?? `/blog/${post.slug}`;
  const prefix = post.locale === post.defaultLocale ? "" : `/${post.locale}`;
  return `${prefix}${path}`;
}

export default function RelatedStoriesSection({ posts }: { posts: RelatedStoryPost[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="py-20 md:py-28 bg-surface-inverse text-surface-inverse-foreground overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-surface-inverse-foreground/40 mb-3">
            Related reading
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-medium tracking-tight leading-tight">
            Stories
          </h2>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-surface-inverse-foreground/10">
          {posts.map((post, i) => (
            <StoryCard key={post.id} post={post} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StoryCard({ post, index }: { post: RelatedStoryPost; index: number }) {
  const href = buildHref(post);

  return (
    <Link href={href} className="group block bg-surface-inverse relative overflow-hidden">
      {/* Image area */}
      <div className="aspect-[16/9] overflow-hidden bg-surface-inverse-foreground/5 relative">
        {post.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-surface-inverse-foreground/10 font-serif text-6xl select-none">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-inverse via-transparent to-transparent opacity-60" />
      </div>

      {/* Content */}
      <div className="p-6 pb-8">
        {post.publishedDate && (
          <time className="block text-xs text-surface-inverse-foreground/40 uppercase tracking-widest mb-3">
            {formatDate(post.publishedDate)}
          </time>
        )}
        <h3 className="font-serif text-lg sm:text-xl font-medium leading-snug mb-3 group-hover:text-surface-inverse-foreground/70 transition-colors duration-200">
          {post.title}
        </h3>
        {post.summary && (
          <p className="text-sm text-surface-inverse-foreground/50 leading-relaxed line-clamp-2">
            {post.summary}
          </p>
        )}
        {/* Read more arrow */}
        <div className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-surface-inverse-foreground/40 group-hover:text-surface-inverse-foreground transition-colors duration-200">
          <span>Read</span>
          <svg
            className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
