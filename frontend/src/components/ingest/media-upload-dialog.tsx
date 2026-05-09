"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Upload, X, ImageIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { LanguageSelector } from "@/components/cms/language-selector";
import { useIngestMediaUpload } from "@/hooks/api/useIngestMediaUpload";

type Lang = "nl" | "en" | "fr";

type FileMeta = {
    altText: Record<Lang, string>;
    credit: Record<Lang, string>;
};

interface MediaUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const emptyMeta = (): FileMeta => ({
    altText: { nl: "", en: "", fr: "" },
    credit: { nl: "", en: "", fr: "" },
});

export function MediaUploadDialog({ open, onOpenChange, onSuccess }: MediaUploadDialogProps) {
    const t = useTranslations("Cms.Ingest");
    const tMedia = useTranslations("Cms.ProductionMedia");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<Map<string, string>>(new Map());
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [activeLang, setActiveLang] = useState<Lang>("nl");
    const [filesMeta, setFilesMeta] = useState<FileMeta[]>([]);

    const upload = useIngestMediaUpload();

    const reset = useCallback(() => {
        setFiles([]);
        setPreviews(new Map());
        setSelectedIndex(0);
        setFilesMeta([]);
        setActiveLang("nl");
    }, []);

    const addPreviews = useCallback((newFiles: File[]) => {
        const map = new Map<string, string>();
        newFiles.forEach((f) => {
            if (f.type.startsWith("image/")) {
                map.set(f.name + f.size, URL.createObjectURL(f));
            }
        });
        setPreviews(map);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files ?? []);
        if (selected.length === 0) return;

        const images = selected.filter((f) => f.type.startsWith("image/"));
        if (images.length === 0) return;

        setFiles((prev) => {
            const combined = [...prev, ...images];
            addPreviews(combined);
            return combined;
        });

        setFilesMeta((prev) => [...prev, ...images.map(() => emptyMeta())]);
        // Select the first newly added file
        setSelectedIndex((prev) => (prev === 0 && files.length === 0 ? 0 : files.length));
    };

    const removeFile = (index: number) => {
        setFiles((prev) => {
            const next = prev.filter((_, i) => i !== index);
            addPreviews(next);
            return next;
        });
        setFilesMeta((prev) => prev.filter((_, i) => i !== index));
        setSelectedIndex((prev) => {
            if (prev >= index && prev > 0) return prev - 1;
            return prev;
        });
    };

    const updateMeta = (index: number, field: "altText" | "credit", lang: Lang, value: string) => {
        setFilesMeta((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: { ...next[index][field], [lang]: value } };
            return next;
        });
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const meta = filesMeta[i] ?? emptyMeta();
            try {
                await upload.mutateAsync({
                    file,
                    metadata: {
                        altTextNl: meta.altText.nl || null,
                        altTextEn: meta.altText.en || null,
                        altTextFr: meta.altText.fr || null,
                        creditNl: meta.credit.nl || null,
                        creditEn: meta.credit.en || null,
                        creditFr: meta.credit.fr || null,
                    },
                });
            } catch {
                // Error is handled by the hook / toast
            }
        }

        reset();
        onOpenChange(false);
        onSuccess?.();
    };

    const handleClose = () => {
        if (!upload.isPending) {
            reset();
            onOpenChange(false);
        }
    };

    const currentMeta = filesMeta[selectedIndex] ?? emptyMeta();
    const currentFile = files[selectedIndex];
    const currentPreview = currentFile ? previews.get(currentFile.name + currentFile.size) : null;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-xl rounded-none border">
                <DialogHeader>
                    <DialogDescription className="text-muted-foreground font-mono text-[9px] tracking-[2px] uppercase">
                        {t("uploadMedia")}
                    </DialogDescription>
                    <DialogTitle className="font-display text-2xl font-bold tracking-tight">
                        {t("uploadTitle")}
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-4 flex flex-col gap-5">
                    {/* File select area */}
                    {files.length === 0 ? (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/[0.04] flex flex-col items-center justify-center gap-2 border border-dashed py-8 transition-colors"
                            type="button"
                        >
                            <Upload className="text-muted-foreground h-6 w-6" />
                            <span className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
                                {t("selectFile")}
                            </span>
                        </button>
                    ) : (
                        <div className="border-foreground/10 bg-foreground/[0.02] relative border p-4">
                            <button
                                onClick={() => {
                                    reset();
                                }}
                                className="hover:bg-destructive hover:text-destructive-foreground absolute top-2 right-2 flex h-6 w-6 items-center justify-center border transition-colors"
                                type="button"
                                aria-label="Clear all"
                            >
                                <X className="h-3 w-3" />
                            </button>

                            <div className="grid grid-cols-5 gap-2">
                                {files.map((file, i) => {
                                    const preview = previews.get(file.name + file.size);
                                    const isSelected = i === selectedIndex;
                                    return (
                                        <button
                                            key={file.name + file.size + i}
                                            onClick={() => setSelectedIndex(i)}
                                            className={cn(
                                                "border-foreground/10 group relative aspect-square overflow-hidden border transition-colors",
                                                isSelected &&
                                                    "border-foreground ring-foreground ring-1"
                                            )}
                                            type="button"
                                        >
                                            {preview ? (
                                                <Image
                                                    src={preview}
                                                    alt={file.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <ImageIcon className="text-muted-foreground h-4 w-4" />
                                                </div>
                                            )}
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeFile(i);
                                                }}
                                                className="bg-background/80 hover:bg-destructive hover:text-destructive-foreground absolute top-1 right-1 flex h-5 w-5 cursor-pointer items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
                                                role="button"
                                                aria-label="Remove"
                                            >
                                                <X className="h-3 w-3" />
                                            </span>
                                            {isSelected && (
                                                <div className="bg-foreground text-background absolute right-0 bottom-0 left-0 px-1 py-0.5 text-center font-mono text-[7px] uppercase">
                                                    editing
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                                {/* Add more button */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-foreground/10 hover:bg-foreground/[0.04] flex aspect-square items-center justify-center border border-dashed transition-colors"
                                    type="button"
                                >
                                    <Upload className="text-muted-foreground h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    {/* Metadata for selected image */}
                    {files.length > 0 && currentFile && (
                        <div className="space-y-4">
                            <div className="border-foreground/10 flex items-center justify-between border-b pb-2">
                                <div className="flex items-center gap-2">
                                    <div className="border-foreground/10 relative h-8 w-8 overflow-hidden border">
                                        {currentPreview ? (
                                            <Image
                                                src={currentPreview}
                                                alt={currentFile.name}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <ImageIcon className="text-muted-foreground h-4 w-4" />
                                        )}
                                    </div>
                                    <h2 className="text-sm font-semibold">
                                        {tMedia("editMetadata")} —{" "}
                                        <span className="text-muted-foreground font-mono text-[10px]">
                                            {currentFile.name}
                                        </span>
                                    </h2>
                                </div>
                                <LanguageSelector
                                    activeLang={activeLang}
                                    onChange={setActiveLang}
                                    languages={["nl", "en", "fr"]}
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                                        {tMedia("altText")}
                                    </Label>
                                    <Input
                                        value={currentMeta.altText[activeLang]}
                                        onChange={(e) =>
                                            updateMeta(
                                                selectedIndex,
                                                "altText",
                                                activeLang,
                                                e.target.value
                                            )
                                        }
                                        placeholder={activeLang.toUpperCase()}
                                        className="h-9 rounded-none border text-sm"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                                        {tMedia("credit")}
                                    </Label>
                                    <Input
                                        value={currentMeta.credit[activeLang]}
                                        onChange={(e) =>
                                            updateMeta(
                                                selectedIndex,
                                                "credit",
                                                activeLang,
                                                e.target.value
                                            )
                                        }
                                        placeholder={activeLang.toUpperCase()}
                                        className="h-9 rounded-none border text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClose}
                        disabled={upload.isPending}
                        className="rounded-none font-mono text-[10px] tracking-[1.5px] uppercase"
                    >
                        {tMedia("cancel")}
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleUpload}
                        disabled={files.length === 0 || upload.isPending}
                        className="rounded-none font-mono text-[10px] tracking-[1.5px] uppercase"
                    >
                        {upload.isPending ? (
                            <Spinner className="mr-2 h-3 w-3" />
                        ) : (
                            <Upload className="mr-2 h-3.5 w-3.5" />
                        )}
                        {tMedia("upload")} {files.length > 0 && `(${files.length})`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
