"use client";

import { useFrame } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";
import {
    CHUNK_FADE_MARGIN,
    DEPTH_FADE_END,
    DEPTH_FADE_START,
    INVIS_THRESHOLD,
    RENDER_DISTANCE,
} from "../lib/constants";
import { loadTexture } from "../lib/texture-loader";
import { lerp } from "../lib/math-utils";
import type { MediaItem } from "../lib/types";

const PLANE_GEOMETRY = new THREE.PlaneGeometry(1, 1);

type CameraState = {
    cx: number;
    cy: number;
    cz: number;
    camZ: number;
};

type MediaPlaneProps = {
    position: THREE.Vector3;
    scale: THREE.Vector3;
    media: MediaItem;
    chunkCx: number;
    chunkCy: number;
    chunkCz: number;
    cameraRef: React.RefObject<CameraState>;
};

export function MediaPlane({
    position,
    scale,
    media,
    chunkCx,
    chunkCy,
    chunkCz,
    cameraRef,
}: MediaPlaneProps) {
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

        const cam = cameraRef.current;
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

        const tex = loadTexture(media, () => {
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
