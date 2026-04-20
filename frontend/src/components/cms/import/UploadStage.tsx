"use client";

import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/routing";
import { useCreateImportSession, useEntityTypes } from "@/hooks/api/useImport";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export function UploadStage() {
    const t = useTranslations("Cms.Import");
    const router = useRouter();

    const [file, setFile] = useState<File | null>(null);
    const [entityType, setEntityType] = useState<string>("");
    const [isDragging, setIsDragging] = useState(false);
    const [fileSizeError, setFileSizeError] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        data: entityTypes,
        isPending: entityTypesLoading,
        isError: entityTypesError,
    } = useEntityTypes();

    const {
        mutateAsync: createSession,
        isPending: isSubmitting,
        error: mutationError,
    } = useCreateImportSession();

    function handleFileChange(incoming: File | null) {
        if (!incoming) {
            return;
        }
        if (incoming.size > MAX_FILE_SIZE_BYTES) {
            setFileSizeError(true);
            setFile(null);
            return;
        }
        setFileSizeError(false);
        setFile(incoming);
    }

    function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
        handleFileChange(e.target.files?.[0] ?? null);
    }

    function handleDragOver(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragging(true);
    }

    function handleDragLeave(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragging(false);
    }

    function handleDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragging(false);
        handleFileChange(e.dataTransfer.files?.[0] ?? null);
    }

    async function handleSubmit() {
        if (!file || !entityType) {
            return;
        }
        const result = await createSession({ file, entityType });
        router.push(`/cms/import?session=${result.sessionId}`);
    }

    const submitDisabled =
        !file || !entityType || isSubmitting || entityTypesError || entityTypesLoading;

    return (
        <div className="mx-auto max-w-lg space-y-6 pt-4">
            <div>
                <h2 className="text-base font-semibold">{t("upload.title")}</h2>
                <p className="text-muted-foreground mt-1 text-sm">{t("upload.description")}</p>
            </div>

            {/* Drop zone */}
            <div>
                <p className="mb-1.5 text-sm font-medium">{t("upload.fileLabel")}</p>
                <div
                    role="button"
                    tabIndex={0}
                    aria-label={t("upload.fileLabel")}
                    className={[
                        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors",
                        isDragging
                            ? "border-foreground bg-accent"
                            : "border-border hover:border-foreground/40",
                    ].join(" ")}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            fileInputRef.current?.click();
                        }
                    }}
                >
                    {file ? (
                        <span className="text-sm font-medium">{file.name}</span>
                    ) : (
                        <span className="text-muted-foreground text-sm">
                            {t("upload.description")}
                        </span>
                    )}
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={handleInputChange}
                    data-testid="csv-file-input"
                />
            </div>

            {/* Entity type select */}
            <div>
                <p className="mb-1.5 text-sm font-medium">{t("upload.entityTypeLabel")}</p>
                {entityTypesLoading ? (
                    <Skeleton className="h-9 w-full" />
                ) : (
                    <Select
                        value={entityType}
                        onValueChange={setEntityType}
                        disabled={entityTypesError}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={t("upload.entityTypePlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                            {(entityTypes ?? []).map((type) => (
                                <SelectItem key={type} value={type}>
                                    {type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {/* Error panels */}
            {fileSizeError && (
                <p role="alert" className="text-destructive text-sm">
                    {t("errors.fileTooLarge")}
                </p>
            )}
            {entityTypesError && !fileSizeError && (
                <p role="alert" className="text-destructive text-sm">
                    {t("errors.entityTypesFailed")}
                </p>
            )}
            {mutationError && !fileSizeError && (
                <p role="alert" className="text-destructive text-sm">
                    {mutationError instanceof Error
                        ? mutationError.message
                        : t("errors.uploadFailed")}
                </p>
            )}

            {/* Submit */}
            <Button onClick={handleSubmit} disabled={Boolean(submitDisabled)} className="w-full">
                {isSubmitting ? t("upload.submitting") : t("upload.submit")}
            </Button>
        </div>
    );
}
