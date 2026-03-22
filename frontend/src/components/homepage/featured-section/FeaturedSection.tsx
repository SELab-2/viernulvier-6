"use client";

import { useTranslations } from "next-intl";

interface FeaturedItem {
    category: string;
    title: string;
    subtitle: string;
    description: string;
    date: string;
}

// TODO: replace with curated featured items from CMS/API when available
const FEATURED_ITEMS: FeaturedItem[] = [
    {
        category: "Theater · Marathon",
        title: "The Second Woman",
        subtitle: "Natali Broods",
        description:
            "24 uur lang, dezelfde scène, maar liefst 100 keer. Met 100 personen in pure improvisatie.",
        date: "13 juni 2026 — 16:00",
    },
    {
        category: "Seizoen 2025–26",
        title: "Fresh Juice",
        subtitle: "Voorjaar '26",
        description: "Een smaakexplosie: luid en zacht, fris en wild, scherp en verrassend.",
        date: "Feb – Jun 2026",
    },
    {
        category: "Concert · Plantentuin",
        title: "Palmarium 2026",
        subtitle: "Democrazy × GUM",
        description:
            "De jaarlijkse concertreeks in de Gentse Plantentuin — zeven avonden, veertien acts.",
        date: "Zomer 2026",
    },
];

export function FeaturedSection() {
    const t = useTranslations("Featured");

    return (
        <div className="border-foreground border-b-2">
            <div className="text-muted-foreground mb-3 flex items-center gap-2.5 font-mono text-[9px] font-medium tracking-[2px] uppercase">
                {t("label")}
                <span className="bg-muted/40 h-px flex-1" />
            </div>

            <div className="bg-muted border-muted -mx-[30px] grid grid-cols-[1.6fr_1fr_1fr] gap-px border">
                {FEATURED_ITEMS.map((item, index) => (
                    <FeaturedCard key={item.title} item={item} isFirst={index === 0} />
                ))}
            </div>
        </div>
    );
}

function FeaturedCard({ item, isFirst }: { item: FeaturedItem; isFirst: boolean }) {
    return (
        <div className="bg-background hover:bg-muted/5 relative cursor-pointer p-5 pb-5 transition-colors">
            {/* TODO: replace with actual featured image from API/CMS when available */}
            <div
                className={`w-full ${isFirst ? "h-[200px]" : "h-[140px]"} relative mb-3 overflow-hidden bg-[#CCC6BC]`}
            >
                <div className="h-full w-full bg-gradient-to-br from-[#CCC6BC] to-[#B5AEA4]" />
            </div>

            <div className="text-muted-foreground mb-1.5 font-mono text-[9px] tracking-[1.4px] uppercase">
                {item.category}
            </div>

            <div
                className={`font-display text-foreground mb-0.5 leading-[1.15] font-bold tracking-[-0.02em] ${
                    isFirst ? "text-[30px]" : "text-[22px]"
                }`}
            >
                {item.title}
            </div>

            <div
                className={`font-display text-foreground/40 mb-2.5 font-bold ${
                    isFirst ? "text-[30px]" : "text-[22px]"
                }`}
            >
                {item.subtitle}
            </div>

            <p className="font-body text-muted-foreground text-xs leading-relaxed">
                {item.description}
            </p>

            <div className="text-foreground mt-3 font-mono text-[10px] tracking-[1.2px] uppercase">
                {item.date}
            </div>
        </div>
    );
}
