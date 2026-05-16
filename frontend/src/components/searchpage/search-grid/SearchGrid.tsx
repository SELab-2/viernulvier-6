"use client";

import { CardShell } from "@/components/masonry/card-shell";
import { MasonryGrid } from "@/components/masonry/masonry-grid";

export type SearchGridItem = {
    id: string;
    title: string | null;
    imageUrl: string | null;
    href: string | null;
    typeLabel: string;
};

export function SearchGrid({ items }: { items: SearchGridItem[] }) {
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
                    />
                )}
            />
        </div>
    );
}
