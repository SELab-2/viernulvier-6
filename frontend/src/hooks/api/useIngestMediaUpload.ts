"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api-client";
import { mapUploadUrlInput, mapUploadUrlResult, mapMedia } from "@/mappers/media.mapper";
import { GenerateUploadUrlResponse } from "@/types/api/media.api.types";
import { Media } from "@/types/models/media.types";

async function sha256(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

type CheckMediaResponse = {
    exists: boolean;
    media?: {
        id: string;
        [key: string]: unknown;
    };
};

/**
 * Upload flow for the media ingest page with content-based deduplication.
 *
 * 1. Computes SHA256 checksum of the file
 * 2. Checks if a media with that checksum already exists
 * 3. If yes: shows a toast, uploads to S3, and backend updates metadata on existing media
 * 4. If no: normal upload flow
 */
export function useIngestMediaUpload() {
    const t = useTranslations("Cms.Ingest");

    return useMutation({
        mutationFn: async ({
            file,
            metadata,
        }: {
            file: File;
            metadata?: {
                altTextNl?: string | null;
                altTextEn?: string | null;
                altTextFr?: string | null;
                creditNl?: string | null;
                creditEn?: string | null;
                creditFr?: string | null;
            };
        }): Promise<Media> => {
            // 1. Compute checksum
            const checksum = await sha256(file);

            // 2. Check for existing media by checksum
            const { data: checkData } = await api.post<CheckMediaResponse>("/media/check", {
                checksum,
            });

            const isDuplicate = checkData.exists;
            if (isDuplicate) {
                toast.info(t("duplicateUpload"));
            }

            // 3. Generate presigned URL
            const { data: urlData } = await api.post<GenerateUploadUrlResponse>(
                "/media/upload-url",
                mapUploadUrlInput({
                    filename: file.name,
                    mimeType: file.type,
                    fileSize: file.size,
                })
            );
            const { s3Key, uploadUrl, uploadToken } = mapUploadUrlResult(urlData);

            // 4. Upload to S3
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

            // 5. Register media in backend (deduplication + metadata update handled server-side)
            const { data: mediaData } = await api.post("/media", {
                s3_key: s3Key,
                upload_token: uploadToken,
                mime_type: file.type,
                file_size: file.size,
                checksum,
                ...metadata,
            });

            return mapMedia(mediaData);
        },
    });
}
