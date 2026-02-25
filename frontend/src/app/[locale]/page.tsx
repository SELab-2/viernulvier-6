"use client";

import { Hero } from "@/components/sections";
import { InfiniteCanvas } from "@/components/sections/infinite-canvas";
import * as React from "react";
import type { MediaItem } from "@/components/sections/infinite-canvas";
import manifest from "@/data/artworks-manifest.json";

export default function HomePage() {
    const [media] = React.useState<MediaItem[]>(manifest);
    const [, setTextureProgress] = React.useState(0);

    // Lees thema direct uit DOM om flicker/SSR issues te vermijden
    const [isDark, setIsDark] = React.useState(false);

    React.useEffect(() => {
        // Check initiële thema
        const checkTheme = () => {
            const isDarkMode = document.documentElement.classList.contains("dark");
            setIsDark(isDarkMode);
        };

        checkTheme();

        // Observeer thema veranderingen
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === "class") {
                    checkTheme();
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });

        return () => observer.disconnect();
    }, []);

    // Dynamische kleuren gebaseerd op thema
    const backgroundColor = isDark ? "#0a0a0a" : "#fafafa";
    const fogColor = isDark ? "#0a0a0a" : "#fafafa";

    return (
        <main className="h-screen overflow-hidden">
            <InfiniteCanvas
                key={isDark ? "dark" : "light"}
                media={media}
                onTextureProgress={setTextureProgress}
                backgroundColor={backgroundColor}
                fogColor={fogColor}
            />
            <Hero />
        </main>
    );
}
