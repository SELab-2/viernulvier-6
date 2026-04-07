"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    DndContext,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { GripVertical, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/routing";
import {
    useDeleteCollection,
    useGetCollection,
    useGetEvents,
    useGetLocations,
    useGetProductions,
    useUpdateCollection,
    useUpdateCollectionItems,
} from "@/hooks/api";
import { slugify } from "@/lib/slugify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { Collection, CollectionItem } from "@/types/models/collection.types";
import type { Production } from "@/types/models/production.types";
import type { Event } from "@/types/models/event.types";
import type { Location } from "@/types/models/location.types";

const LANGS = ["nl", "en"] as const;

const TIME_FMT: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
const formatTime = (d: Date) => d.toLocaleTimeString([], TIME_FMT);

type LocalCollectionItem = {
    id: string;
    contentId: string;
    contentType: CollectionItem["contentType"];
    position: number;
    translations: { languageCode: string; comment: string | null }[];
};

function withAllLanguages<T extends { languageCode: string }>(
    translations: T[],
    emptyFactory: (languageCode: string) => T
): T[] {
    const map = new Map(translations.map((t) => [t.languageCode, t]));
    return LANGS.map((lc) => map.get(lc) ?? emptyFactory(lc));
}

function normalizeItems(items: LocalCollectionItem[]): LocalCollectionItem[] {
    return items
        .map((item, index) => ({
            ...item,
            position: index + 1,
            translations: withAllLanguages(item.translations, (languageCode) => ({
                languageCode,
                comment: null,
            })),
        }))
        .sort((a, b) => a.position - b.position);
}

function getTranslation<T extends { languageCode: string }>(
    translations: T[],
    languageCode: string
): T | undefined {
    return translations.find((translation) => translation.languageCode === languageCode);
}

const CONTENT_TYPE_CLASSES: Record<string, string> = {
    production: "bg-blue-100 text-blue-700",
    event: "bg-purple-100 text-purple-700",
    location: "bg-emerald-100 text-emerald-700",
    blogpost: "bg-orange-100 text-orange-700",
    artist: "bg-pink-100 text-pink-700",
};
const getContentTypeClass = (ct: string) =>
    CONTENT_TYPE_CLASSES[ct] ?? "bg-muted text-muted-foreground";

function toMetadataSnapshot(collection: Collection) {
    return {
        slug: collection.slug,
        translations: withAllLanguages(collection.translations, (languageCode) => ({
            languageCode,
            title: "",
            description: "",
        })),
    };
}

function toItemsSnapshot(items: LocalCollectionItem[]) {
    return normalizeItems(items).map(({ id, position, translations }) => ({
        id,
        position,
        translations: withAllLanguages(translations, (lc) => ({ languageCode: lc, comment: null })),
    }));
}

type EntityData =
    | { type: "production"; data: Production }
    | { type: "event"; data: Event; productionTitle?: string }
    | { type: "location"; data: Location }
    | { type: "loading" }
    | { type: "unknown" };

function DetailValue({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) return null;
    return (
        <div className="min-w-0">
            <span className="text-muted-foreground text-xs">{label}</span>
            <p className="truncate text-sm">{value}</p>
        </div>
    );
}

