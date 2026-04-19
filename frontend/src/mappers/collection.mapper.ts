import {
    CollectionCreateRequest,
    CollectionItemsBulkRequest,
    CollectionResponse,
    CollectionUpdateRequest,
} from "@/types/api/collection.api.types";
import {
    Collection,
    CollectionCreateInput,
    CollectionItem,
    CollectionItemTranslation,
    CollectionItemsBulkInput,
    CollectionRow,
    CollectionTranslation,
} from "@/types/models/collection.types";

const toNullable = <T>(value: T | null | undefined): T | null => value ?? null;

const mapTranslation = (translation: {
    language_code: string;
    title: string;
    description: string;
}): CollectionTranslation => ({
    languageCode: translation.language_code,
    title: translation.title,
    description: translation.description,
});

const mapItemTranslation = (translation: {
    language_code: string;
    comment?: string | null;
}): CollectionItemTranslation => ({
    languageCode: translation.language_code,
    comment: toNullable(translation.comment),
});

const mapItem = (item: CollectionResponse["items"][number]): CollectionItem => ({
    id: item.id,
    contentId: item.content_id,
    contentType: item.content_type,
    position: item.position,
    translations: (item.translations ?? []).map(mapItemTranslation),
    createdAt: item.created_at,
});

export const mapCollection = (response: CollectionResponse): Collection => ({
    id: response.id,
    slug: response.slug,
    translations: (response.translations ?? []).map(mapTranslation),
    items: (response.items ?? []).map(mapItem),
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    coverImageUrl: toNullable(response.cover_image_url),
});

export const mapCollections = (response: CollectionResponse[]): Collection[] =>
    response.map(mapCollection);

export const toCollectionRow = (collection: Collection): CollectionRow => {
    const nl = collection.translations.find((t) => t.languageCode === "nl");
    const en = collection.translations.find((t) => t.languageCode === "en");
    return {
        id: collection.id,
        slug: collection.slug,
        titleNl: nl?.title ?? "",
        titleEn: en?.title ?? "",
        descriptionNl: nl?.description ?? "",
        descriptionEn: en?.description ?? "",
        itemCount: collection.items.length,
        updatedAt: collection.updatedAt,
    };
};

const toApiTranslation = (t: CollectionTranslation) => ({
    language_code: t.languageCode,
    title: t.title,
    description: t.description,
});

const toApiItemTranslation = (t: CollectionItemTranslation) => ({
    language_code: t.languageCode,
    comment: t.comment,
});

export const mapCreateInput = (input: CollectionCreateInput): CollectionCreateRequest => ({
    slug: input.slug,
    translations: input.translations.map(toApiTranslation),
});

export const mapUpdateInput = (collection: Collection): CollectionUpdateRequest => ({
    id: collection.id,
    slug: collection.slug,
    created_at: collection.createdAt,
    updated_at: collection.updatedAt,
    items: collection.items.map((item) => ({
        id: item.id,
        content_id: item.contentId,
        content_type: item.contentType,
        position: item.position,
        translations: item.translations.map(toApiItemTranslation),
        created_at: item.createdAt,
    })),
    translations: collection.translations.map(toApiTranslation),
});

export const mapItemsBulkInput = (input: CollectionItemsBulkInput): CollectionItemsBulkRequest => ({
    items: input.items.map((item) => ({
        id: item.id,
        position: item.position,
        translations: item.translations.map(toApiItemTranslation),
    })),
});
