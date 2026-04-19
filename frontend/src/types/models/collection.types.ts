export type CollectionContentType =
    | "production"
    | "event"
    | "blogpost"
    | "artist"
    | "location"
    | "media";

export type CollectionTranslation = {
    languageCode: string;
    title: string;
    description: string;
};

export type CollectionItemTranslation = {
    languageCode: string;
    comment: string | null;
};

export type CollectionItem = {
    id: string;
    contentId: string;
    contentType: CollectionContentType;
    position: number;
    translations: CollectionItemTranslation[];
    createdAt: string;
};

export type Collection = {
    id: string;
    slug: string;
    translations: CollectionTranslation[];
    items: CollectionItem[];
    createdAt: string;
    updatedAt: string;
    coverImageUrl: string | null;
};

export type CollectionCreateInput = {
    slug: string;
    translations: CollectionTranslation[];
};

export type CollectionItemsBulkInput = {
    items: {
        id: string;
        position: number;
        translations: CollectionItemTranslation[];
    }[];
};

export type CollectionRow = {
    id: string;
    slug: string;
    titleNl: string;
    titleEn: string;
    descriptionNl: string;
    descriptionEn: string;
    itemCount: number;
    updatedAt: string;
    coverImageUrl: string | null;
};
