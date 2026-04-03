"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { FileUp, Database, Clapperboard, MapPin, Newspaper, Users } from "lucide-react";

import { SectionCard, SectionCardContent } from "@/components/cms/SectionCard";

interface ContentSection {
    key: string;
    href: string;
    edition: string;
    span: string;
    icon: typeof Clapperboard;
    comingSoon?: boolean;
}

const CONTENT_SECTIONS: ContentSection[] = [
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
];

interface UtilitySection {
    key: string;
    href: string;
    icon: typeof Database;
    edition: string;
}

const UTILITY_SECTIONS: UtilitySection[] = [
    {
        key: "ingest",
        href: "/cms/ingest",
        icon: Database,
        edition: "Ed. 05",
    },
    {
        key: "import",
        href: "/cms/import",
        icon: FileUp,
        edition: "Ed. 06",
    },
];

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
            // Set initial state before animating to avoid hydration mismatch
            cards.forEach((card) => {
                (card as HTMLElement).style.opacity = "0";
                (card as HTMLElement).style.transform = "translateY(16px)";
            });
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
        <div className="flex flex-col px-4 py-6 sm:px-6 sm:py-8">
            {/* Header */}
            <header
                ref={headerRef}
                className="border-foreground/10 mx-auto mb-6 w-full max-w-7xl border-b-2 pb-6 text-center opacity-0 sm:mb-8"
            >
                <h1 className="font-display text-foreground mb-2 text-[36px] font-black tracking-tight uppercase sm:text-[42px] lg:text-[56px]">
                    {t("title")}
                </h1>
                <div className="bg-foreground mx-auto h-0.5 w-20 sm:w-24" />
            </header>

            {/* Main Content */}
            <div ref={containerRef} className="mx-auto w-full max-w-7xl">
                {/* Content Sections Grid */}
                <div className="grid grid-cols-1 gap-4 p-4 sm:gap-6 lg:grid-cols-12">
                    {CONTENT_SECTIONS.map((section) => (
                        <SectionCard
                            key={section.key}
                            href={section.href}
                            className={`border-foreground/10 hover:border-foreground/30 group relative flex flex-col overflow-hidden border p-4 transition-colors duration-250 sm:p-5 ${section.span}`}
                        >
                            <div data-card>
                                <SectionCardContent
                                    edition={section.edition}
                                    title={t(section.key)}
                                    description={t(`${section.key}Description`)}
                                    actionLabel={t("openSection")}
                                    icon={section.icon}
                                    comingSoon={section.comingSoon}
                                />
                            </div>
                        </SectionCard>
                    ))}
                </div>

                {/* Utility Sections - Ingest & Import */}
                <div className="border-foreground/10 mx-auto mt-6 grid w-full max-w-7xl grid-cols-1 gap-4 border-t p-4 pt-6 sm:mt-8 sm:grid-cols-2 sm:gap-6">
                    {UTILITY_SECTIONS.map((util) => (
                        <SectionCard
                            key={util.key}
                            href={util.href}
                            className="border-foreground/10 hover:border-foreground/30 group relative flex flex-col overflow-hidden border p-4 transition-colors duration-250 sm:p-5"
                        >
                            <div data-card>
                                <SectionCardContent
                                    edition={util.edition}
                                    title={t(util.key)}
                                    description={t(`${util.key}Description`)}
                                    actionLabel={t("openSection")}
                                    icon={util.icon}
                                />
                            </div>
                        </SectionCard>
                    ))}
                </div>
            </div>
        </div>
    );
}
