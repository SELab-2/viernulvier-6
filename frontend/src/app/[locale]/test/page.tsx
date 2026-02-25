"use client";

import * as React from "react";
import manifest from "@/components/sections/infinite-canvas/artworks/manifest.json";
import { MediaItem } from "@/components/sections/infinite-canvas/types";
import { InfiniteCanvas } from "@/components/sections/infinite-canvas";

export default function Test() {
    const [media] = React.useState<MediaItem[]>(manifest);
    const [textureProgress, setTextureProgress] = React.useState(0);

    return (
        <>
            <InfiniteCanvas media={media} onTextureProgress={setTextureProgress} />
        </>
    );
}
