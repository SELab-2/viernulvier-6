"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

import {
    type PreviewData,
    type PreviewEntityType,
    type PreviewContextValue,
    DEFAULT_PREVIEW_CONFIG,
} from "@/types/preview.types";

const PreviewContext = createContext<PreviewContextValue | null>(null);

/**
 * Storage key for persisting preview data
 */
const STORAGE_KEY = DEFAULT_PREVIEW_CONFIG.storageKey;

/**
 * Maximum age of preview data before it's considered stale (1 hour)
 */
const MAX_PREVIEW_AGE_MS = DEFAULT_PREVIEW_CONFIG.maxAgeMs;

/**
 * Load preview data from localStorage
 */
function loadPreviewFromStorage(): PreviewData | null {
    if (typeof window === "undefined") return null;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;

        const parsed = JSON.parse(stored) as PreviewData;

        // Check if preview is expired
        const age = Date.now() - parsed.timestamp;
        if (age > MAX_PREVIEW_AGE_MS) {
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }

        return parsed;
    } catch {
        // Invalid storage data, clear it
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }
}

/**
 * Save preview data to localStorage
 */
function savePreviewToStorage(preview: PreviewData | null): void {
    if (typeof window === "undefined") return;

    try {
        if (preview) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preview));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // Storage might be full or disabled, silently fail
    }
}

interface PreviewProviderProps {
    children: ReactNode;
}

/**
 * Lazy initializer for preview state from localStorage.
 * Prevents cascading renders by reading storage during initial state creation.
 */
function initializePreviewState(): PreviewData | null {
    if (typeof window === "undefined") return null;
    return loadPreviewFromStorage();
}

/**
 * Provider component for the preview system.
 *
 * Manages preview state in memory and persists to localStorage
 * so previews survive page refreshes.
 */
export function PreviewProvider({ children }: PreviewProviderProps) {
    const [activePreview, setActivePreview] = useState<PreviewData | null>(initializePreviewState);

    // Persist to localStorage when activePreview changes
    useEffect(() => {
        savePreviewToStorage(activePreview);
    }, [activePreview]);

    // Listen for storage changes from other tabs/iframes
    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleStorageChange = (event: StorageEvent) => {
            if (event.key !== STORAGE_KEY) return;

            // Reload preview from storage when another context updates it
            const stored = loadPreviewFromStorage();
            setActivePreview(stored);
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    // Periodic sync for iframe contexts (storage events can be unreliable)
    useEffect(() => {
        if (typeof window === "undefined") return;

        // Only run in iframe contexts
        if (window.self === window.top) return;

        const syncFromStorage = () => {
            const stored = loadPreviewFromStorage();
            setActivePreview((current) => {
                // Only update if different to avoid unnecessary re-renders
                if (JSON.stringify(current) !== JSON.stringify(stored)) {
                    return stored;
                }
                return current;
            });
        };

        // Sync immediately on mount and then periodically
        syncFromStorage();
        const interval = setInterval(syncFromStorage, 500);

        return () => clearInterval(interval);
    }, []);

    const setPreview = useCallback(
        <T,>(entityType: PreviewEntityType, entityId: string, data: T, locale: string): void => {
            setActivePreview({
                entityType,
                entityId,
                data,
                timestamp: Date.now(),
                locale,
            });
        },
        []
    );

    const getPreview = useCallback(
        <T,>(entityType: PreviewEntityType, entityId: string): T | null => {
            if (activePreview?.entityType === entityType && activePreview?.entityId === entityId) {
                return activePreview.data as T;
            }
            return null;
        },
        [activePreview]
    );

    const hasPreview = useCallback(
        (entityType: PreviewEntityType, entityId: string): boolean => {
            return activePreview?.entityType === entityType && activePreview?.entityId === entityId;
        },
        [activePreview]
    );

    const clearPreview = useCallback((): void => {
        setActivePreview(null);
    }, []);

    const clearPreviewFor = useCallback((entityType: PreviewEntityType, entityId: string): void => {
        setActivePreview((current) => {
            if (current?.entityType === entityType && current?.entityId === entityId) {
                return null;
            }
            return current;
        });
    }, []);

    const value: PreviewContextValue = {
        activePreview,
        setPreview,
        getPreview,
        hasPreview,
        clearPreview,
        clearPreviewFor,
    };

    return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
}

/**
 * Hook to access the preview context.
 *
 * @throws Error if used outside of PreviewProvider
 */
export function usePreviewContext(): PreviewContextValue {
    const context = useContext(PreviewContext);
    if (!context) {
        throw new Error("usePreviewContext must be used within a PreviewProvider");
    }
    return context;
}
