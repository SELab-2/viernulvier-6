"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { FileUp, Database, Clapperboard, MapPin, Newspaper, Users } from "lucide-react";

const CONTENT_SECTIONS = [
    {
        key: "productions",
        href: "/cms/productions",
        edition: "Ed. 01",
        span: "lg:col-span-8",
        icon: Clapperboard,
    },
    {
        key: "locations",
        href: "/cms/locations",
        edition: "Ed. 02",
        span: "lg:col-span-4",
        icon: MapPin,
    },
    {
        key: "articles",
        href: "/cms/articles",
        edition: "Ed. 03",
        span: "lg:col-span-6",
        comingSoon: true,
        icon: Newspaper,
    },
    {
        key: "performers",
        href: "/cms/performers",
        edition: "Ed. 04",
        span: "lg:col-span-6",
        comingSoon: true,
        icon: Users,
    },
] as const;

const UTILITY_SECTIONS = [
    {
        key: "ingest",
        href: "/cms/ingest",
        icon: Database,
    },
    {
        key: "import",
        href: "/cms/import",
        icon: FileUp,
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
                scale: 1.01,
                ease: "outQuad",
                duration: 200,
            });
        };

        const handleLeave = () => {
            animate(card, {
                scale: 1,
                ease: "outQuad",
                duration: 200,
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
    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (headerRef.current) {
            animate(headerRef.current, {
                opacity: [0, 1],
                translateY: [-10, 0],
                ease: "outQuad",
                duration: 600,
            });
        }

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

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col px-4 py-6 sm:px-6 sm:py-8">
            {/* Header */}
            <header
                ref={headerRef}
                className="border-foreground/10 mx-auto mb-6 w-full max-w-7xl shrink-0 border-b-2 pb-6 text-center opacity-0 sm:mb-8"
            >
                <h1 className="font-display text-foreground mb-2 text-[36px] font-black tracking-tight uppercase sm:text-[42px] lg:text-[56px]">
                    {t("title")}
                </h1>
                <div className="bg-foreground mx-auto h-0.5 w-20 sm:w-24" />
            </header>

            {/* Main Content - scrollable */}
            <div className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto">
                {/* Content Sections Grid */}
                <div
                    ref={containerRef}
                    className="grid grid-cols-1 gap-4 p-4 sm:gap-6 lg:grid-cols-12"
                >
                    {CONTENT_SECTIONS.map((section) => (
                        <SectionCard
                            key={section.key}
                            href={section.href}
                            className={`border-foreground/10 hover:border-foreground/30 group relative flex flex-col overflow-hidden border p-4 transition-colors duration-250 sm:p-5 ${section.span}`}
                        >
                            <div data-card className="flex flex-col opacity-0">
                                <div className="flex items-start justify-between">
                                    <div className="text-muted-foreground mb-3 font-mono text-[9px] tracking-[1.4px] uppercase">
                                        {section.edition}
                                    </div>
                                    <section.icon className="text-muted-foreground/40 group-hover:text-foreground h-5 w-5 transition-colors duration-200" />
                                </div>

                                {section.comingSoon && (
                                    <div className="mb-2 inline-flex">
                                        <span className="bg-foreground/10 text-foreground/70 px-1.5 py-0.5 font-mono text-[9px] tracking-[1px]">
                                            Binnenkort
                                        </span>
                                    </div>
                                )}

                                <h2 className="font-display text-foreground mb-2 text-[24px] font-bold tracking-tight sm:text-[26px]">
                                    {t(section.key)}
                                </h2>

                                <div className="bg-foreground mb-3 h-0.5 w-12" />

                                <p className="text-muted-foreground font-body text-sm leading-relaxed">
                                    {t(`${section.key}Description`)}
                                </p>

                                <div className="text-muted-foreground mt-4 font-mono text-[9px] tracking-[1.4px] uppercase opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                    <span className="text-foreground inline-block transition-transform duration-200 group-hover:translate-x-1">
                                        →
                                    </span>{" "}
                                    {t("openSection")}
                                </div>
                            </div>
                        </SectionCard>
                    ))}
                </div>

                {/* Utility Sections - Ingest & Import */}
                <div className="border-foreground/10 mx-auto mt-6 grid w-full max-w-2xl grid-cols-1 gap-3 border-t pt-6 sm:mt-8 sm:grid-cols-2 sm:gap-4">
                    {UTILITY_SECTIONS.map((util) => (
                        <SectionCard
                            key={util.key}
                            href={util.href}
                            className="border-foreground/10 hover:border-foreground/30 group relative flex flex-col overflow-hidden border p-4 transition-colors duration-250 sm:p-5"
                        >
                            <div className="flex flex-col">
                                <div className="flex items-start justify-between">
                                    <div className="text-muted-foreground mb-3 font-mono text-[9px] tracking-[1.4px] uppercase">
                                        {t(util.key)}
                                    </div>
                                    <util.icon className="text-muted-foreground/40 group-hover:text-foreground h-5 w-5 transition-colors duration-200" />
                                </div>

                                <h2 className="font-display text-foreground mb-2 text-[20px] font-bold tracking-tight">
                                    {t(util.key)}
                                </h2>

                                <div className="bg-foreground mb-3 h-0.5 w-10" />

                                <p className="text-muted-foreground font-body text-sm leading-relaxed">
                                    {t(`${util.key}Description`)}
                                </p>

                                <div className="text-muted-foreground mt-4 font-mono text-[9px] tracking-[1.4px] uppercase opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                    <span className="text-foreground inline-block transition-transform duration-200 group-hover:translate-x-1">
                                        →
                                    </span>{" "}
                                    {t("openSection")}
                                </div>
                            </div>
                        </SectionCard>
                    ))}
                </div>
            </div>
        </div>
    );
}
