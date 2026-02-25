import { ChunkOffset } from "./types";

// World settings
export const CHUNK_SIZE = 180;
export const RENDER_DISTANCE = 2;
export const CHUNK_FADE_MARGIN = 1;

// Visual settings
export const DEPTH_FADE_START = 140;
export const DEPTH_FADE_END = 260;
export const INVIS_THRESHOLD = 0.01;

// Camera settings
export const INITIAL_CAMERA_Z = 50;

// Animation settings
export const AUTO_DRIFT_SPEED = 0.03;

// Items per chunk
export const ITEMS_PER_CHUNK = 3;

// Pre-computed chunk offsets for rendering
export const CHUNK_OFFSETS: ChunkOffset[] = (() => {
    const maxDist = RENDER_DISTANCE + CHUNK_FADE_MARGIN;
    const offsets: ChunkOffset[] = [];
    for (let dx = -maxDist; dx <= maxDist; dx++) {
        for (let dy = -maxDist; dy <= maxDist; dy++) {
            for (let dz = -maxDist; dz <= maxDist; dz++) {
                const dist = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
                if (dist > maxDist) continue;
                offsets.push({ dx, dy, dz, dist });
            }
        }
    }
    return offsets;
})();
