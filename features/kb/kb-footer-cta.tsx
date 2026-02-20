"use client";

import React from "react";
import Link from "next/link";

type Props = {
  locale: string;
};

export default function KbFooterCta({ locale }: Props) {
  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <p className="text-muted-foreground">
            Can&apos;t find what you&apos;re looking for? Don&apos;t worry, you can always{" "}
            <Link
              href={`/${locale}/contact`}
              className="inline-flex items-center justify-center rounded-md border border-primary px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors ml-2"
            >
              Contact Us
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
