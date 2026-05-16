"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { TagPickerSection } from "@/components/cms/tag-picker-section";
import { useBulkAddEntityTags } from "@/hooks/api/useEntityTags";
import { EntityType } from "@/types/models/taxonomy.types";

type BulkTagDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entityType: EntityType;
    entityIds: string[];
    onApplied?: () => void;
};

export function BulkTagDialog({
    open,
    onOpenChange,
    entityType,
    entityIds,
    onApplied,
}: BulkTagDialogProps) {
    const tTags = useTranslations("Cms.Tags");
    const tCommon = useTranslations("Cms.common");
    const tActionBar = useTranslations("Cms.ActionBar");
    const tEditSheet = useTranslations("Cms.EditSheet");
    const [tagSlugs, setTagSlugs] = useState<string[]>([]);
    const bulkAddTags = useBulkAddEntityTags();

    const handleClose = (nextOpen: boolean) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
            setTagSlugs([]);
        }
    };

    const handleApply = async () => {
        if (entityIds.length === 0 || tagSlugs.length === 0) return;

        try {
            await bulkAddTags.mutateAsync({ entityType, entityIds, tagSlugs });
            toast.success(tActionBar("bulkEdit"));
            setTagSlugs([]);
            onOpenChange(false);
            onApplied?.();
        } catch {
            toast.error(tTags("saveError"));
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{tActionBar("bulkEdit")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <p className="text-muted-foreground text-sm">
                        {entityIds.length} {tTags("sectionLabel").toLowerCase()}
                    </p>
                    <TagPickerSection
                        entityType={entityType}
                        selectedSlugs={tagSlugs}
                        onChange={setTagSlugs}
                        compact
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => handleClose(false)}>
                        {tEditSheet("cancel")}
                    </Button>
                    <Button onClick={handleApply} disabled={tagSlugs.length === 0}>
                        {tCommon("save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
