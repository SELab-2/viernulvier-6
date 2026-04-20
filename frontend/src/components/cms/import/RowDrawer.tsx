"use client";

import { useTranslations } from "next-intl";

import { useUpdateRow } from "@/hooks/api/useImport";
import type { FieldSpec, ImportRow, ImportRowStatus } from "@/types/models/import.types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { DiffView } from "./DiffView";
import { FkPicker } from "./FkPicker";

type ImportWarning = { field: string | null; code: string; message: string };

const statusBadgeClasses: Record<ImportRowStatus, string> = {
    pending: "bg-muted text-muted-foreground",
    will_create: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    will_update: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    will_skip: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    error: "bg-destructive/10 text-destructive",
    created: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-500",
    updated: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-500",
    skipped: "bg-muted text-muted-foreground",
    reverted: "bg-muted text-muted-foreground",
};

const statusLabelKey: Record<ImportRowStatus, string> = {
    pending: "table.statusLabels.pending",
    will_create: "table.statusLabels.willCreate",
    will_update: "table.statusLabels.willUpdate",
    will_skip: "table.statusLabels.willSkip",
    error: "table.statusLabels.error",
    created: "table.statusLabels.created",
    updated: "table.statusLabels.updated",
    skipped: "table.statusLabels.skipped",
    reverted: "table.statusLabels.reverted",
};

type RowDrawerProps = {
    row: ImportRow | null;
    sessionId: string;
    fields: FieldSpec[];
    onClose: () => void;
};

export function RowDrawer({ row, sessionId, fields, onClose }: RowDrawerProps) {
    const t = useTranslations("Cms.Import");
    const updateRow = useUpdateRow();

    const fkFields = fields.filter((f) => f.fieldType.kind === "foreign_key");

    const handleChangeField = (field: string, value: unknown) => {
        if (!row) return;
        updateRow.mutate({
            id: row.id,
            sessionId,
            overrides: { [field]: value },
        });
    };

    const handleChangeRef = (field: string, value: string | null) => {
        if (!row) return;
        updateRow.mutate({
            id: row.id,
            sessionId,
            resolvedRefs: { [field]: value },
        });
    };

    const handleSkipToggle = (checked: boolean | "indeterminate") => {
        if (!row) return;
        updateRow.mutate({
            id: row.id,
            sessionId,
            skip: checked === true,
        });
    };

    return (
        <Sheet
            open={row !== null}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
                {row !== null && (
                    <>
                        <SheetHeader>
                            <SheetTitle className="flex items-center gap-3">
                                {t("drawer.title", { n: row.rowNumber })}
                                <span
                                    className={`inline-flex items-center rounded-md border border-transparent px-2 py-0.5 text-xs font-medium ${statusBadgeClasses[row.status]}`}
                                >
                                    {t(statusLabelKey[row.status])}
                                </span>
                            </SheetTitle>
                            <SheetDescription className="sr-only">
                                {t("drawer.title", { n: row.rowNumber })}
                            </SheetDescription>
                        </SheetHeader>

                        <div className="flex flex-col gap-6 px-4 pb-6">
                            {row.warnings.length > 0 && (
                                <section className="space-y-2">
                                    <p className="text-sm font-medium">{t("drawer.warnings")}</p>
                                    <ul className="space-y-1">
                                        {(row.warnings as ImportWarning[]).map((w, i) => (
                                            <li key={i} className="text-muted-foreground text-xs">
                                                <span className="font-mono">{w.code}</span>
                                                {" — "}
                                                {w.message}
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            <DiffView row={row} onChangeField={handleChangeField} />

                            <FkPicker row={row} fkFields={fkFields} onChangeRef={handleChangeRef} />

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="skip-row"
                                    checked={row.status === "will_skip"}
                                    onCheckedChange={handleSkipToggle}
                                    disabled={updateRow.isPending}
                                />
                                <Label htmlFor="skip-row" className="cursor-pointer text-sm">
                                    {t("drawer.skipRow")}
                                </Label>
                            </div>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
