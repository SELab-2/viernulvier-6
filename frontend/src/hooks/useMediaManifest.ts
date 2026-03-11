"use client";

import { useEffect, useState } from "react";
import type { MediaItem } from "@/components/sections/infinite-canvas";

const MANIFEST_URL = "data/artworks-manifest.json";

interface UseMediaManifestResult {
    media: MediaItem[];
    isLoading: boolean;
    error: Error | null;
}

export function useMediaManifest(): UseMediaManifestResult {
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function fetchManifest() {
            try {
                setIsLoading(true);
                const response = await fetch(MANIFEST_URL);

                if (!response.ok) {
                    throw new Error(
                        `Failed to load manifest: ${response.status} ${response.statusText}`
                    );
                }

                const data = (await response.json()) as MediaItem[];

                if (!cancelled) {
                    setMedia(data);
                    setError(null);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error ? err : new Error("Unknown error loading manifest")
                    );
                    console.error("Failed to load media manifest:", err);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void fetchManifest();

        return () => {
            cancelled = true;
        };
    }, []);

    return { media, isLoading, error };
}
