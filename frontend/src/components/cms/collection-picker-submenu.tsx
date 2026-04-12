"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useAddCollectionItem, useCreateCollection, useGetCollections } from "@/hooks/api";
import { slugify } from "@/lib/slugify";
import {
    type PickerItem,
    getCollectionTitle,
    itemKey,
    maxItemPosition,
    buildItemQueue,
    existingItemKeys,
    defaultCollectionTranslations,
} from "@/lib/collection-picker-utils";
import {
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type { PickerItem };

export function CollectionPickerSubmenu({
    item,
    onComplete,
}: {
    item: PickerItem;
    onComplete?: () => void;
}) {
    const t = useTranslations("Cms.Collections");

    const { data: collections = [] } = useGetCollections();
    const createCollection = useCreateCollection();
    const addCollectionItem = useAddCollectionItem();

    const [query, setQuery] = useState("");
    const [newCollectionTitle, setNewCollectionTitle] = useState("");

    const filteredCollections = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return collections;
        return collections.filter((c) => getCollectionTitle(c).toLowerCase().includes(q));
    }, [collections, query]);

    const addToCollection = async (collectionId: string) => {
        const collection = collections.find((c) => c.id === collectionId);
        if (!collection) return;

        const existing = existingItemKeys(collection);
        if (existing.has(itemKey(item))) {
            toast.warning(t("alreadyInCollection", { title: item.label ?? item.contentId }));
            return;
        }

        const queue = buildItemQueue([item], existing);
        const basePos = maxItemPosition(collection);

        for (const [index, queuedItem] of queue.entries()) {
            await addCollectionItem.mutateAsync({
                collectionId,
                contentId: queuedItem.contentId,
                contentType: queuedItem.contentType,
                position: basePos + 1 + index,
            });
        }

        if (queue.length > 0) {
            toast.success(
                queue.length === 1
                    ? t("addedToCollection", { collection: getCollectionTitle(collection) })
                    : t("addedToCollectionMultiple", {
                          count: queue.length,
                          collection: getCollectionTitle(collection),
                      })
            );
        }

        onComplete?.();
    };

    const createAndAdd = async () => {
        const title = newCollectionTitle.trim();
        if (!title) return;

        const slug = slugify(title);
        if (!slug) {
            toast.error(t("invalidSlug"));
            return;
        }

        const created = await createCollection.mutateAsync({
            slug,
            translations: defaultCollectionTranslations(title),
        });

        const queue = buildItemQueue([item], new Set());
        for (const [index, queuedItem] of queue.entries()) {
            await addCollectionItem.mutateAsync({
                collectionId: created.id,
                contentId: queuedItem.contentId,
                contentType: queuedItem.contentType,
                position: index + 1,
            });
        }

        toast.success(t("addedToCollection", { collection: title }));
        setNewCollectionTitle("");
        onComplete?.();
    };

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t("addToCollection")}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent
                className="max-h-(--radix-dropdown-menu-content-available-height) w-56 overflow-y-auto p-2"
                collisionPadding={8}
            >
                <Input
                    placeholder={t("searchCollections")}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="mb-2"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                />
                <div className="max-h-48 space-y-1 overflow-auto">
                    {filteredCollections.map((collection) => (
                        <button
                            type="button"
                            key={collection.id}
                            className="hover:bg-accent block w-full rounded px-2 py-1 text-left text-sm"
                            onClick={() => addToCollection(collection.id)}
                        >
                            {getCollectionTitle(collection)}
                        </button>
                    ))}
                </div>
                <div className="space-y-2 border-t pt-2">
                    <Input
                        placeholder={t("createNewCollection")}
                        value={newCollectionTitle}
                        onChange={(event) => setNewCollectionTitle(event.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={createAndAdd}
                        disabled={!newCollectionTitle.trim()}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        {t("createNewCollection")}
                    </Button>
                </div>
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    );
}
