"use client";

import React from "react";
import { ThumbsUp, Heart, ThumbsDown } from "lucide-react";

type Props = {
  articleId?: string;
  locale: string;
};

export default function KbArticleFeedback({ articleId, locale }: Props) {
  const [submitted, setSubmitted] = React.useState(false);
  const [selected, setSelected] = React.useState<string | null>(null);

  const handleFeedback = (type: "helpful" | "love" | "not-helpful") => {
    setSelected(type);
    setSubmitted(true);
    // In a real implementation, you'd send this to an API
    // For now, just log it
    if (process.env.NODE_ENV === "development") {
      console.log("[KB Feedback]", { articleId, locale, type });
    }
  };

  if (submitted) {
    return (
      <div className="mt-16 pt-8 border-t text-center">
        <p className="text-muted-foreground">Thank you for your feedback!</p>
      </div>
    );
  }

  return (
    <div className="mt-16 pt-8 border-t text-center">
      <p className="text-muted-foreground mb-4">Was this article helpful?</p>
      <div className="inline-flex items-center gap-2 rounded-lg border p-1">
        <button
          onClick={() => handleFeedback("helpful")}
          className={`p-3 rounded-md transition-colors hover:bg-muted ${
            selected === "helpful" ? "bg-muted" : ""
          }`}
          aria-label="Helpful"
        >
          <ThumbsUp className="h-5 w-5 text-primary" />
        </button>
        <button
          onClick={() => handleFeedback("love")}
          className={`p-3 rounded-md transition-colors hover:bg-muted ${
            selected === "love" ? "bg-muted" : ""
          }`}
          aria-label="Love it"
        >
          <Heart className="h-5 w-5 text-red-500" />
        </button>
        <button
          onClick={() => handleFeedback("not-helpful")}
          className={`p-3 rounded-md transition-colors hover:bg-muted ${
            selected === "not-helpful" ? "bg-muted" : ""
          }`}
          aria-label="Not helpful"
        >
          <ThumbsDown className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
