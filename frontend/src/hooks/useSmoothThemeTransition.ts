"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";
import { useTheme } from "./useTheme";

const LIGHT_COLOR = "#ffffff";
const DARK_COLOR = "#0a0a0a";

function getInitialColor() {
    if (typeof document === "undefined") return LIGHT_COLOR;
    return document.documentElement.classList.contains("dark") ? DARK_COLOR : LIGHT_COLOR;
}

/**
 * Smoothly transitions Three.js scene background and fog colors
 * when the theme changes between light and dark mode.
 *
 * This hook uses useTheme internally and runs the animation
 * entirely within Three.js (no React re-renders during transition).
 *
 * @param lerpFactor - Speed of transition (0.01 = slow, 0.2 = fast). Default: 0.15
 *
 * @example
 * ```tsx
 * function Scene() {
 *   useSmoothThemeTransition();
 *   // ... rest of scene
 * }
 * ```
 */
export function useSmoothThemeTransition(lerpFactor = 0.15) {
    const { scene } = useThree();
    const theme = useTheme();

    const initialColor = getInitialColor();
    const targetColor = React.useRef(new THREE.Color(initialColor));
    const currentColor = React.useRef(new THREE.Color(initialColor));

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
