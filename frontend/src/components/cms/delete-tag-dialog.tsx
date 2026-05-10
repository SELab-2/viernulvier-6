"use client";

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
    return (
        <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete &ldquo;{tagLabel}&rdquo;?</DialogTitle>
                    <DialogDescription>
                        This tag is used by {usageCount} items. Deleting it will remove it from all
                        of them. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        aria-label={isDeleting ? "Deleting" : "Delete"}
                    >
                        {isDeleting ? "Deleting…" : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
