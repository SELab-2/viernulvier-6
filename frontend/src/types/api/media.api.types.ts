import { components } from "@/types/api/generated";

export type MediaPayloadResponse = components["schemas"]["MediaPayload"];
export type MediaVariantPayloadResponse = components["schemas"]["MediaVariantPayload"];
export type GetEntityMediaResponse = components["schemas"]["MediaPayload"][];
export type GetMediaByIdResponse = components["schemas"]["MediaPayload"];
export type AttachMediaResponse = components["schemas"]["MediaPayload"];
export type GenerateUploadUrlResponse = components["schemas"]["UploadUrlResponse"];
export type GetAllMediaResponse = components["schemas"]["MediaPayload"][];
export type AttachMediaRequestType = components["schemas"]["AttachMediaRequest"];
export type UploadUrlRequestType = components["schemas"]["UploadUrlRequest"];
