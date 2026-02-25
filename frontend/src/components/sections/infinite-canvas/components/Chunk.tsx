"use client";

import * as React from "react";
import { getChunkPlanes } from "../lib/chunk-generator";
import type { MediaItem, PlaneData } from "../lib/types";
import { MediaPlane } from "./MediaPlane";

type CameraState = {
    cx: number;
    cy: number;
    cz: number;
    camZ: number;
};

type ChunkProps = {
    cx: number;
    cy: number;
    cz: number;
    media: MediaItem[];
    cameraRef: React.RefObject<CameraState>;
};

export function Chunk({ cx, cy, cz, media, cameraRef }: ChunkProps) {
    const [planes, setPlanes] = React.useState<PlaneData[] | null>(null);

    React.useEffect(() => {
        let canceled = false;
        const run = () => !canceled && setPlanes(getChunkPlanes(cx, cy, cz));

        if (typeof requestIdleCallback !== "undefined") {
            const id = requestIdleCallback(run, { timeout: 100 });
            return () => {
                canceled = true;
                cancelIdleCallback(id);
            };
        }

        const id = setTimeout(run, 0);
        return () => {
            canceled = true;
            clearTimeout(id);
        };
    }, [cx, cy, cz]);

    if (!planes) return null;

    return (
        <group>
            {planes.map((plane) => {
                const mediaItem = media[plane.mediaIndex % media.length];
                if (!mediaItem) return null;

                return (
                    <MediaPlane
                        key={plane.id}
                        position={plane.position}
                        scale={plane.scale}
                        media={mediaItem}
                        chunkCx={cx}
                        chunkCy={cy}
                        chunkCz={cz}
                        cameraRef={cameraRef}
                    />
                );
            })}
        </group>
    );
}
