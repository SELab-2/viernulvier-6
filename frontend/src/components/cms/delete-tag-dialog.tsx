"use client";

import { useTranslations } from "next-intl";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteTagDialogProps {
    open: boolean;
    tagLabel: string;
    usageCount: number;
    isDeleting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeleteTagDialog({
    open,
    tagLabel,
    usageCount,
    isDeleting,
    onConfirm,
    onCancel,
}: DeleteTagDialogProps) {
    const t = useTranslations("Cms.Tags");
    return (
        <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("deleteTitle", { label: tagLabel })}</DialogTitle>
                    <DialogDescription>
                        {t("deleteDescription", { count: usageCount })}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
                        {t("cancel")}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        aria-label={isDeleting ? t("deleting") : t("delete")}
                    >
                        {isDeleting ? t("deleting") : t("delete")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
