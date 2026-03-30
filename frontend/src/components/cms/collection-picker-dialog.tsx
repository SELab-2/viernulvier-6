"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { useAddCollectionItem, useCreateCollection, useGetCollections } from "@/hooks/api";
import { slugify } from "@/lib/slugify";
import type { CollectionContentType } from "@/types/models/collection.types";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type PickerItem = {
    contentId: string;
    contentType: CollectionContentType;
    label?: string;
    parentProductionId?: string;
};

type CollectionPickerDialogProps = {
    items: PickerItem[];
    triggerLabel?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};

function getCollectionTitle(collection: {
    slug: string;
    translations: { languageCode: string; title: string }[];
}): string {
    return (
        collection.translations.find((translation) => translation.languageCode === "nl")?.title ||
        collection.translations.find((translation) => translation.languageCode === "en")?.title ||
        collection.slug
    );
}

function itemKey(item: PickerItem): string {
    return `${item.contentType}:${item.contentId}`;
}

export function CollectionPickerDialog({
    items,
    triggerLabel,
    open,
    onOpenChange,
}: CollectionPickerDialogProps) {
    const t = useTranslations("Cms.Collections");
    const router = useRouter();

    const { data: collections = [] } = useGetCollections();
    const addCollectionItem = useAddCollectionItem();
    const createCollection = useCreateCollection();

    const [internalOpen, setInternalOpen] = useState(false);
    const resolvedOpen = open ?? internalOpen;
    const setResolvedOpen = onOpenChange ?? setInternalOpen;

    const [query, setQuery] = useState("");
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
    const [newCollectionTitle, setNewCollectionTitle] = useState("");

    const filteredCollections = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return collections;
        return collections.filter((collection) =>
            getCollectionTitle(collection).toLowerCase().includes(q)
        );
    }, [collections, query]);

    const selectedCollection =
        collections.find((collection) => collection.id === selectedCollectionId) ?? null;

    const addToCollection = async (openAfter: boolean) => {
        if (!selectedCollection) return;

        const existing = new Set(
            selectedCollection.items.map(
                (collectionItem) => `${collectionItem.contentType}:${collectionItem.contentId}`
            )
        );

        const queue: PickerItem[] = [];
        for (const item of items) {
            if (item.contentType === "event" && item.parentProductionId) {
                const productionItem: PickerItem = {
                    contentId: item.parentProductionId,
                    contentType: "production",
                };
                const productionKey = itemKey(productionItem);
                if (!existing.has(productionKey)) {
                    queue.push(productionItem);
                    existing.add(productionKey);
                }
            }

            const key = itemKey(item);
            if (existing.has(key)) continue;
            queue.push(item);
            existing.add(key);
        }

        await Promise.all(
            queue.map((queuedItem, index) =>
                addCollectionItem.mutateAsync({
                    collectionId: selectedCollection.id,
                    contentId: queuedItem.contentId,
                    contentType: queuedItem.contentType,
                    position: selectedCollection.items.length + index,
                })
            )
        );

        if (queue.length > 0) {
            toast.success(
                t("addedToCollectionMultiple", {
                    count: queue.length,
                    collection: getCollectionTitle(selectedCollection),
                })
            );
        }

        setResolvedOpen(false);

        if (openAfter) {
            router.push(`/cms/collections/${selectedCollection.id}`);
        }
    };

    const createNewCollection = async () => {
        const title = newCollectionTitle.trim();
        if (!title) return;

        const created = await createCollection.mutateAsync({
            slug: slugify(title),
            translations: [
                {
                    languageCode: "nl",
                    title,
                    description: "",
                },
                {
                    languageCode: "en",
                    title: "",
                    description: "",
                },
            ],
        });

        setSelectedCollectionId(created.id);
        setNewCollectionTitle("");
    };

    return (
        <Dialog open={resolvedOpen} onOpenChange={setResolvedOpen}>
            {onOpenChange === undefined && (
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={items.length === 0}>
                        {triggerLabel ?? t("addToCollection")}
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("addToCollection")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <p className="text-muted-foreground text-sm">
                        {t("selectedItems", { count: items.length })}
                    </p>
                    <Input
                        placeholder={t("searchCollections")}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                    />
                    <div className="max-h-56 space-y-1 overflow-auto rounded border p-2">
                        {filteredCollections.map((collection) => (
                            <button
                                key={collection.id}
                                type="button"
                                className={`block w-full rounded px-2 py-1 text-left text-sm ${
                                    selectedCollectionId === collection.id
                                        ? "bg-muted"
                                        : "hover:bg-muted"
                                }`}
                                onClick={() => setSelectedCollectionId(collection.id)}
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
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={createNewCollection}
                            disabled={!newCollectionTitle.trim()}
                        >
                            {t("createNewCollection")}
                        </Button>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setResolvedOpen(false)}>
                        {t("cancel")}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => addToCollection(true)}
                        disabled={!selectedCollectionId}
                    >
                        {t("addAndOpen")}
                    </Button>
                    <Button
                        type="button"
                        onClick={() => addToCollection(false)}
                        disabled={!selectedCollectionId}
                    >
                        {t("addToCollection")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