function ItemDetails({ entity }: { entity: EntityData }) {
    if (entity.type === "loading") {
        return (
            <div className="grid gap-x-4 gap-y-1 md:grid-cols-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </div>
        );
    }

    if (entity.type === "production") {
        const nl = getTranslation(entity.data.translations, "nl");
        const en = getTranslation(entity.data.translations, "en");
        return (
            <div className="grid gap-x-4 gap-y-1 md:grid-cols-3">
                <DetailValue label="Title (NL)" value={nl?.title} />
                <DetailValue label="Title (EN)" value={en?.title} />
                <DetailValue label="Artist" value={nl?.artist || en?.artist} />
                <DetailValue label="Tagline" value={nl?.tagline || en?.tagline} />
            </div>
        );
    }

    if (entity.type === "event") {
        const d = entity.data;
        const starts = new Date(d.startsAt);
        const date = starts.toLocaleDateString();
        const time = formatTime(starts);
        const ends = d.endsAt ? formatTime(new Date(d.endsAt)) : null;
        const doors = d.doorsAt ? formatTime(new Date(d.doorsAt)) : null;
        return (
            <div className="grid gap-x-4 gap-y-1 md:grid-cols-3">
                <DetailValue label="Date" value={date} />
                <DetailValue label="Time" value={ends ? `${time} – ${ends}` : time} />
                <DetailValue label="Doors" value={doors} />
                <DetailValue label="Status" value={d.status} />
            </div>
        );
    }

    if (entity.type === "location") {
        const loc = entity.data;
        return (
            <div className="grid gap-x-4 gap-y-1 md:grid-cols-3">
                <DetailValue label="Name" value={loc.name} />
                <DetailValue label="Address" value={loc.address} />
                <DetailValue label="City" value={loc.city} />
                <DetailValue label="Country" value={loc.country} />
                <DetailValue label="Phone" value={loc.phone1} />
            </div>
        );
    }

    return null;
}

type ItemRowProps = {
    item: LocalCollectionItem;
    contentTypeLabel: string;
    title: string;
    entity: EntityData;
    commentNl: string;
    commentEn: string;
    commentNlLabel: string;
    commentEnLabel: string;
    onCommentChange: (languageCode: "nl" | "en", value: string) => void;
    onRemove: () => void;
};

type GroupedItem = {
    item: LocalCollectionItem;
    childEvents: LocalCollectionItem[];
};

function groupItemsByProduction(
    items: LocalCollectionItem[],
    eventMap: Map<string, Event>
): GroupedItem[] {
    const groups: GroupedItem[] = [];
    const productionGroupMap = new Map<string, GroupedItem>();

    for (const item of items) {
        if (item.contentType === "event") {
            const event = eventMap.get(item.contentId);
            const parentGroup = event ? productionGroupMap.get(event.productionId) : undefined;
            if (parentGroup) {
                parentGroup.childEvents.push(item);
            } else {
                groups.push({ item, childEvents: [] });
            }
        } else {
            const group: GroupedItem = { item, childEvents: [] };
            if (item.contentType === "production") {
                productionGroupMap.set(item.contentId, group);
            }
            groups.push(group);
        }
    }

    return groups;
}

