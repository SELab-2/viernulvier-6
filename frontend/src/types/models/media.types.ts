export type MediaVariant = {
    id: string;
    mediaId: string;
    variantKind: string;
    cropName: string | null;
    url: string | null;
    mimeType: string | null;
    fileSize: number | null;
    width: number | null;
    height: number | null;
    checksum: string | null;
    sourceUri: string | null;
};

export type Media = {
    id: string;
    createdAt: string;
    updatedAt: string;
    url: string | null;
    s3Key: string;
    mimeType: string;
    fileSize: number | null;
    width: number | null;
    height: number | null;
    checksum: string | null;
    altTextNl: string | null;
    altTextEn: string | null;
    altTextFr: string | null;
    descriptionNl: string | null;
    descriptionEn: string | null;
    descriptionFr: string | null;
    creditNl: string | null;
    creditEn: string | null;
    creditFr: string | null;
    geoLatitude: number | null;
    geoLongitude: number | null;
    parentId: string | null;
    derivativeType: string | null;
    galleryType: string | null;
    sourceSystem: string;
    sourceUri: string | null;
    crops: MediaVariant[];
};

export type EntityMediaParams = {
    role?: string;
    coverOnly?: boolean;
    includeCrops?: boolean;
    limit?: number;
    offset?: number;
};

export type AttachMediaInput = {
    s3Key: string;
    uploadToken: string;
    mimeType: string;
    role?: string | null;
    sortOrder?: number | null;
    isCoverImage?: boolean | null;
    altTextNl?: string | null;
    altTextEn?: string | null;
    altTextFr?: string | null;
    descriptionNl?: string | null;
    descriptionEn?: string | null;
    descriptionFr?: string | null;
    creditNl?: string | null;
    creditEn?: string | null;
    creditFr?: string | null;
    width?: number | null;
    height?: number | null;
    fileSize?: number | null;
    checksum?: string | null;
    geoLatitude?: number | null;
    geoLongitude?: number | null;
    parentId?: string | null;
    derivativeType?: string | null;
    galleryType?: string | null;
};

export type LinkMediaInput = {
    mediaId: string;
    role?: string | null;
    isCoverImage?: boolean | null;
    sortOrder?: number | null;
};

export type UploadUrlInput = {
    filename: string;
    mimeType: string;
};

export type UploadUrlResult = {
    s3Key: string;
    uploadUrl: string;
    expiresIn: number;
    uploadToken: string;
};

export type MediaSearchParams = {
    q?: string;
    entityType?: string;
    entityId?: string;
    role?: string;
    sort?: "recent" | "oldest" | "relevance";
    cursor?: string | null;
    limit?: number;
};
