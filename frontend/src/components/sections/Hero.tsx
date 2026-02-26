"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTheme } from "@/hooks/useTheme";

export const Hero = () => {
    const t = useTranslations("Hero");
    const tNav = useTranslations("Navigation");
    const theme = useTheme(); // "light" | "dark" - use with transition-colors for smooth theme switch

    return (
        <section
            className={cn(
                "relative h-screen w-full",
                "flex flex-col items-center justify-center",
                "overflow-hidden"
            )}
        >
            {/* Animated background layers - uses CSS transition for smooth theme switch */}
            <div
                className="absolute inset-0 -z-10 transition-colors duration-500"
                data-theme={theme}
            >
                {/* Slow moving gradient orbs */}
                <div
                    className={cn(
                        "absolute top-[-20%] right-[-10%]",
                        "h-[60vw] w-[60vw] rounded-full",
                        "from-primary/70 dark:from-primary/20 via-primary/30 dark:via-primary/5 bg-gradient-to-br to-transparent",
                        "blur-[100px]",
                        "animate-drift-slow"
                    )}
                    style={{ animationDelay: "0s" }}
                />
                <div
                    className={cn(
                        "absolute bottom-[-30%] left-[-20%]",
                        "h-[70vw] w-[70vw] rounded-full",
                        "from-accent/80 dark:from-accent/25 via-muted/90 dark:via-muted/30 bg-gradient-to-tr to-transparent",
                        "blur-[120px]",
                        "animate-drift-slower"
                    )}
                    style={{ animationDelay: "-5s" }}
                />
                <div
                    className={cn(
                        "absolute top-[40%] left-[30%]",
                        "h-[30vw] w-[30vw] rounded-full",
                        "from-foreground/50 dark:from-foreground/10 bg-gradient-to-b to-transparent",
                        "blur-[80px]",
                        "animate-drift-medium"
                    )}
                    style={{ animationDelay: "-3s" }}
                />
            </div>

            {/* Vertical line */}
            <div
                className={cn(
                    "absolute top-0 left-1/2 -translate-x-1/2",
                    "h-[12vh] w-px",
                    "from-border via-border/70 bg-gradient-to-b to-transparent",
                    "animate-grow-down"
                )}
            />

            {/* Main content */}
            <div className="relative z-10 flex flex-col items-center px-6 text-center">
                {/* Brand - groter */}
                <span
                    className={cn(
                        "mb-6 text-xs font-medium tracking-[0.3em] uppercase md:text-sm",
                        "text-muted-foreground/70",
                        "animate-fade-in"
                    )}
                >
                    VierNulVier
                </span>

                {/* Title with < > brackets */}
                <div className="relative mb-8 flex items-center justify-center">
                    {/* Left bracket */}
                    <span
                        className={cn(
                            "absolute -left-8 md:-left-20",
                            "flex h-full items-center",
                            "text-3xl leading-none font-light md:text-6xl",
                            "text-muted-foreground/20",
                            "hidden sm:flex",
                            "animate-bracket-left"
                        )}
                    >
                        &#x276E;
                    </span>

                    {/* Right bracket */}
                    <span
                        className={cn(
                            "absolute -right-8 md:-right-20",
                            "flex h-full items-center",
                            "text-3xl leading-none font-light md:text-6xl",
                            "text-muted-foreground/20",
                            "hidden sm:flex",
                            "animate-bracket-right"
                        )}
                    >
                        &#x276F;
                    </span>

                    {/* Main title with glow effect */}
                    <h1
                        className={cn(
                            "relative text-6xl md:text-8xl lg:text-9xl",
                            "font-light tracking-tight",
                            "text-foreground",
                            "animate-fade-in-up animate-title-glow"
                        )}
                        style={{ animationDelay: "0.1s" }}
                    >
                        Archief
                    </h1>
                </div>

                {/* Divider */}
                <div
                    className={cn("bg-border/60 mb-8 h-px w-16", "animate-scale-x")}
                    style={{ animationDelay: "0.3s" }}
                />

                {/* Subtitle */}
                <p
                    className={cn(
                        "max-w-sm md:max-w-md",
                        "text-sm md:text-base",
                        "text-muted-foreground leading-relaxed font-light",
                        "mb-12",
                        "animate-fade-in-up"
                    )}
                    style={{ animationDelay: "0.4s" }}
                >
                    {t("subtitle")}
                </p>

                {/* CTA */}
                <Link
                    href="#"
                    className={cn(
                        "group inline-flex items-center gap-2",
                        "px-6 py-3",
                        "border-border/60 rounded-full border",
                        "text-[11px] font-medium tracking-[0.15em] uppercase",
                        "text-muted-foreground hover:text-foreground hover:border-foreground/30",
                        "transition-all duration-500 ease-out",
                        "hover:shadow-foreground/5 hover:scale-[1.02] hover:shadow-lg",
                        "animate-fade-in-up"
                    )}
                    style={{ animationDelay: "0.5s" }}
                >
                    {tNav("archive")}
                    <ArrowRight
                        className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5"
                        strokeWidth={2}
                    />
                </Link>
            </div>

            {/* Bottom */}
            <div
                className={cn(
                    "absolute bottom-8 left-1/2 -translate-x-1/2",
                    "font-mono text-[10px] tracking-widest",
                    "text-muted-foreground/50",
                    "animate-fade-in"
                )}
                style={{ animationDelay: "0.6s" }}
            >
                404
            </div>
        </section>
    );
};
