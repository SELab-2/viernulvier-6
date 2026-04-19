"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import {
    FileUp,
    Database,
    Clapperboard,
    MapPin,
    Newspaper,
    Users,
    FolderArchive,
    TriangleAlert,
} from "lucide-react";

import { SectionCard, SectionCardContent } from "@/components/cms/SectionCard";
import { useGetStats } from "@/hooks/api/useStats";

interface ContentSection {
    key: string;
    href: string;
    editionKey: string;
    span: string;
    icon: typeof Clapperboard;
    comingSoon?: boolean;
}

const CONTENT_SECTIONS: ContentSection[] = [
    {
        key: "productions",
        href: "/cms/productions",
        editionKey: "edition1",
        span: "lg:col-span-8",
        icon: Clapperboard,
    },
    {
        key: "locations",
        href: "/cms/locations",
        editionKey: "edition2",
        span: "lg:col-span-4",
        icon: MapPin,
    },
    {
        key: "articles",
        href: "/cms/articles",
        editionKey: "edition3",
        span: "lg:col-span-6",
        icon: Newspaper,
    },
    {
        key: "performers",
        href: "/cms/performers",
        editionKey: "edition4",
        span: "lg:col-span-6",
        comingSoon: true,
        icon: Users,
    },
    {
        key: "collections",
        href: "/cms/collections",
        editionKey: "edition5",
        span: "lg:col-span-12",
        icon: FolderArchive,
    },
];

interface UtilitySection {
    key: string;
    href: string;
    icon: typeof Database;
    editionKey: string;
}

const UTILITY_SECTIONS: UtilitySection[] = [
    {
        key: "ingest",
        href: "/cms/ingest",
        icon: Database,
        editionKey: "edition5",
    },
    {
        key: "import",
        href: "/cms/import",
        icon: FileUp,
        editionKey: "edition6",
    },
    {
        key: "importErrors",
        href: "/cms/import-errors",
        icon: TriangleAlert,
        editionKey: "edition6",
    },
];

export default function CmsOverviewPage() {
    const t = useTranslations("Cms.Overview");
    const tEditions = useTranslations("Cms.editions");
    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLElement>(null);
    const { data: stats } = useGetStats();

    useEffect(() => {
        if (headerRef.current) {
            // Reset initial state before animating
            headerRef.current.style.opacity = "0";
            headerRef.current.style.transform = "translateY(-10px)";
            animate(headerRef.current, {
                opacity: [0, 1],
                translateY: [-10, 0],
                ease: "outQuad",
                duration: 600,
            });
        }

        if (containerRef.current) {
            const cards = containerRef.current.querySelectorAll("[data-card]");
            // Set initial state before animating
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
    });

    return (
        <div className="flex h-full flex-col px-4 py-6 sm:px-6 sm:py-8">
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
                                    edition={tEditions(section.editionKey)}
                                    title={t(section.key)}
                                    description={t(`${section.key}Description`)}
                                    actionLabel={t("openSection")}
                                    icon={section.icon}
                                    comingSoon={section.comingSoon}
                                    count={
                                        stats
                                            ? {
                                                  productions: stats.production_count,
                                                  locations: stats.location_count,
                                                  articles: stats.article_count,
                                                  performers: stats.artist_count,
                                                  collections: stats.collection_count,
                                              }[section.key]
                                            : undefined
                                    }
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
                                    edition={tEditions(util.editionKey)}
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
