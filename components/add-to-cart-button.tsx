"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNinetailed } from "@ninetailed/experience.js-react";

type Props = {
  label?: string;
  book?: any;
};

export default function AddToCartButton({ label = "Add to cart", book }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const { track } = useNinetailed();

  return (
    <Button
      type="button"
      className="rounded-full"
      disabled={isLoading}
      onClick={() => {
        setIsLoading(true);
        try {
          void track?.("add_to_cart", {
            location: `${label} button`,
            value: 1,
            title: book?.title,
            price: book?.price?.formatted,
            olid: book?.olid,
            isbn13: book?.isbn13,
            
          });
        } catch {
          // ignore
        }
        window.setTimeout(() => {
          setIsLoading(false);
        }, 400);
      }}
    >
      {isLoading ? "Added" : label}
    </Button>
  );
}
