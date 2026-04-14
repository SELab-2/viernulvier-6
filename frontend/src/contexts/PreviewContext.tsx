"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

import {
    type PreviewData,
    type PreviewEntityType,
    type PreviewContextValue,
    DEFAULT_PREVIEW_CONFIG,
} from "@/types/preview.types";

/**
 * Storage key prefix for persisting preview data
 */
const STORAGE_KEY_PREFIX = DEFAULT_PREVIEW_CONFIG.storageKey;

/**
 * Maximum age of preview data before it's considered stale (1 hour)
 */
const MAX_PREVIEW_AGE_MS = DEFAULT_PREVIEW_CONFIG.maxAgeMs;

type PreviewMap = Record<string, PreviewData>;

function compositeKey(entityType: PreviewEntityType, entityId: string, sessionId?: string): string {
    return sessionId ? `${entityType}:${entityId}:${sessionId}` : `${entityType}:${entityId}`;
}

function getStorageKey(
    entityType: PreviewEntityType,
    entityId: string,
    sessionId?: string
): string {
    return sessionId
        ? `${STORAGE_KEY_PREFIX}:${entityType}:${entityId}:${sessionId}`
        : `${STORAGE_KEY_PREFIX}:${entityType}:${entityId}`;
}

/**
 * Save a single preview to localStorage
 */
function savePreviewToStorage(preview: PreviewData): void {
    if (typeof window === "undefined") return;

    try {
        localStorage.setItem(
            getStorageKey(preview.entityType, preview.entityId, preview.sessionId ?? undefined),
            JSON.stringify(preview)
        );
    } catch {
        // Storage might be full or disabled, silently fail
    }
}

/**
 * Remove a single preview from localStorage
 */
function removePreviewFromStorage(
    entityType: PreviewEntityType,
    entityId: string,
    sessionId?: string
): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(getStorageKey(entityType, entityId, sessionId));
}

/**
 * Remove all previews from localStorage
 */
function clearAllPreviewsFromStorage(): void {
    if (typeof window === "undefined") return;

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`${STORAGE_KEY_PREFIX}:`)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
}

/**
 * Load all previews from localStorage on init
 */
function initializePreviewState(): PreviewMap {
    if (typeof window === "undefined") return {};

    const map: PreviewMap = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(`${STORAGE_KEY_PREFIX}:`)) continue;

        try {
            const stored = localStorage.getItem(key);
            if (!stored) continue;

            const parsed = JSON.parse(stored) as PreviewData;
            const age = Date.now() - parsed.timestamp;
            if (age > MAX_PREVIEW_AGE_MS) {
                localStorage.removeItem(key);
                continue;
            }

            map[compositeKey(parsed.entityType, parsed.entityId, parsed.sessionId ?? undefined)] =
                parsed;
        } catch {
            localStorage.removeItem(key);
        }
    }
    return map;
}

interface PreviewProviderProps {
    children: ReactNode;
}

/**
 * Provider component for the preview system.
 *
 * Manages preview state in memory and persists to localStorage.
 * Supports optional session-scoped keys for tab isolation.
 */
