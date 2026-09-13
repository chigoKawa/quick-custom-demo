"use client";

import { createContext, useContext } from "react";

/**
 * Lets the in-store shell tell its content which screen format is selected,
 * without passing a render function through the server→client boundary (React
 * rejects functions as children of client components).
 */
export const ScreenOrientationContext = createContext<{ portrait: boolean }>({
  portrait: false,
});

export function useScreenOrientation(): { portrait: boolean } {
  return useContext(ScreenOrientationContext);
}
