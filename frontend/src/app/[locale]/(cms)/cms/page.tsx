"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useUser } from "@/hooks/useAuth";
import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";

const SECTIONS = [
    {
        key: "productions",
        href: "/cms/productions",
        count: 1240,
        edition: "Ed. 01",
        comingSoon: false,
    },
    {
        key: "locations",
        href: "/cms/locations",
        count: 8,
        edition: "Ed. 02",
        comingSoon: false,
    },
    {
        key: "articles",
        href: "/cms/articles",
        count: 0,
        edition: "Ed. 03",
        comingSoon: true,
    },
    {
        key: "performers",
        href: "/cms/performers",
        count: 0,
        edition: "Ed. 04",
        comingSoon: true,
    },
] as const;

// Card component with hover animation
function SectionCard({
    children,
    href,
    className = "",
}: {
    children: React.ReactNode;
    href: string;
    className?: string;
}) {
    const cardRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        const card = cardRef.current;
        if (!card) return;

        const handleEnter = () => {
            animate(card, {
                translateY: -3,
                ease: "outQuad",
                duration: 250,
            });
        };

        const handleLeave = () => {
            animate(card, {
                translateY: 0,
                ease: "outQuad",
                duration: 250,
            });
        };

        card.addEventListener("mouseenter", handleEnter);
        card.addEventListener("mouseleave", handleLeave);

        return () => {
            card.removeEventListener("mouseenter", handleEnter);
            card.removeEventListener("mouseleave", handleLeave);
        };
    }, []);

    return (
        <Link ref={cardRef} href={href} className={className}>
            {children}
        </Link>
    );
}

