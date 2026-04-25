"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AxiosError } from "axios";

import { useCreateArticle } from "@/hooks/api/useArticles";
import { useRouter } from "@/i18n/routing";
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

interface CreateArticleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateArticleDialog({ open, onOpenChange }: CreateArticleDialogProps) {
    const t = useTranslations("Cms.Articles");
    const router = useRouter();
    const createArticle = useCreateArticle();

    const [title, setTitle] = useState("");
    const [slugError, setSlugError] = useState<string | null>(null);

    const canSubmit = title.trim().length > 0;

    const handleOpenChange = (next: boolean) => {
        if (!next) {
            setTitle("");
            setSlugError(null);
        }
        onOpenChange(next);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSubmit) return;

        setSlugError(null);
        createArticle.mutate(
            { title: title.trim() },
            {
                onSuccess: (article) => {
                    handleOpenChange(false);
                    router.push(`/cms/articles/${article.id}/edit`);
                },
                onError: (error) => {
                    const axiosError = error as AxiosError;
                    if (axiosError.response?.status === 409) {
                        setSlugError(t("slugConflict"));
                    } else {
                        toast.error(t("createFailed"));
                    }
                },
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("dialogTitle")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="article-title">{t("titleLabel")}</Label>
                        <Input
                            id="article-title"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                setSlugError(null);
                            }}
                            required
                            autoFocus
                        />
                        {slugError && <p className="text-destructive text-sm">{slugError}</p>}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                        >
                            {t("cancel")}
                        </Button>
                        <Button type="submit" disabled={!canSubmit || createArticle.isPending}>
                            {createArticle.isPending ? t("saving") : t("dialogTitle")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
