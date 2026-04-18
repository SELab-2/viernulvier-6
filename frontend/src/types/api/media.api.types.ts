import { components } from "@/types/api/generated";
import { PaginatedListResponse } from "./api.types";

export type MediaPayloadResponse = components["schemas"]["MediaPayload"];
export type MediaVariantPayloadResponse = components["schemas"]["MediaVariantPayload"];
export type GetEntityMediaResponse = components["schemas"]["MediaPayload"][];
export type GetMediaByIdResponse = components["schemas"]["MediaPayload"];
export type AttachMediaResponse = components["schemas"]["MediaPayload"];
export type GenerateUploadUrlResponse = components["schemas"]["UploadUrlResponse"];
export type GetAllMediaResponse = PaginatedListResponse<"get_all_media">;
export type AttachMediaRequestType = components["schemas"]["AttachMediaRequest"];
export type LinkMediaRequestType = components["schemas"]["LinkMediaRequest"];
export type UploadUrlRequestType = components["schemas"]["UploadUrlRequest"];
export type UpdateMediaRequestType = components["schemas"]["MediaPayload"];

export type PaginatedMediaResponse = GetAllMediaResponse;
