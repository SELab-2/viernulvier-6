"use client";

import { useTranslations } from "next-intl";

export function Footer() {
    const generalTranslations = useTranslations("General");

    return (
        <footer className="border-border bg-background/80 border-t backdrop-blur-md transition-colors duration-300">
            <div className="container mx-auto px-6 lg:px-8">
                <div className="flex items-center justify-between py-6">
                    <span className="text-muted-foreground font-mono text-xs tracking-widest transition-colors duration-300">
                        © {new Date().getFullYear()}
                    </span>
                    <span className="text-muted-foreground font-mono text-xs tracking-widest transition-colors duration-300">
                        {generalTranslations("projectName")}
                    </span>
                </div>
            </div>
        </footer>
    );
}
