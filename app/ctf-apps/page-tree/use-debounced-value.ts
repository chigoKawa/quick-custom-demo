import { useEffect, useState } from "react";

/**
 * Returns a debounced version of `value` that only updates
 * after `delay` ms of inactivity. Useful for search inputs
 * where the downstream computation is expensive.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
