/**
 * Preview System Types
 *
 * Provides type definitions for the CMS preview functionality.
 * Allows editors to preview changes before saving to the API.
 */

/**
 * Supported entity types for preview
 */
export type PreviewEntityType = "article" | "production" | "location" | "artist" | "event";

/**
 * Preview data structure stored in context and localStorage
 */
export interface PreviewData<T = unknown> {
    /** Entity type being previewed */
    entityType: PreviewEntityType;
    /** Entity identifier (slug or id) */
    entityId: string;
    /** The edited data to preview */
    data: T;
    /** Timestamp for cache invalidation */
    timestamp: number;
    /** Locale for the preview */
    locale: string;
}

/**
 * Preview context state and actions
 */
export interface PreviewContextValue {
    /** Currently active preview data */
    activePreview: PreviewData | null;
    /** Set preview data for an entity */
    setPreview: <T>(
        entityType: PreviewEntityType,
        entityId: string,
        data: T,
        locale: string
    ) => void;
    /** Get preview data for a specific entity */
    getPreview: <T>(entityType: PreviewEntityType, entityId: string) => T | null;
    /** Check if preview exists for an entity */
    hasPreview: (entityType: PreviewEntityType, entityId: string) => boolean;
    /** Clear all preview data */
    clearPreview: () => void;
    /** Clear preview for specific entity */
    clearPreviewFor: (entityType: PreviewEntityType, entityId: string) => void;
}

/**
 * Configuration for preview persistence
 */
export interface PreviewConfig {
    /** Maximum age of preview data in milliseconds (default: 1 hour) */
    maxAgeMs: number;
    /** localStorage key prefix */
    storageKey: string;
}

export const DEFAULT_PREVIEW_CONFIG: PreviewConfig = {
    maxAgeMs: 60 * 60 * 1000, // 1 hour
    storageKey: "cms_preview",
};
