"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateSeries } from "@/hooks/api/useSeries";
import { slugify } from "@/lib/slugify";

interface CreateSeriesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (slug: string) => void;
}

export function CreateSeriesDialog({ open, onOpenChange, onCreated }: CreateSeriesDialogProps) {
    const t = useTranslations("Cms.Series");
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [isPending, setIsPending] = useState(false);

    const createSeries = useCreateSeries();

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setName(val);
        setSlug(slugify(val));
    };

    const handleCreate = async () => {
        if (!name || !slug) return;
        setIsPending(true);
        createSeries.mutate(
            {
                slug,
                translations: [
                    { languageCode: "nl", name, subtitle: "", description: "" },
                    { languageCode: "en", name, subtitle: "", description: "" },
                ],
            },
            {
                onSuccess: (data) => {
                    toast.success(t("saveSuccess"));
                    onOpenChange(false);
                    setName("");
                    setSlug("");
                    onCreated?.(data.slug);
                },
                onError: () => {
                    toast.error(t("saveError"));
                },
                onSettled: () => setIsPending(false),
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("newSeries")}</DialogTitle>
                    <DialogDescription>Geef een naam op voor de nieuwe reeks.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t("fieldName")}</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={handleNameChange}
                            placeholder="bijv. VIDEODROOM"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="slug">Slug</Label>
                        <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Annuleren
                    </Button>
                    <Button onClick={handleCreate} disabled={!name || !slug || isPending}>
                        {isPending ? "Aanmaken..." : t("newSeries")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
