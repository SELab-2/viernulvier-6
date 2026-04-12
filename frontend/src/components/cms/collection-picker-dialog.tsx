"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { useAddCollectionItem, useCreateCollection, useGetCollections } from "@/hooks/api";
import { slugify } from "@/lib/slugify";
import {
    type PickerItem,
    getCollectionTitle,
    maxItemPosition,
    buildItemQueue,
    existingItemKeys,
    defaultCollectionTranslations,
} from "@/lib/collection-picker-utils";
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

type CollectionPickerDialogProps = {
    items: PickerItem[];
    triggerLabel?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};

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
        return collections.filter((c) => getCollectionTitle(c).toLowerCase().includes(q));
    }, [collections, query]);

    const selectedCollection = collections.find((c) => c.id === selectedCollectionId) ?? null;

    const addToCollection = async (openAfter: boolean) => {
        if (!selectedCollection) return;

        const queue = buildItemQueue(items, existingItemKeys(selectedCollection));
        const basePos = maxItemPosition(selectedCollection);

        await Promise.all(
            queue.map((queuedItem, index) =>
                addCollectionItem.mutateAsync({
                    collectionId: selectedCollection.id,
                    contentId: queuedItem.contentId,
                    contentType: queuedItem.contentType,
                    position: basePos + 1 + index,
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
        if (openAfter) router.push(`/cms/collections/${selectedCollection.id}`);
    };

    const createNewCollection = async () => {
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
