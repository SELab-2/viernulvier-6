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
                        <div className="border-foreground/10 flex items-center justify-between border-b pb-2">
                            <h2 className="text-sm font-semibold">{t("metadataSection")}</h2>
                            <LanguageSelector
                                activeLang={activeLang}
                                onChange={setActiveLang}
                                languages={["nl", "en", "fr"]}
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                                    {t("altText")}
                                </Label>
                                <Input
                                    value={(form[altKey] as string | null) ?? ""}
                                    onChange={(e) => updateField(altKey, e.target.value)}
                                    placeholder={activeLang.toUpperCase()}
                                    className="h-9 rounded-none border text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                                    {t("credit")}
                                </Label>
                                <Input
                                    value={(form[creditKey] as string | null) ?? ""}
                                    onChange={(e) => updateField(creditKey, e.target.value)}
                                    placeholder={activeLang.toUpperCase()}
                                    className="h-9 rounded-none border text-sm"
                                />
                            </div>
                        </div>
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

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
