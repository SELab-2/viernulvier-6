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
});

export const mapCollections = (response: CollectionResponse[]): Collection[] =>
    response.map(mapCollection);

export const toCollectionRow = (collection: Collection): CollectionRow => ({
    id: collection.id,
    slug: collection.slug,
    titleNl: collection.translations.find((t) => t.languageCode === "nl")?.title ?? "",
    titleEn: collection.translations.find((t) => t.languageCode === "en")?.title ?? "",
    descriptionNl: collection.translations.find((t) => t.languageCode === "nl")?.description ?? "",
    itemCount: collection.items.length,
    updatedAt: collection.updatedAt,
});

export const mapCreateInput = (input: CollectionCreateInput): CollectionCreateRequest => ({
    slug: input.slug,
    translations: input.translations.map((translation) => ({
        language_code: translation.languageCode,
        title: translation.title,
        description: translation.description,
    })),
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
        translations: item.translations.map((translation) => ({
            language_code: translation.languageCode,
            comment: translation.comment,
        })),
        created_at: item.createdAt,
    })),
    translations: collection.translations.map((translation) => ({
        language_code: translation.languageCode,
        title: translation.title,
        description: translation.description,
    })),
});

export const mapItemsBulkInput = (input: CollectionItemsBulkInput): CollectionItemsBulkRequest => ({
    items: input.items.map((item) => ({
        id: item.id,
        position: item.position,
        translations: item.translations.map((translation) => ({
            language_code: translation.languageCode,
            comment: translation.comment,
        })),
    })),
});
