"use client";

import { useTranslations } from "next-intl";

interface RelationItem {
    id: string;
    label: string;
    href?: string;
}

interface ArticleRelationsProps {
    productions?: RelationItem[];
    artists?: RelationItem[];
    locations?: RelationItem[];
    events?: RelationItem[];
}

function RelationSection({ title, items }: { title: string; items: RelationItem[] }) {
    if (items.length === 0) return null;

    return (
        <div className="mb-5">
            <h4 className="text-muted-foreground mb-2 font-mono text-[9px] font-medium tracking-[2px] uppercase">
                {title}
            </h4>
            <ul className="flex flex-col gap-1.5">
                {items.map((item) => (
                    <li key={item.id}>
                        <span className="font-body text-foreground text-sm leading-snug">
                            {item.label}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function ArticleRelations({
    productions = [],
    artists = [],
    locations = [],
    events = [],
}: ArticleRelationsProps) {
    const t = useTranslations("Articles");
    const hasAny =
        productions.length > 0 || artists.length > 0 || locations.length > 0 || events.length > 0;

    if (!hasAny) return null;

    return (
        <aside className="border-foreground/20 border-t pt-6 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
            <h3 className="text-foreground mb-4 font-mono text-[10px] font-medium tracking-[2px] uppercase">
                {t("relatedEntities")}
            </h3>
            <RelationSection title={t("relatedProductions")} items={productions} />
            <RelationSection title={t("relatedArtists")} items={artists} />
            <RelationSection title={t("relatedLocations")} items={locations} />
            <RelationSection title={t("relatedEvents")} items={events} />
        </aside>
    );
}
