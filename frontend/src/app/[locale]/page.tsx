"use client";

import { Hero } from "@/components/sections";
import { InfiniteCanvas } from "@/components/sections/infinite-canvas";
import * as React from "react";
import type { MediaItem } from "@/components/sections/infinite-canvas";

export default function HomePage() {
    const [media, setMedia] = React.useState<MediaItem[]>([]);

    // Fetch manifest
    React.useEffect(() => {
        fetch("/data/artworks-manifest.json")
            .then((res) => res.json())
            .then((data) => setMedia(data))
            .catch((err) => console.error("Failed to load manifest:", err));
    }, []);

    if (!media.length) return null;

    return (
        <main className="relative h-screen overflow-hidden">
            <InfiniteCanvas media={media} />
            <Hero />
        </main>
    );
}
