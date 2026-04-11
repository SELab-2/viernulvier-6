import { PaginatedResult } from "@/types/api/api.types";
import {
    AttachMediaRequestType,
    MediaPayloadResponse,
    MediaVariantPayloadResponse,
    PaginatedMediaResponse,
    UploadUrlRequestType,
    GenerateUploadUrlResponse,
} from "@/types/api/media.api.types";
import {
    AttachMediaInput,
    Media,
    MediaVariant,
    UploadUrlInput,
    UploadUrlResult,
} from "@/types/models/media.types";

import { toNullable } from "./utils";

export const mapMediaVariant = (v: MediaVariantPayloadResponse): MediaVariant => ({
    id: v.id,
    mediaId: v.media_id,
    variantKind: v.variant_kind,
    cropName: toNullable(v.crop_name),
    url: toNullable(v.url),
    mimeType: toNullable(v.mime_type),
    fileSize: toNullable(v.file_size),
    width: toNullable(v.width),
    height: toNullable(v.height),
    checksum: toNullable(v.checksum),
    sourceUri: toNullable(v.source_uri),
});

export const mapMedia = (m: MediaPayloadResponse): Media => ({
    id: m.id,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
    url: toNullable(m.url),
    mimeType: m.mime_type,
    fileSize: toNullable(m.file_size),
    width: toNullable(m.width),
    height: toNullable(m.height),
    checksum: toNullable(m.checksum),
    altTextNl: toNullable(m.alt_text_nl),
    altTextEn: toNullable(m.alt_text_en),
    altTextFr: toNullable(m.alt_text_fr),
    descriptionNl: toNullable(m.description_nl),
    descriptionEn: toNullable(m.description_en),
    descriptionFr: toNullable(m.description_fr),
    creditNl: toNullable(m.credit_nl),
    creditEn: toNullable(m.credit_en),
    creditFr: toNullable(m.credit_fr),
    geoLatitude: toNullable(m.geo_latitude),
    geoLongitude: toNullable(m.geo_longitude),
    parentId: toNullable(m.parent_id),
    derivativeType: toNullable(m.derivative_type),
    galleryType: toNullable(m.gallery_type),
    sourceSystem: m.source_system,
    sourceUri: toNullable(m.source_uri),
    crops: (m.crops ?? []).map(mapMediaVariant),
});

export const mapMediaList = (list: MediaPayloadResponse[]): Media[] => list.map(mapMedia);

export const mapPaginatedMediaResult = (
    response: PaginatedMediaResponse
): PaginatedResult<Media> => ({
    data: mapMediaList(response.data),
    nextCursor: response.next_cursor ?? null,
});

export const mapAttachMediaInput = (input: AttachMediaInput): AttachMediaRequestType => ({
    s3_key: input.s3Key,
    mime_type: input.mimeType,
    role: input.role,
    sort_order: input.sortOrder,
    is_cover_image: input.isCoverImage,
    alt_text_nl: input.altTextNl,
    alt_text_en: input.altTextEn,
    alt_text_fr: input.altTextFr,
    description_nl: input.descriptionNl,
    description_en: input.descriptionEn,
    description_fr: input.descriptionFr,
    credit_nl: input.creditNl,
    credit_en: input.creditEn,
    credit_fr: input.creditFr,
    width: input.width,
    height: input.height,
    file_size: input.fileSize,
    checksum: input.checksum,
    geo_latitude: input.geoLatitude,
    geo_longitude: input.geoLongitude,
    parent_id: input.parentId,
    derivative_type: input.derivativeType,
    gallery_type: input.galleryType,
});

export const mapUploadUrlInput = (input: UploadUrlInput): UploadUrlRequestType => ({
    filename: input.filename,
    mime_type: input.mimeType,
});

export const mapUploadUrlResult = (response: GenerateUploadUrlResponse): UploadUrlResult => ({
    s3Key: response.s3_key,
    uploadUrl: response.upload_url,
    expiresIn: response.expires_in,
});

export const mapMediaVariantToPayload = (v: MediaVariant): MediaVariantPayloadResponse => ({
    id: v.id,
    media_id: v.mediaId,
    variant_kind: v.variantKind,
    crop_name: v.cropName,
    url: v.url,
    mime_type: v.mimeType,
    file_size: v.fileSize,
    width: v.width,
    height: v.height,
    checksum: v.checksum,
    source_uri: v.sourceUri,
});

export const mapMediaToPayload = (m: Media): MediaPayloadResponse => ({
    id: m.id,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
    url: m.url,
    mime_type: m.mimeType,
    file_size: m.fileSize,
    width: m.width,
    height: m.height,
    checksum: m.checksum,
    alt_text_nl: m.altTextNl,
    alt_text_en: m.altTextEn,
    alt_text_fr: m.altTextFr,
    description_nl: m.descriptionNl,
    description_en: m.descriptionEn,
    description_fr: m.descriptionFr,
    credit_nl: m.creditNl,
    credit_en: m.creditEn,
    credit_fr: m.creditFr,
    geo_latitude: m.geoLatitude,
    geo_longitude: m.geoLongitude,
    parent_id: m.parentId,
    derivative_type: m.derivativeType,
    gallery_type: m.galleryType,
    source_system: m.sourceSystem,
    source_uri: m.sourceUri,
    crops: m.crops.map(mapMediaVariantToPayload),
});