function SortableItemRow({
    group,
    renderItem,
}: {
    group: GroupedItem;
    renderItem: (item: LocalCollectionItem) => ItemRowProps;
}) {
    const t = useTranslations("Cms.Collections");
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: group.item.id,
    });
    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
    };

    const parentProps = renderItem(group.item);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-background flex flex-col gap-3 rounded-md border p-3"
        >
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    className="text-muted-foreground"
                    aria-label="Drag"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="h-4 w-4" />
                </button>
                <span
                    className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${getContentTypeClass(group.item.contentType)}`}
                >
                    {parentProps.contentTypeLabel}
                </span>
                <span className="truncate text-sm font-medium">{parentProps.title}</span>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    aria-label={t("removeItem")}
                    onClick={parentProps.onRemove}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
            <ItemDetails entity={parentProps.entity} />
            {group.childEvents.length > 0 && (
                <div className="space-y-1">
                    <p className="text-muted-foreground text-xs font-medium">{t("events")}</p>
                    {group.childEvents.map((childItem) => {
                        const childProps = renderItem(childItem);
                        const entity = childProps.entity;
                        const detail =
                            entity.type === "event"
                                ? [
                                      entity.data.status,
                                      entity.data.doorsAt
                                          ? `doors ${formatTime(new Date(entity.data.doorsAt))}`
                                          : null,
                                  ]
                                      .filter(Boolean)
                                      .join(" · ")
                                : null;
                        return (
                            <div
                                key={childItem.id}
                                className="flex items-center gap-2 py-1 text-xs"
                            >
                                <span className="truncate font-medium">{childProps.title}</span>
                                {detail && (
                                    <span className="text-muted-foreground shrink-0">{detail}</span>
                                )}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="ml-auto h-6 w-6 shrink-0 p-0"
                                    aria-label={t("removeItem")}
                                    onClick={childProps.onRemove}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}
            <div className="grid gap-3 md:grid-cols-2">
                {(
                    [
                        ["nl", parentProps.commentNlLabel, parentProps.commentNl],
                        ["en", parentProps.commentEnLabel, parentProps.commentEn],
                    ] as const
                ).map(([lang, label, value]) => (
                    <div key={lang} className="space-y-1">
                        <Label>{label}</Label>
                        <Input
                            value={value}
                            onChange={(e) => parentProps.onCommentChange(lang, e.target.value)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function CollectionEditorPage({ id }: { id: string }) {
    const t = useTranslations("Cms.Collections");
    const router = useRouter();

    const { data: collection, isLoading } = useGetCollection(id);
    const { data: productionsResult, isLoading: productionsLoading } = useGetProductions();
    const { data: eventsResult, isLoading: eventsLoading } = useGetEvents();
    const { data: locationsResult, isLoading: locationsLoading } = useGetLocations();
    const productions = useMemo(() => productionsResult?.data ?? [], [productionsResult?.data]);
    const events = useMemo(() => eventsResult?.data ?? [], [eventsResult?.data]);
    const locations = useMemo(() => locationsResult?.data ?? [], [locationsResult?.data]);

    const entitiesLoading = productionsLoading || eventsLoading || locationsLoading;

    const updateCollection = useUpdateCollection();
    const updateItems = useUpdateCollectionItems(id);
    const deleteCollection = useDeleteCollection();

    const [slugEdited, setSlugEdited] = useState(false);
    const [origin, setOrigin] = useState("");
    const [localSlug, setLocalSlug] = useState<string | null>(null);
    const [titleNl, setTitleNl] = useState<string | null>(null);
    const [titleEn, setTitleEn] = useState<string | null>(null);
    const [descriptionNl, setDescriptionNl] = useState<string | null>(null);
    const [descriptionEn, setDescriptionEn] = useState<string | null>(null);
    const [items, setItems] = useState<LocalCollectionItem[] | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") setOrigin(window.location.origin);
    }, []);

    const sensors = useSensors(useSensor(PointerSensor));

    const hydrationReady = Boolean(collection);

    const initialMetadata = useMemo(() => {
        if (!collection) return null;
        return toMetadataSnapshot(collection);
    }, [collection]);

    const initialItems = useMemo(() => {
        if (!collection) return [];
        return normalizeItems(
            collection.items.map((item) => ({
                id: item.id,
                contentId: item.contentId,
                contentType: item.contentType,
                position: item.position,
                translations: item.translations,
            }))
        );
    }, [collection]);

    const metadata = useMemo(() => {
        if (!collection || !initialMetadata) return null;

        const [baseNl, baseEn] = LANGS.map((lc) =>
            initialMetadata.translations.find((t) => t.languageCode === lc)
        );
        const nextTitleNl = titleNl ?? baseNl?.title ?? "";
        const nextSlug =
            localSlug ??
            (slugEdited ? initialMetadata.slug : slugify(nextTitleNl) || initialMetadata.slug);

        return {
            slug: nextSlug,
            translations: [
                {
                    languageCode: "nl",
                    title: nextTitleNl,
                    description: descriptionNl ?? baseNl?.description ?? "",
                },
                {
                    languageCode: "en",
                    title: titleEn ?? baseEn?.title ?? "",
                    description: descriptionEn ?? baseEn?.description ?? "",
                },
            ],
        };
    }, [
        collection,
        descriptionEn,
        descriptionNl,
        initialMetadata,
        localSlug,
        slugEdited,
        titleEn,
        titleNl,
    ]);

    const localItems = items ?? initialItems;

    const metadataDirty = useMemo(() => {
        if (!initialMetadata || !metadata) return false;
        return JSON.stringify(initialMetadata) !== JSON.stringify(metadata);
    }, [initialMetadata, metadata]);

    const itemsDirty = useMemo(() => {
        return (
            JSON.stringify(toItemsSnapshot(initialItems)) !==
            JSON.stringify(toItemsSnapshot(localItems))
        );
    }, [initialItems, localItems]);

    const isSaving = updateCollection.isPending || updateItems.isPending;
    const canSave = hydrationReady && (metadataDirty || itemsDirty) && !isSaving;

    const productionMap = useMemo(() => new Map(productions.map((p) => [p.id, p])), [productions]);
    const eventMap = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
    const locationMap = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);

    const getItemTitle = (item: LocalCollectionItem): string => {
        if (entitiesLoading) return "…";
        switch (item.contentType) {
            case "production": {
                const p = productionMap.get(item.contentId);
                return (
                    getTranslation(p?.translations ?? [], "nl")?.title ||
                    getTranslation(p?.translations ?? [], "en")?.title ||
                    p?.slug ||
                    item.contentId
                );
            }
            case "event": {
                const e = eventMap.get(item.contentId);
                if (!e) return item.contentId;
                const starts = new Date(e.startsAt);
                return `${starts.toLocaleDateString()} ${formatTime(starts)}`;
            }
            case "location": {
                const l = locationMap.get(item.contentId);
                return l?.name || l?.address || item.contentId;
            }
            default:
                return item.contentId;
        }
    };

    const getEntityData = (item: LocalCollectionItem): EntityData => {
        if (entitiesLoading) return { type: "loading" };
        switch (item.contentType) {
            case "production": {
                const data = productionMap.get(item.contentId);
                return data ? { type: "production", data } : { type: "unknown" };
            }
            case "event": {
                const data = eventMap.get(item.contentId);
                if (!data) return { type: "unknown" };
                const prod = productionMap.get(data.productionId);
                const prodTitle =
                    getTranslation(prod?.translations ?? [], "nl")?.title ||
                    getTranslation(prod?.translations ?? [], "en")?.title ||
                    prod?.slug;
                return { type: "event", data, productionTitle: prodTitle };
            }
            case "location": {
                const data = locationMap.get(item.contentId);
                return data ? { type: "location", data } : { type: "unknown" };
            }
            default:
                return { type: "unknown" };
        }
    };

    const groupedItems = useMemo(
        () => groupItemsByProduction(localItems, eventMap),
        [localItems, eventMap]
    );

    const renderItemProps = useCallback(
        (item: LocalCollectionItem): ItemRowProps => {
            const translationNl = getTranslation(item.translations, "nl");
            const translationEn = getTranslation(item.translations, "en");
            return {
                item,
                contentTypeLabel: t(
                    `contentTypes.${item.contentType}` as "contentTypes.production"
                ),
                title: getItemTitle(item),
                entity: getEntityData(item),
                commentNl: translationNl?.comment ?? "",
                commentEn: translationEn?.comment ?? "",
                commentNlLabel: t("commentNl"),
                commentEnLabel: t("commentEn"),
                onCommentChange: (languageCode, value) =>
                    updateComment(item.id, languageCode, value),
                onRemove: () => removeItem(item.id),
            };
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [localItems, entitiesLoading, productionMap, eventMap, locationMap, t]
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = groupedItems.findIndex((g) => g.item.id === active.id);
        const newIndex = groupedItems.findIndex((g) => g.item.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;

        const reordered = [...groupedItems];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);

        const flatItems = reordered.flatMap((g) => [g.item, ...g.childEvents]);
        setItems(normalizeItems(flatItems));
    };

    const updateComment = (itemId: string, languageCode: "nl" | "en", value: string) => {
        setItems(
            normalizeItems(
                localItems.map((item) => {
                    if (item.id !== itemId) return item;
                    return {
                        ...item,
                        translations: withAllLanguages(item.translations, (lang) => ({
                            languageCode: lang,
                            comment: null,
                        })).map((translation) =>
                            translation.languageCode === languageCode
                                ? { ...translation, comment: value || null }
                                : translation
                        ),
                    };
                })
            )
        );
    };

    const removeItem = (itemId: string) => {
        setItems(normalizeItems(localItems.filter((item) => item.id !== itemId)));
    };

    const copyShareableLink = async () => {
        if (!metadata?.slug) return;
        try {
            await navigator.clipboard.writeText(`${origin}/en/collections/${metadata.slug}`);
            toast.success(t("linkCopied"));
        } catch {
            toast.error(t("copyError"));
        }
    };

    const save = () => {
        if (!collection || !metadata) return;

        if (metadataDirty) {
            updateCollection.mutate(
                {
                    ...collection,
                    slug: metadata.slug,
                    translations: metadata.translations,
                },
                {
                    onSuccess: () => toast.success(t("metadataSaved")),
                    onError: () => toast.error(t("metadataError")),
                }
            );
        }

        if (itemsDirty) {
            updateItems.mutate(
                {
                    items: toItemsSnapshot(localItems),
                },
                {
                    onSuccess: () => toast.success(t("itemsSaved")),
                    onError: () => toast.error(t("itemsError")),
                }
            );
        }
    };

    const removeCollection = () => {
        if (!collection) return;
        const title = getTranslation(collection.translations, "nl")?.title || collection.slug;
        const ok = window.confirm(t("deleteConfirm", { title }));
        if (!ok) return;

        deleteCollection.mutate(collection.id, {
            onSuccess: () => {
                toast.success(t("deleteCollection"));
                router.push("/cms/collections");
            },
            onError: () => toast.error(t("metadataError")),
        });
    };

    if (isLoading || !collection || !metadata) {
        return <div className="text-muted-foreground p-4 text-sm">{t("loading")}</div>;
    }

    return (
        <div className="h-full space-y-6 overflow-auto p-4 pb-8">
            <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => router.push("/cms/collections")}>
                    {t("backToCollections")}
                </Button>
                <Button variant="outline" onClick={removeCollection}>
                    {t("deleteCollection")}
                </Button>
                <Button className="ml-auto" onClick={save} disabled={!canSave}>
                    {isSaving ? t("saving") : t("save")}
                </Button>
            </div>

            <section className="space-y-3 rounded-md border p-4">
                <h2 className="font-medium">{t("title")}</h2>
                <div className="grid gap-3 md:grid-cols-2">
                    {(
                        [
                            ["titleNl", metadata.translations[0]?.title ?? "", setTitleNl],
                            ["titleEn", metadata.translations[1]?.title ?? "", setTitleEn],
                            [
                                "descriptionNl",
                                metadata.translations[0]?.description ?? "",
                                setDescriptionNl,
                            ],
                            [
                                "descriptionEn",
                                metadata.translations[1]?.description ?? "",
                                setDescriptionEn,
                            ],
                        ] as const
                    ).map(([label, value, setter]) => (
                        <div key={label} className="space-y-1">
                            <Label>{t(label)}</Label>
                            <Input value={value} onChange={(e) => setter(e.target.value)} />
                        </div>
                    ))}
                    <div className="space-y-1 md:col-span-2">
                        <Label>{t("slug")}</Label>
                        <div className="flex gap-2">
                            <Input
                                value={metadata.slug}
                                onChange={(event) => {
                                    setSlugEdited(true);
                                    setLocalSlug(slugify(event.target.value));
                                }}
                            />
                            <Button type="button" variant="outline" onClick={copyShareableLink}>
                                {t("copyLink")}
                            </Button>
                        </div>
                        <p className="text-muted-foreground text-xs">
                            {origin}/en/collections/{metadata.slug}
                        </p>
                    </div>
                </div>
            </section>

            <section className="space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-medium">{t("itemsTitle", { count: localItems.length })}</h2>
                </div>
                {localItems.length === 0 ? (
                    <div className="text-muted-foreground space-y-2 text-sm">
                        <p>{t("noItems")}</p>
                        <Link href="/cms/productions" className="underline">
                            {t("goToContent")}
                        </Link>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={groupedItems.map((g) => g.item.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2">
                                {groupedItems.map((group) => (
                                    <SortableItemRow
                                        key={group.item.id}
                                        group={group}
                                        renderItem={renderItemProps}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </section>
        </div>
    );
}
