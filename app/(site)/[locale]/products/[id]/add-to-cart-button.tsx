"use client";

import { useState } from "react";
import { useTracking } from "@/features/tracking/use-tracking";

interface AddToCartButtonProps {
  productId: string;
  productTitle: string;
  productPrice: number;
  productSku?: string;
  disabled?: boolean;
}

export function AddToCartButton({
  productId,
  productTitle,
  productPrice,
  productSku,
  disabled = false,
}: AddToCartButtonProps) {
  const { trackMetric } = useTracking();
  const [isAdded, setIsAdded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleAddToCart = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    trackMetric("add_to_cart", {
      productId,
      productTitle,
      productPrice,
      productSku,
      location: "product-detail-page",
    });

    // Show success state
    setTimeout(() => {
      setIsAdded(true);
      setIsAnimating(false);
    }, 300);

    // Reset after 2 seconds
    setTimeout(() => {
      setIsAdded(false);
    }, 2500);
  };

  return (
    <button
      onClick={handleAddToCart}
      className={`w-full md:w-auto px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
        isAdded 
          ? "bg-green-600 text-white scale-105" 
          : "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02]"
      } ${isAnimating ? "scale-95" : ""}`}
      disabled={disabled || isAnimating}
    >
      {isAdded ? (
        <>
          <svg className="w-5 h-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Added to Cart!</span>
        </>
      ) : isAnimating ? (
        <>
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Adding...</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>Add to Cart</span>
        </>
      )}
    </button>
  );
}
