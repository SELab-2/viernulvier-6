import type { Collection, CollectionContentType } from "@/types/models/collection.types";

export type PickerItem = {
    contentId: string;
    contentType: CollectionContentType;
    label?: string;
    parentProductionId?: string;
};

export function getCollectionTitle(collection: {
    slug: string;
    translations: { languageCode: string; title: string }[];
}): string {
    return (
        collection.translations.find((t) => t.languageCode === "nl")?.title ||
        collection.translations.find((t) => t.languageCode === "en")?.title ||
        collection.slug
    );
}

export function itemKey(item: PickerItem): string {
    return `${item.contentType}:${item.contentId}`;
}

export function maxItemPosition(collection: Pick<Collection, "items">): number {
    return collection.items.reduce((max, i) => Math.max(max, i.position ?? 0), 0);
}

/** Build a deduplicated queue of items to add, auto-including parent productions for events. */
export function buildItemQueue(items: PickerItem[], existingKeys: Set<string>): PickerItem[] {
    const queue: PickerItem[] = [];
    const seen = new Set(existingKeys);

    for (const item of items) {
        if (item.contentType === "event" && item.parentProductionId) {
            const prodItem: PickerItem = {
                contentId: item.parentProductionId,
                contentType: "production",
            };
            const key = itemKey(prodItem);
            if (!seen.has(key)) {
                queue.push(prodItem);
                seen.add(key);
            }
        }

        const key = itemKey(item);
        if (!seen.has(key)) {
            queue.push(item);
            seen.add(key);
        }
    }

    return queue;
}

export function existingItemKeys(collection: Pick<Collection, "items">): Set<string> {
    return new Set(collection.items.map((i) => `${i.contentType}:${i.contentId}`));
}

export function defaultCollectionTranslations(titleNl: string) {
    return [
        { languageCode: "nl", title: titleNl, description: "" },
        { languageCode: "en", title: "", description: "" },
    ];
}
