"use client";

import { Stats, useProgress } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";
import {
    AUTO_DRIFT_SPEED,
    CHUNK_FADE_MARGIN,
    CHUNK_OFFSETS,
    CHUNK_SIZE,
    DEPTH_FADE_END,
    DEPTH_FADE_START,
    INITIAL_CAMERA_Z,
    INVIS_THRESHOLD,
    RENDER_DISTANCE,
} from "./constants";
import styles from "./style.module.css";
import { getTexture } from "./texture-manager";
import type { ChunkData, InfiniteCanvasProps, MediaItem, PlaneData } from "./types";
import { generateChunkPlanesCached, shouldThrottleUpdate } from "./utils";

const PLANE_GEOMETRY = new THREE.PlaneGeometry(1, 1);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function MediaPlane({
    position,
    scale,
    media,
    chunkCx,
    chunkCy,
    chunkCz,
    cameraGridRef,
}: {
    position: THREE.Vector3;
    scale: THREE.Vector3;
    media: MediaItem;
    chunkCx: number;
    chunkCy: number;
    chunkCz: number;
    cameraGridRef: React.RefObject<{ cx: number; cy: number; cz: number; camZ: number }>;
}) {
    const meshRef = React.useRef<THREE.Mesh>(null);
    const materialRef = React.useRef<THREE.MeshBasicMaterial>(null);
    const localState = React.useRef({ opacity: 0, frame: 0, ready: false });

    const [texture, setTexture] = React.useState<THREE.Texture | null>(null);
    const [isReady, setIsReady] = React.useState(false);

    useFrame(() => {
        const material = materialRef.current;
        const mesh = meshRef.current;
        const state = localState.current;

        if (!material || !mesh) return;

        state.frame = (state.frame + 1) & 1;
        if (state.opacity < INVIS_THRESHOLD && !mesh.visible && state.frame === 0) return;

        const cam = cameraGridRef.current;
        const dist = Math.max(
            Math.abs(chunkCx - cam.cx),
            Math.abs(chunkCy - cam.cy),
            Math.abs(chunkCz - cam.cz)
        );
        const absDepth = Math.abs(position.z - cam.camZ);

        if (absDepth > DEPTH_FADE_END + 50) {
            state.opacity = 0;
            material.opacity = 0;
            material.depthWrite = false;
            mesh.visible = false;
            return;
        }

        const gridFade =
            dist <= RENDER_DISTANCE
                ? 1
                : Math.max(0, 1 - (dist - RENDER_DISTANCE) / Math.max(CHUNK_FADE_MARGIN, 0.0001));

        const depthFade =
            absDepth <= DEPTH_FADE_START
                ? 1
                : Math.max(
                      0,
                      1 -
                          (absDepth - DEPTH_FADE_START) /
                              Math.max(DEPTH_FADE_END - DEPTH_FADE_START, 0.0001)
                  );

        const target = Math.min(gridFade, depthFade * depthFade);

        state.opacity =
            target < INVIS_THRESHOLD && state.opacity < INVIS_THRESHOLD
                ? 0
                : lerp(state.opacity, target, 0.18);

        const isFullyOpaque = state.opacity > 0.99;
        material.opacity = isFullyOpaque ? 1 : state.opacity;
        material.depthWrite = isFullyOpaque;
        mesh.visible = state.opacity > INVIS_THRESHOLD;
    });

    const displayScale = React.useMemo(() => {
        if (media.width && media.height) {
            const aspect = media.width / media.height;
            return new THREE.Vector3(scale.y * aspect, scale.y, 1);
        }
        return scale;
    }, [media.width, media.height, scale]);

    React.useEffect(() => {
        const state = localState.current;
        state.ready = false;
        state.opacity = 0;
        setIsReady(false);

        const material = materialRef.current;
        if (material) {
            material.opacity = 0;
            material.depthWrite = false;
            material.map = null;
        }

        const tex = getTexture(media, () => {
            state.ready = true;
            setIsReady(true);
        });
        setTexture(tex);
    }, [media]);

    React.useEffect(() => {
        const material = materialRef.current;
        const mesh = meshRef.current;
        const state = localState.current;

        if (!material || !mesh || !texture || !isReady || !state.ready) return;

        material.map = texture;
        material.opacity = state.opacity;
        material.depthWrite = state.opacity >= 1;
        mesh.scale.copy(displayScale);
    }, [displayScale, texture, isReady]);

    if (!texture || !isReady) return null;

    return (
        <mesh
            ref={meshRef}
            position={position}
            scale={displayScale}
            visible={false}
            geometry={PLANE_GEOMETRY}
        >
            <meshBasicMaterial ref={materialRef} transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>
    );
}

function Chunk({
    cx,
    cy,
    cz,
    media,
    cameraGridRef,
}: {
    cx: number;
    cy: number;
    cz: number;
    media: MediaItem[];
    cameraGridRef: React.RefObject<{ cx: number; cy: number; cz: number; camZ: number }>;
}) {
    const [planes, setPlanes] = React.useState<PlaneData[] | null>(null);

    React.useEffect(() => {
        let canceled = false;
        const run = () => !canceled && setPlanes(generateChunkPlanesCached(cx, cy, cz));

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
                        cameraGridRef={cameraGridRef}
                    />
                );
            })}
        </group>
    );
}

function SceneController({
    media,
    onTextureProgress,
}: {
    media: MediaItem[];
    onTextureProgress?: (progress: number) => void;
}) {
    const { camera } = useThree();

    const pos = React.useRef({ x: 0, y: 0, z: INITIAL_CAMERA_Z });
    const cameraGridRef = React.useRef({ cx: 0, cy: 0, cz: 0, camZ: INITIAL_CAMERA_Z });
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

        cameraGridRef.current = { cx, cy, cz, camZ: pos.current.z };

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
                    cameraGridRef={cameraGridRef}
                />
            ))}
        </>
    );
}

export function InfiniteCanvasScene({
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
    if (typeof window === "undefined") return;

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
                <SceneController media={media} onTextureProgress={onTextureProgress} />
                {showFps && <Stats className={styles.stats} />}
            </Canvas>
        </div>
    );
}
