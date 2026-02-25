"use client";

import { Hero } from "@/components/sections";
import { InfiniteCanvas } from "@/components/sections/infinite-canvas";
import * as React from "react";
import { MediaItem } from "@/components/sections/infinite-canvas/types";
import manifest from "@/components/sections/infinite-canvas/artworks/manifest.json";

export default function HomePage() {
    const [media] = React.useState<MediaItem[]>(manifest);
    const [textureProgress, setTextureProgress] = React.useState(0);

    return (
        <main className="h-screen overflow-hidden">
            <InfiniteCanvas media={media} onTextureProgress={setTextureProgress} />
            <Hero />
        </main>
    );
}
