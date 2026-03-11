"use client";

import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";

export interface HeroProps {
    brand: string;
    title: string;
    subtitle: string;
    ctaText: string;
    ctaHref: string;
    className?: string;
}

export const Hero = ({ brand, title, subtitle, ctaText, ctaHref, className }: HeroProps) => {
    return (
        <section
            className={cn(
                "absolute inset-0",
                "flex flex-col items-center justify-center",
                className
            )}
        >
            {/* Vertical line */}
            <div
                className={cn(
                    "absolute top-0 left-1/2 -translate-x-1/2",
                    "h-[12vh] w-px",
                    "from-border via-border/70 bg-gradient-to-b to-transparent"
                )}
            />

            {/* Main content */}
            <div className="relative z-10 flex flex-col items-center px-6 text-center">
                {/* Brand */}
                <span
                    className={cn(
                        "mb-6 text-xs font-medium tracking-[0.3em] uppercase md:text-sm",
                        "text-muted-foreground/70"
                    )}
                >
                    {brand}
                </span>

                {/* Title with decorative brackets */}
                <div className="relative mb-8 flex items-center justify-center">
                    <span
                        className={cn(
                            "absolute -left-8 md:-left-20",
                            "flex h-full items-center",
                            "text-3xl leading-none font-light md:text-6xl",
                            "text-muted-foreground/20",
                            "hidden sm:flex"
                        )}
                        aria-hidden="true"
                    >
                        ❮
                    </span>

                    <span
                        className={cn(
                            "absolute -right-8 md:-right-20",
                            "flex h-full items-center",
                            "text-3xl leading-none font-light md:text-6xl",
                            "text-muted-foreground/20",
                            "hidden sm:flex"
                        )}
                        aria-hidden="true"
                    >
                        ❯
                    </span>

                    <h1
                        className={cn(
                            "relative text-6xl md:text-8xl lg:text-9xl",
                            "font-light tracking-tight",
                            "text-foreground"
                        )}
                    >
                        {title}
                    </h1>
                </div>

                {/* Divider */}
                <div className={cn("bg-border/60 mb-8 h-px w-16")} />

                {/* Subtitle */}
                <p
                    className={cn(
                        "max-w-sm md:max-w-md",
                        "text-sm md:text-base",
                        "text-muted-foreground leading-relaxed font-light",
                        "mb-12"
                    )}
                >
                    {subtitle}
                </p>

                {/* CTA Button */}
                <Link
                    href={ctaHref}
                    className={cn(
                        "group inline-flex items-center gap-2",
                        "px-6 py-3",
                        "border-border/60 rounded-full border",
                        "text-[11px] font-medium tracking-[0.15em] uppercase",
                        "text-muted-foreground hover:text-foreground hover:border-foreground/30",
                        "transition-all duration-300"
                    )}
                >
                    {ctaText}
                    <ArrowRight
                        className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5"
                        strokeWidth={2}
                    />
                </Link>
            </div>
        </section>
    );
};
