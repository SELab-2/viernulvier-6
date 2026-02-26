"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";
import { useTheme } from "./useTheme";

const LIGHT_COLOR = "#fafafa";
const DARK_COLOR = "#0a0a0a";
const DEFAULT_LERP_FACTOR = 0.08;

/**
 * Smoothly transitions Three.js scene background and fog colors
 * when the theme changes between light and dark mode.
 *
 * This hook uses useTheme internally and runs the animation
 * entirely within Three.js (no React re-renders during transition).
 *
 * @param lerpFactor - Speed of transition (0.01 = slow, 0.2 = fast). Default: 0.08
 *
 * @example
 * ```tsx
 * function Scene() {
 *   useSmoothThemeTransition();
 *   // ... rest of scene
 * }
 * ```
 */
export function useSmoothThemeTransition(lerpFactor = DEFAULT_LERP_FACTOR) {
    const { scene } = useThree();
    const theme = useTheme();

    const targetColor = React.useRef(new THREE.Color(LIGHT_COLOR));
    const currentColor = React.useRef(new THREE.Color(LIGHT_COLOR));

    // Update target color when theme changes
    React.useEffect(() => {
        targetColor.current.set(theme === "dark" ? DARK_COLOR : LIGHT_COLOR);
    }, [theme]);

    // Smooth color interpolation - runs every frame but no React overhead
    useFrame(() => {
        currentColor.current.lerp(targetColor.current, lerpFactor);

        if (scene.background instanceof THREE.Color) {
            scene.background.copy(currentColor.current);
        }
        if (scene.fog instanceof THREE.Fog) {
            scene.fog.color.copy(currentColor.current);
        }
    });
}