export function PreviewProvider({ children }: PreviewProviderProps) {
    const [previews, setPreviews] = useState<PreviewMap>(initializePreviewState);
    const [activePreview, setActivePreview] = useState<PreviewData | null>(null);

    // Listen for storage changes from other tabs/iframes
    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleStorageChange = (event: StorageEvent) => {
            if (!event.key?.startsWith(`${STORAGE_KEY_PREFIX}:`)) return;

            // Parse key: cms_preview:<entityType>:<entityId>[:<sessionId>]
            const parts = event.key.slice(`${STORAGE_KEY_PREFIX}:`.length).split(":");
            if (parts.length < 2) return;

            const entityType = parts[0] as PreviewEntityType;
            const entityId = parts[1];
            const sessionId = parts.length > 2 ? parts.slice(2).join(":") : undefined;
            const key = compositeKey(entityType, entityId, sessionId);

            let parsed: PreviewData | null = null;
            if (event.newValue) {
                try {
                    parsed = JSON.parse(event.newValue) as PreviewData;
                } catch {
                    parsed = null;
                }
            }

            setPreviews((current) => {
                const next = { ...current };
                if (parsed) {
                    next[key] = parsed;
                } else {
                    delete next[key];
                }
                return next;
            });
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    // Periodic sync for iframe contexts (storage events can be unreliable)
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (window.self === window.top) return;

        const syncFromStorage = () => {
            const next: PreviewMap = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key?.startsWith(`${STORAGE_KEY_PREFIX}:`)) continue;

                try {
                    const stored = localStorage.getItem(key);
                    if (!stored) continue;

                    const parsed = JSON.parse(stored) as PreviewData;
                    const age = Date.now() - parsed.timestamp;
                    if (age > MAX_PREVIEW_AGE_MS) continue;

                    next[
                        compositeKey(
                            parsed.entityType,
                            parsed.entityId,
                            parsed.sessionId ?? undefined
                        )
                    ] = parsed;
                } catch {
                    // ignore corrupt entries
                }
            }

            setPreviews((current) => {
                if (JSON.stringify(current) !== JSON.stringify(next)) {
                    return next;
                }
                return current;
            });
        };

        syncFromStorage();
        const interval = setInterval(syncFromStorage, 500);

        return () => clearInterval(interval);
    }, []);

    const setPreview = useCallback(
        <T,>(
            entityType: PreviewEntityType,
            entityId: string,
            data: T,
            locale: string,
            sessionId?: string
        ): void => {
            const preview: PreviewData = {
                entityType,
                entityId,
                sessionId: sessionId ?? null,
                data,
                timestamp: Date.now(),
                locale,
            };
            const key = compositeKey(entityType, entityId, sessionId);
            setPreviews((current) => ({ ...current, [key]: preview }));
            setActivePreview(preview);
            savePreviewToStorage(preview);
        },
        []
    );

    const getPreview = useCallback(
        <T,>(entityType: PreviewEntityType, entityId: string, sessionId?: string): T | null => {
            const preview = previews[compositeKey(entityType, entityId, sessionId)];
            return preview ? (preview.data as T) : null;
        },
        [previews]
    );

    const getPreviewInfo = useCallback(
        (
            entityType: PreviewEntityType,
            entityId: string,
            sessionId?: string
        ): { timestamp: number; locale: string } | null => {
            const preview = previews[compositeKey(entityType, entityId, sessionId)];
            if (!preview) return null;
            return { timestamp: preview.timestamp, locale: preview.locale };
        },
        [previews]
    );

    const hasPreview = useCallback(
        (entityType: PreviewEntityType, entityId: string, sessionId?: string): boolean => {
            return !!previews[compositeKey(entityType, entityId, sessionId)];
        },
        [previews]
    );

    const clearPreview = useCallback((): void => {
        setPreviews({});
        setActivePreview(null);
        clearAllPreviewsFromStorage();
    }, []);

    const clearPreviewFor = useCallback(
        (entityType: PreviewEntityType, entityId: string, sessionId?: string): void => {
            const key = compositeKey(entityType, entityId, sessionId);
            setPreviews((current) => {
                if (!current[key]) return current;
                const next = { ...current };
                delete next[key];
                return next;
            });
            setActivePreview((current) => {
                if (
                    current?.entityType === entityType &&
                    current?.entityId === entityId &&
                    (current?.sessionId ?? undefined) === (sessionId ?? undefined)
                ) {
                    return null;
                }
                return current;
            });
            removePreviewFromStorage(entityType, entityId, sessionId);
        },
        []
    );

    const value: PreviewContextValue = {
        activePreview,
        setPreview,
        getPreview,
        getPreviewInfo,
        hasPreview,
        clearPreview,
        clearPreviewFor,
    };

    return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);

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
