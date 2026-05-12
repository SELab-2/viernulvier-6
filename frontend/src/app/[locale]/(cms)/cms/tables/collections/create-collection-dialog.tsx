"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useCreateCollection } from "@/hooks/api";
import { slugify } from "@/lib/slugify";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { CollectionVisibility } from "@/types/models/collection.types";

interface CreateCollectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateCollectionDialog({ open, onOpenChange }: CreateCollectionDialogProps) {
    const t = useTranslations("Cms.Collections");
    const createCollection = useCreateCollection();

    const [titleNl, setTitleNl] = useState("");
    const [titleEn, setTitleEn] = useState("");
    const [manualSlug, setManualSlug] = useState<string | null>(null);
    const [visibility, setVisibility] = useState<CollectionVisibility>("public");

    const slug = manualSlug ?? slugify(titleNl);
    const canSubmit = titleNl.trim().length > 0 && slug.trim().length > 0;

    const handleOpenChange = (next: boolean) => {
        if (!next) {
            setTitleNl("");
            setTitleEn("");
            setManualSlug(null);
            setVisibility("public");
        }
        onOpenChange(next);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSubmit) return;

        createCollection.mutate(
            {
                slug,
                visibility,
                translations: [
                    {
                        languageCode: "nl",
                        title: titleNl,
                        description: "",
                    },
                    {
                        languageCode: "en",
                        title: titleEn,
                        description: "",
                    },
                ],
            },
            {
                onSuccess: () => {
                    toast.success(t("metadataSaved"));
                    handleOpenChange(false);
                },
                onError: () => {
                    toast.error(t("metadataError"));
                },
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("newCollection")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="collection-title-nl">{t("titleNl")}</Label>
                        <Input
                            id="collection-title-nl"
                            value={titleNl}
                            onChange={(event) => setTitleNl(event.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="collection-title-en">{t("titleEn")}</Label>
                        <Input
                            id="collection-title-en"
                            value={titleEn}
                            onChange={(event) => setTitleEn(event.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="collection-slug">{t("slug")}</Label>
                        <Input
                            id="collection-slug"
                            value={slug}
                            onChange={(event) => {
                                setManualSlug(slugify(event.target.value));
                            }}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="collection-visibility">{t("fieldVisibility")}</Label>
                        <Select
                            value={visibility}
                            onValueChange={(v) => setVisibility(v as CollectionVisibility)}
                        >
                            <SelectTrigger id="collection-visibility">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="public">{t("visibilityPublic")}</SelectItem>
                                <SelectItem value="unlisted">{t("visibilityUnlisted")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                        >
                            {t("cancel")}
                        </Button>
                        <Button type="submit" disabled={!canSubmit || createCollection.isPending}>
                            {createCollection.isPending ? t("saving") : t("newCollection")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
