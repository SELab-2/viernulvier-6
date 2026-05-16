"use client";

import { CardShell } from "@/components/masonry/card-shell";
import { MasonryGrid } from "@/components/masonry/masonry-grid";
import type { EntityTagSlim } from "@/types/models/taxonomy.types";

export type SearchGridItem = {
    id: string;
    title: string | null;
    imageUrl: string | null;
    href: string | null;
    typeLabel: string;
    subtitle?: string | null;
    description?: string | null;
    tags?: EntityTagSlim[];
};

export function SearchGrid({ items, locale }: { items: SearchGridItem[]; locale: string }) {
    return (
        <div className="px-4 py-4 sm:px-7">
            <MasonryGrid
                items={items}
                renderItem={(item, index) => (
                    <CardShell
                        index={index}
                        isLoading={false}
                        title={item.title}
                        imageUrl={item.imageUrl}
                        href={item.href}
                        typeLabel={item.typeLabel}
                        subtitle={item.subtitle}
                        description={item.description}
                        tags={item.tags}
                        locale={locale}
                    />
                )}
            />
        </div>
    );
}
