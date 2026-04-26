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
import { LanguageSelector } from "@/components/cms/language-selector";
import { Media } from "@/types/models/media.types";

type Lang = "nl" | "en" | "fr";

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
    const tMedia = useTranslations("Cms.ProductionMedia");
    const [form, setForm] = useState<Partial<Media>>({});
    const [activeLang, setActiveLang] = useState<Lang>("nl");

    useEffect(() => {
        if (media) {
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

    const altKey = `altText${capitalize(activeLang)}` as keyof Media;
    const creditKey = `credit${capitalize(activeLang)}` as keyof Media;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="border-foreground/20 flex flex-col gap-0 overflow-y-auto border-l p-0 sm:max-w-lg">
                <SheetHeader className="border-foreground/10 border-b px-6 pt-6 pb-4">
                    <SheetDescription className="text-muted-foreground font-mono text-[9px] tracking-[2px] uppercase">
                        {t("editMedia")}
                    </SheetDescription>
                    <SheetTitle className="font-display text-xl font-bold tracking-tight">
                        {media.s3Key.split("/").pop() ?? media.id}
                    </SheetTitle>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-6 py-6">
                    <div className="space-y-4">
                        <div className="border-foreground/10 flex items-center justify-between border-b pb-2">
                            <h3 className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                                {tMedia("editMetadata")}
                            </h3>
                            <LanguageSelector
                                activeLang={activeLang}
                                onChange={setActiveLang}
                                languages={["nl", "en", "fr"]}
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs">{tMedia("altText")}</Label>
                                <Input
                                    value={(form[altKey] as string | null) ?? ""}
                                    onChange={(e) => updateField(altKey, e.target.value)}
                                    placeholder={activeLang.toUpperCase()}
                                    className="h-7 text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs">{tMedia("credit")}</Label>
                                <Input
                                    value={(form[creditKey] as string | null) ?? ""}
                                    onChange={(e) => updateField(creditKey, e.target.value)}
                                    placeholder={activeLang.toUpperCase()}
                                    className="h-7 text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            disabled={isSaving}
                        >
                            {tMedia("cancel")}
                        </Button>
                        <Button type="submit" size="sm" disabled={isSaving}>
                            {isSaving ? (
                                <Spinner className="mr-1.5 size-3" />
                            ) : (
                                <Save className="mr-1.5 size-3.5" />
                            )}
                            {tMedia("save")}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
