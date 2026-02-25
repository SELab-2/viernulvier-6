"use client";

import { Hero } from "@/components/sections";
import { InfiniteCanvas } from "@/components/sections/infinite-canvas";
import * as React from "react";
import type { MediaItem } from "@/components/sections/infinite-canvas";

export default function HomePage() {
    const [media, setMedia] = React.useState<MediaItem[]>([]);
    const [, setTextureProgress] = React.useState(0);
    const [isDark, setIsDark] = React.useState(false);

    // Fetch manifest
    React.useEffect(() => {
        fetch("/data/artworks-manifest.json")
            .then((res) => res.json())
            .then((data) => setMedia(data))
            .catch((err) => console.error("Failed to load manifest:", err));
    }, []);

    // Theme detection
    React.useEffect(() => {
        const checkTheme = () => {
            const isDarkMode = document.documentElement.classList.contains("dark");
            setIsDark(isDarkMode);
        };

        checkTheme();

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

    const backgroundColor = isDark ? "#0a0a0a" : "#fafafa";
    const fogColor = isDark ? "#0a0a0a" : "#fafafa";

    if (!media.length) return null;

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
