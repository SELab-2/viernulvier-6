"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useAddCollectionItem, useCreateCollection, useGetCollections } from "@/hooks/api";
import { slugify } from "@/lib/slugify";
import type { CollectionContentType } from "@/types/models/collection.types";
import {
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type PickerItem = {
    contentId: string;
    contentType: CollectionContentType;
    label?: string;
    parentProductionId?: string;
};

function getCollectionTitle(collection: {
    slug: string;
    translations: { languageCode: string; title: string }[];
}): string {
    return (
        collection.translations.find((t) => t.languageCode === "nl")?.title ||
        collection.translations.find((t) => t.languageCode === "en")?.title ||
        collection.slug
    );
}

function itemKey(item: PickerItem): string {
    return `${item.contentType}:${item.contentId}`;
}

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
        return collections.filter((collection) =>
            getCollectionTitle(collection).toLowerCase().includes(q)
        );
    }, [collections, query]);

    const addToCollection = async (collectionId: string) => {
        const collection = collections.find((entry) => entry.id === collectionId);
        if (!collection) return;

        const existing = new Set(
            collection.items.map(
                (collectionItem) => `${collectionItem.contentType}:${collectionItem.contentId}`
            )
        );

        const queue: PickerItem[] = [];
        if (item.contentType === "event" && item.parentProductionId) {
            const productionItem: PickerItem = {
                contentId: item.parentProductionId,
                contentType: "production",
            };
            if (!existing.has(itemKey(productionItem))) {
                queue.push(productionItem);
                existing.add(itemKey(productionItem));
            }
        }

        const key = itemKey(item);
        if (existing.has(key)) {
            toast.warning(t("alreadyInCollection", { title: item.label ?? item.contentId }));
            return;
        }
        queue.push(item);

        let added = 0;
        for (const [index, queuedItem] of queue.entries()) {
            await addCollectionItem.mutateAsync({
                collectionId,
                contentId: queuedItem.contentId,
                contentType: queuedItem.contentType,
                position: collection.items.length + index,
            });
            added += 1;
        }

        if (added > 0) {
            toast.success(
                added === 1
                    ? t("addedToCollection", { collection: getCollectionTitle(collection) })
                    : t("addedToCollectionMultiple", {
                          count: added,
                          collection: getCollectionTitle(collection),
                      })
            );
        }

        onComplete?.();
    };

    const createAndAdd = async () => {
        const title = newCollectionTitle.trim();
        if (!title) return;

        const created = await createCollection.mutateAsync({
            slug: slugify(title),
            translations: [
                { languageCode: "nl", title, description: "" },
                { languageCode: "en", title: "", description: "" },
            ],
        });

        const queue: PickerItem[] = [];
        if (item.contentType === "event" && item.parentProductionId) {
            queue.push({
                contentId: item.parentProductionId,
                contentType: "production",
            });
        }
        queue.push(item);

        for (const [index, queuedItem] of queue.entries()) {
            await addCollectionItem.mutateAsync({
                collectionId: created.id,
                contentId: queuedItem.contentId,
                contentType: queuedItem.contentType,
                position: index,
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
