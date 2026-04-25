"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { mapUploadUrlInput, mapUploadUrlResult, mapMedia } from "@/mappers/media.mapper";
import { GenerateUploadUrlResponse, GetMediaByIdResponse } from "@/types/api/media.api.types";
import { AttachMediaInput, Media } from "@/types/models/media.types";

/**
 * Upload flow for the media ingest page.
 *
 * 1. Generates a presigned S3 URL
 * 2. Uploads the file directly to S3
 * 3. Registers the media record in the backend
 *
 * TODO: Step 3 currently calls POST /media which does not exist yet.
 *       The backend needs a standalone media creation endpoint.
 *       Until then, this hook will fail at step 3 with a 404.
 */
export function useIngestMediaUpload() {
    return useMutation({
        mutationFn: async ({
            file,
            metadata,
        }: {
            file: File;
            metadata?: Omit<AttachMediaInput, "s3Key" | "mimeType" | "uploadToken">;
        }): Promise<Media> => {
            // 1. Generate presigned URL
            const { data: urlData } = await api.post<GenerateUploadUrlResponse>(
                "/media/upload-url",
                mapUploadUrlInput({
                    filename: file.name,
                    mimeType: file.type,
                    fileSize: file.size,
                })
            );
            const { s3Key, uploadUrl, uploadToken } = mapUploadUrlResult(urlData);

            // 2. Upload to S3
            const uploadResponse = await fetch(uploadUrl, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": file.type },
            });
            if (!uploadResponse.ok) {
                throw new Error(
                    `S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`
                );
            }

            // 3. Register media in backend
            // TODO: This endpoint does not exist yet. Backend needs POST /media.
            const { data: mediaData } = await api.post<GetMediaByIdResponse>("/media", {
                s3_key: s3Key,
                upload_token: uploadToken,
                mime_type: file.type,
                file_size: file.size,
                ...metadata,
            });

            return mapMedia(mediaData);
        },
    });
}
