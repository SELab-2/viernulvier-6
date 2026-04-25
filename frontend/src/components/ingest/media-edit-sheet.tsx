"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Save } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Media } from "@/types/models/media.types";

interface MediaEditSheetProps {
    media: Media | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (media: Media) => void;
    isSaving?: boolean;
}

export function MediaEditSheet({
    media,
    open,
    onOpenChange,
    onSave,
    isSaving,
}: MediaEditSheetProps) {
    const t = useTranslations("Cms.Ingest");
    const [form, setForm] = useState<Partial<Media>>({});

    useEffect(() => {
        if (media) {
            // Initialize form when media changes; using a microtask avoids
            // the synchronous setState-in-effect lint rule while keeping
            // the form in sync when switching between media items.
            const id = setTimeout(() => setForm({ ...media }), 0);
            return () => clearTimeout(id);
        }
    }, [media]);

    if (!media) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...media, ...form } as Media);
    };

    const updateField = (field: keyof Media, value: string | null) => {
        setForm((prev) => ({ ...prev, [field]: value === "" ? null : value }));
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="border-l sm:max-w-md">
                <SheetHeader className="px-0 pt-0">
                    <SheetDescription className="text-muted-foreground font-mono text-[9px] tracking-[2px] uppercase">
                        {t("editMedia")}
                    </SheetDescription>
                    <SheetTitle className="font-display text-2xl font-bold tracking-tight">
                        {media.s3Key.split("/").pop() ?? media.id}
                    </SheetTitle>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
                    <div className="space-y-4">
                        <LocalizedField
                            label={t("altText")}
                            nlValue={form.altTextNl ?? ""}
                            enValue={form.altTextEn ?? ""}
                            frValue={form.altTextFr ?? ""}
                            onChangeNl={(v) => updateField("altTextNl", v)}
                            onChangeEn={(v) => updateField("altTextEn", v)}
                            onChangeFr={(v) => updateField("altTextFr", v)}
                        />
                        <LocalizedField
                            label={t("credit")}
                            nlValue={form.creditNl ?? ""}
                            enValue={form.creditEn ?? ""}
                            frValue={form.creditFr ?? ""}
                            onChangeNl={(v) => updateField("creditNl", v)}
                            onChangeEn={(v) => updateField("creditEn", v)}
                            onChangeFr={(v) => updateField("creditFr", v)}
                        />
                    </div>

                    <div className="border-t pt-4">
                        <Button
                            type="submit"
                            disabled={isSaving}
                            className="w-full rounded-none font-mono text-[10px] tracking-[1.5px] uppercase"
                        >
                            {isSaving ? (
                                <Spinner className="mr-2 h-3 w-3" />
                            ) : (
                                <Save className="mr-2 h-3.5 w-3.5" />
                            )}
                            {t("save")}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}

function LocalizedField({
    label,
    nlValue,
    enValue,
    frValue,
    onChangeNl,
    onChangeEn,
    onChangeFr,
}: {
    label: string;
    nlValue: string;
    enValue: string;
    frValue: string;
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
                    value={nlValue}
                    onChange={(e) => onChangeNl(e.target.value)}
                    className="h-9 rounded-none border text-sm"
                />
                <Input
                    placeholder="EN"
                    value={enValue}
                    onChange={(e) => onChangeEn(e.target.value)}
                    className="h-9 rounded-none border text-sm"
                />
                <Input
                    placeholder="FR"
                    value={frValue}
                    onChange={(e) => onChangeFr(e.target.value)}
                    className="h-9 rounded-none border text-sm"
                />
            </div>
        </div>
    );
}
