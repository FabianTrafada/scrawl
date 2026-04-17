import { useEffect, useState } from "react";

/**
 * Returns false during SSR/hydration and true on the client after hydration.
 * Helps avoid hydration mismatches for client-only derived UI state.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Intentionally updates after mount so SSR and first client render match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  return hydrated;
}
