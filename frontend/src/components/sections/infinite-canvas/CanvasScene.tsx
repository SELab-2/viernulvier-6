"use client";

import { Stats, useProgress } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as React from "react";
import { Chunk } from "./components/Chunk";
import { AUTO_DRIFT_SPEED, CHUNK_OFFSETS, CHUNK_SIZE, INITIAL_CAMERA_Z } from "./lib/constants";
import { shouldThrottleUpdate } from "./lib/math-utils";
import styles from "./styles/infinite-canvas.module.css";
import type { ChunkData, InfiniteCanvasProps, MediaItem } from "./lib/types";

type CameraState = {
    cx: number;
    cy: number;
    cz: number;
    camZ: number;
};

function SceneContent({
    media,
    onTextureProgress,
}: {
    media: MediaItem[];
    onTextureProgress?: (progress: number) => void;
}) {
    const { camera } = useThree();

    const pos = React.useRef({ x: 0, y: 0, z: INITIAL_CAMERA_Z });
    const cameraRef = React.useRef<CameraState>({ cx: 0, cy: 0, cz: 0, camZ: INITIAL_CAMERA_Z });
    const [chunks, setChunks] = React.useState<ChunkData[]>([]);

    const { progress } = useProgress();
    const maxProgress = React.useRef(0);

    React.useEffect(() => {
        const rounded = Math.round(progress);
        if (rounded > maxProgress.current) {
            maxProgress.current = rounded;
            onTextureProgress?.(rounded);
        }
    }, [progress, onTextureProgress]);

    // Initialize chunks
    React.useEffect(() => {
        setChunks(
            CHUNK_OFFSETS.map((o) => ({
                key: `${o.dx},${o.dy},${o.dz}`,
                cx: o.dx,
                cy: o.dy,
                cz: o.dz,
            }))
        );
    }, []);

    const lastChunkUpdate = React.useRef(0);

    useFrame(() => {
        const now = performance.now();

        // Auto-forward drift
        pos.current.z -= AUTO_DRIFT_SPEED;
        camera.position.set(pos.current.x, pos.current.y, pos.current.z);

        const cx = Math.floor(pos.current.x / CHUNK_SIZE);
        const cy = Math.floor(pos.current.y / CHUNK_SIZE);
        const cz = Math.floor(pos.current.z / CHUNK_SIZE);

        cameraRef.current = { cx, cy, cz, camZ: pos.current.z };

        // Update chunks throttled
        if (shouldThrottleUpdate(lastChunkUpdate.current, 100, now)) {
            lastChunkUpdate.current = now;
            setChunks(
                CHUNK_OFFSETS.map((o) => ({
                    key: `${cx + o.dx},${cy + o.dy},${cz + o.dz}`,
                    cx: cx + o.dx,
                    cy: cy + o.dy,
                    cz: cz + o.dz,
                }))
            );
        }
    });

    return (
        <>
            {chunks.map((chunk) => (
                <Chunk
                    key={chunk.key}
                    cx={chunk.cx}
                    cy={chunk.cy}
                    cz={chunk.cz}
                    media={media}
                    cameraRef={cameraRef}
                />
            ))}
        </>
    );
}

export function CanvasScene({
    media,
    onTextureProgress,
    showFps = false,
    cameraFov = 60,
    cameraNear = 1,
    cameraFar = 500,
    fogNear = 120,
    fogFar = 320,
    backgroundColor = "#ffffff",
    fogColor = "#ffffff",
}: InfiniteCanvasProps) {
    if (typeof window === "undefined") return null;

    const dpr = Math.min(window.devicePixelRatio || 1);

    if (!media.length) return null;

    return (
        <div className={styles.container}>
            <Canvas
                camera={{
                    position: [0, 0, INITIAL_CAMERA_Z],
                    fov: cameraFov,
                    near: cameraNear,
                    far: cameraFar,
                }}
                dpr={dpr}
                flat
                gl={{ antialias: false, powerPreference: "high-performance" }}
                className={styles.canvas}
            >
                <color attach="background" args={[backgroundColor]} />
                <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
                <SceneContent media={media} onTextureProgress={onTextureProgress} />
                {showFps && <Stats className={styles.stats} />}
            </Canvas>
        </div>
    );
}
