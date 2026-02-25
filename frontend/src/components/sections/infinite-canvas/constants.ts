export const CHUNK_SIZE = 180;
export const RENDER_DISTANCE = 2;
export const CHUNK_FADE_MARGIN = 1;
export const DEPTH_FADE_START = 140;
export const DEPTH_FADE_END = 260;
export const INVIS_THRESHOLD = 0.01;
export const INITIAL_CAMERA_Z = 50;
export const AUTO_DRIFT_SPEED = 0.03;

export type ChunkOffset = {
    dx: number;
    dy: number;
    dz: number;
    dist: number;
};

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
