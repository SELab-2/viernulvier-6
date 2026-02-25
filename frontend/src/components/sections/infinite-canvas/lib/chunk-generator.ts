import * as THREE from "three";
import { CHUNK_SIZE, ITEMS_PER_CHUNK } from "./constants";
import { hashString, seededRandom } from "./math-utils";
import type { PlaneData } from "./types";

const MAX_CACHE_SIZE = 256;
const planeCache = new Map<string, PlaneData[]>();

const touchCache = (key: string) => {
    const v = planeCache.get(key);
    if (!v) return;
    planeCache.delete(key);
    planeCache.set(key, v);
};

const evictCache = () => {
    while (planeCache.size > MAX_CACHE_SIZE) {
        const firstKey = planeCache.keys().next().value as string | undefined;
        if (!firstKey) break;
        planeCache.delete(firstKey);
    }
};

const generateChunkPlanes = (cx: number, cy: number, cz: number): PlaneData[] => {
    const planes: PlaneData[] = [];
    const seed = hashString(`${cx},${cy},${cz}`);

    for (let i = 0; i < ITEMS_PER_CHUNK; i++) {
        const s = seed + i * 1000;
        const r = (n: number) => seededRandom(s + n);
        const size = 12 + r(4) * 8;

        planes.push({
            id: `${cx}-${cy}-${cz}-${i}`,
            position: new THREE.Vector3(
                cx * CHUNK_SIZE + r(0) * CHUNK_SIZE,
                cy * CHUNK_SIZE + r(1) * CHUNK_SIZE,
                cz * CHUNK_SIZE + r(2) * CHUNK_SIZE
            ),
            scale: new THREE.Vector3(size, size, 1),
            mediaIndex: Math.floor(r(5) * 1_000_000),
        });
    }

    return planes;
};

export const getChunkPlanes = (cx: number, cy: number, cz: number): PlaneData[] => {
    const key = `${cx},${cy},${cz}`;
    const cached = planeCache.get(key);
    if (cached) {
        touchCache(key);
        return cached;
    }

    const planes = generateChunkPlanes(cx, cy, cz);
    planeCache.set(key, planes);
    evictCache();
    return planes;
};
