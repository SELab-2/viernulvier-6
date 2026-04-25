"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Upload, X } from "lucide-react";
import Image from "next/image";
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
import { useIngestMediaUpload } from "@/hooks/api/useIngestMediaUpload";

interface MediaUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function MediaUploadDialog({ open, onOpenChange, onSuccess }: MediaUploadDialogProps) {
    const t = useTranslations("Cms.Ingest");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [altTextNl, setAltTextNl] = useState("");
    const [altTextEn, setAltTextEn] = useState("");
    const [altTextFr, setAltTextFr] = useState("");
    const [creditNl, setCreditNl] = useState("");
    const [creditEn, setCreditEn] = useState("");
    const [creditFr, setCreditFr] = useState("");

    const upload = useIngestMediaUpload();

    const reset = useCallback(() => {
        setFile(null);
        setPreview(null);
        setAltTextNl("");
        setAltTextEn("");
        setAltTextFr("");
        setCreditNl("");
        setCreditEn("");
        setCreditFr("");
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        setFile(selected);
        if (selected.type.startsWith("image/")) {
            setPreview(URL.createObjectURL(selected));
        } else {
            setPreview(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        try {
            await upload.mutateAsync({
                file,
                metadata: {
                    altTextNl: altTextNl || null,
                    altTextEn: altTextEn || null,
                    altTextFr: altTextFr || null,
                    creditNl: creditNl || null,
                    creditEn: creditEn || null,
                    creditFr: creditFr || null,
                },
            });
            reset();
            onOpenChange(false);
            onSuccess?.();
        } catch {
            // Error is handled by the hook / toast
        }
    };

    const handleClose = () => {
        if (!upload.isPending) {
            reset();
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg rounded-none border">
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
                    {!file ? (
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
                            >
                                <X className="h-3 w-3" />
                            </button>
                            {preview ? (
                                <div className="relative aspect-video w-full overflow-hidden">
                                    <Image
                                        src={preview}
                                        alt={file.name}
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-8">
                                    <span className="text-muted-foreground font-body text-sm">
                                        {file.name}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,application/pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    {/* Metadata fields */}
                    {file && (
                        <div className="space-y-4">
                            <LocalizedInputs
                                label={t("altText")}
                                nl={altTextNl}
                                en={altTextEn}
                                fr={altTextFr}
                                onChangeNl={setAltTextNl}
                                onChangeEn={setAltTextEn}
                                onChangeFr={setAltTextFr}
                            />
                            <LocalizedInputs
                                label={t("credit")}
                                nl={creditNl}
                                en={creditEn}
                                fr={creditFr}
                                onChangeNl={setCreditNl}
                                onChangeEn={setCreditEn}
                                onChangeFr={setCreditFr}
                            />
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
                        {t("cancel")}
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleUpload}
                        disabled={!file || upload.isPending}
                        className="rounded-none font-mono text-[10px] tracking-[1.5px] uppercase"
                    >
                        {upload.isPending ? (
                            <Spinner className="mr-2 h-3 w-3" />
                        ) : (
                            <Upload className="mr-2 h-3.5 w-3.5" />
                        )}
                        {t("upload")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function LocalizedInputs({
    label,
    nl,
    en,
    fr,
    onChangeNl,
    onChangeEn,
    onChangeFr,
}: {
    label: string;
    nl: string;
    en: string;
    fr: string;
    onChangeNl: (v: string) => void;
    onChangeEn: (v: string) => void;
    onChangeFr: (v: string) => void;
}) {
    return (
        <div className="space-y-2">
            <Label className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                {label}
            </Label>
            <div className="grid grid-cols-3 gap-2">
                <Input
                    placeholder="NL"
                    value={nl}
                    onChange={(e) => onChangeNl(e.target.value)}
                    className="h-9 rounded-none border text-sm"
                />
                <Input
                    placeholder="EN"
                    value={en}
                    onChange={(e) => onChangeEn(e.target.value)}
                    className="h-9 rounded-none border text-sm"
                />
                <Input
                    placeholder="FR"
                    value={fr}
                    onChange={(e) => onChangeFr(e.target.value)}
                    className="h-9 rounded-none border text-sm"
                />
            </div>
        </div>
    );
}
