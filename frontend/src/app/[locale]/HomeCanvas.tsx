"use client";

import { InfiniteCanvas } from "@/components/sections/infinite-canvas";
import { useMediaManifest } from "@/hooks";
import { useTheme } from "@/hooks/useTheme";

export function HomeCanvas() {
    const { media } = useMediaManifest();
    const theme = useTheme();

    if (!media.length) return null;

    // Match background with page to prevent flash before canvas renders
    const bgColor = theme === "dark" ? "#0a0a0a" : "#ffffff";

    return (
        <div className="h-full w-full" style={{ backgroundColor: bgColor }}>
            <InfiniteCanvas media={media} />
        </div>
    );
}
