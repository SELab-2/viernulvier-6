import { useSyncExternalStore } from "react";

/**
 * Hook that returns true after the component has mounted (hydrated).
 * Useful for preventing hydration mismatches.
 *
 * Uses useSyncExternalStore to avoid the eslint warning about
 * setState in useEffect while still being SSR-safe.
 */
export function useMounted(): boolean {
    return useSyncExternalStore(
        () => () => {},
        () => true,
        () => false
    );
}