export default function CmsOverviewPage() {
    const t = useTranslations("Cms.Overview");
    const { data: user } = useUser();
    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        // Header fade in
        if (headerRef.current) {
            animate(headerRef.current, {
                opacity: [0, 1],
                translateY: [-10, 0],
                ease: "outQuad",
                duration: 600,
            });
        }

        // Cards stagger animation
        if (containerRef.current) {
            const cards = containerRef.current.querySelectorAll("[data-card]");
            animate(cards, {
                opacity: [0, 1],
                translateY: [16, 0],
                ease: "outQuad",
                duration: 500,
                delay: stagger(80, { start: 200 }),
            });
        }
    }, []);

    const today = new Date().toLocaleDateString("nl-BE", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <div className="px-6 py-8">
            {/* Newspaper Masthead */}
            <header
                ref={headerRef}
                className="border-foreground/10 mb-8 border-b-2 pb-6 text-center opacity-0"
            >
                <div className="text-muted-foreground mb-3 flex items-center justify-center gap-4 font-mono text-[9px] tracking-[2px] uppercase">
                    <span>Sint-Pietersnieuwstraat 23, Gent</span>
                    <span className="bg-border h-3 w-px" />
                    <span>{today}</span>
                </div>

                <h1 className="font-display text-foreground mb-2 text-[42px] font-black tracking-tight uppercase sm:text-[56px]">
                    {t("title")}
                </h1>

                <div className="bg-foreground mx-auto mb-4 h-0.5 w-24" />

                <p className="text-muted-foreground font-body mx-auto max-w-md text-sm italic">
                    {t("subtitle")}
                </p>

                {/* Dateline bar */}
                <div className="border-foreground/20 text-muted-foreground mt-6 flex items-center justify-between border-y py-1.5 font-mono text-[9px] tracking-[1.5px] uppercase">
                    <span>Admin Console</span>
                    <span className="text-foreground font-medium">{user?.role || "Editor"}</span>
                    <span>{user?.email || "admin@viernulvier.be"}</span>
                </div>
            </header>

            {/* Main Content Grid - Magazine Layout */}
            <div
                ref={containerRef}
                className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-12"
            >
                {/* Featured Section - Productions (takes 8 cols) */}
                <SectionCard
                    href="/cms/productions"
                    className="border-foreground/10 hover:border-foreground/30 group relative border-2 p-6 transition-colors duration-250 lg:col-span-8"
                >
                    <div data-card className="opacity-0">
                        <div className="text-muted-foreground mb-4 flex items-center justify-between font-mono text-[9px] tracking-[1.4px] uppercase">
                            <span>Ed. 01 — Uitgave A</span>
                            <span className="text-foreground bg-foreground/10 px-2 py-0.5">
                                1,240 items
                            </span>
                        </div>

                        <h2 className="font-display text-foreground mb-3 text-[32px] leading-[1.1] font-bold tracking-tight sm:text-[40px]">
                            {t("productions")}
                        </h2>

                        <div className="bg-foreground mb-4 h-0.5 w-16" />

                        <p className="text-muted-foreground font-body mb-6 max-w-md text-sm leading-relaxed">
                            {t("productionsDescription")}. Beheer het volledige archief van
                            voorstellingen, concerten en evenementen sinds 1883.
                        </p>

                        <div className="text-muted-foreground font-mono text-[9px] tracking-[1.4px] uppercase">
                            <span className="text-foreground inline-block transition-transform duration-200 group-hover:translate-x-1">
                                →
                            </span>{" "}
                            {t("openSection")}
                        </div>

                        {/* Decorative corner */}
                        <div className="border-foreground/10 absolute top-0 right-0 h-8 w-8 border-b border-l" />
                    </div>
                </SectionCard>

                {/* Secondary Section - Locations (takes 4 cols) */}
                <SectionCard
                    href="/cms/locations"
                    className="border-foreground/10 hover:border-foreground/30 group flex flex-col justify-between border p-5 transition-colors duration-250 lg:col-span-4"
                >
                    <div data-card className="opacity-0">
                        <div>
                            <div className="text-muted-foreground mb-3 font-mono text-[9px] tracking-[1.4px] uppercase">
                                Ed. 02 — Uitgave B
                            </div>

                            <h2 className="font-display text-foreground mb-2 text-[24px] font-bold tracking-tight">
                                {t("locations")}
                            </h2>

                            <div className="bg-foreground mb-3 h-0.5 w-10" />

                            <p className="text-muted-foreground font-body text-sm leading-relaxed">
                                {t("locationsDescription")}
                            </p>
                        </div>

                        <div className="text-muted-foreground mt-4 flex items-center justify-between font-mono text-[9px] tracking-[1.4px] uppercase">
                            <span>8 items</span>
                            <span className="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                →
                            </span>
                        </div>
                    </div>
                </SectionCard>

                {/* Bottom Row - Articles & Performers */}
                {SECTIONS.slice(2).map((section) => (
                    <SectionCard
                        key={section.key}
                        href={section.href}
                        className="border-foreground/10 hover:border-foreground/30 group relative overflow-hidden border p-5 transition-colors duration-250 lg:col-span-6"
                    >
                        <div data-card className="opacity-0">
                            {section.comingSoon && (
                                <div className="bg-foreground/5 text-muted-foreground absolute top-0 right-0 px-2 py-1 font-mono text-[8px] tracking-[1px] uppercase">
                                    Binnenkort
                                </div>
                            )}

                            <div className="text-muted-foreground mb-3 font-mono text-[9px] tracking-[1.4px] uppercase">
                                {section.edition}
                            </div>

                            <h2 className="font-display text-foreground mb-2 text-[20px] font-bold tracking-tight">
                                {t(section.key)}
                            </h2>

                            <p className="text-muted-foreground font-body text-sm">
                                {t(`${section.key}Description`)}
                            </p>

                            <div className="text-muted-foreground mt-4 font-mono text-[9px] tracking-[1.4px] uppercase opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                → {t("openSection")}
                            </div>
                        </div>
                    </SectionCard>
                ))}
            </div>

            {/* Footer - Newspaper style */}
            <footer className="border-foreground/10 text-muted-foreground mt-12 border-t pt-4 text-center font-mono text-[9px] tracking-[1.4px] uppercase">
                <div className="mb-2 flex items-center justify-center gap-6">
                    <span>VIERNULVIER ARCHIEF</span>
                    <span className="bg-border h-3 w-px" />
                    <span>CMS v1.0</span>
                    <span className="bg-border h-3 w-px" />
                    <span>{user?.role || "Editor"} Access</span>
                </div>
                <div className="text-muted-foreground/60 text-[8px]">
                    © {new Date().getFullYear()} Kunstencentrum VIERNULVIER vzw — Alle rechten
                    voorbehouden
                </div>
            </footer>
        </div>
    );
}
