"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useUpdateRow } from "@/hooks/api/useImport";
import type { FieldSpec, ImportRow, ImportWarning } from "@/types/models/import.types";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { FkPicker } from "./FkPicker";
import { statusBadgeClasses, statusLabelKey } from "./statusBadge";

type RowDrawerProps = {
    row: ImportRow | null;
    sessionId: string;
    fields: FieldSpec[];
    onClose: () => void;
};

function RawCsvPanel({ row }: { row: ImportRow }) {
    const t = useTranslations("Cms.Import");
    const entries = Object.entries(row.rawData);
    return (
        <section className="space-y-2">
            <p className="text-sm font-medium">{t("drawer.rawCsvTitle")}</p>
            <div className="rounded-md border">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b">
                            <th className="text-muted-foreground px-3 py-1.5 text-left font-medium">
                                {t("drawer.csvColumn")}
                            </th>
                            <th className="text-muted-foreground px-3 py-1.5 text-left font-medium">
                                {t("drawer.csvValue")}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map(([col, val]) => (
                            <tr key={col} className="border-b last:border-0">
                                <td className="px-3 py-1.5 font-mono">{col}</td>
                                <td
                                    className="text-muted-foreground max-w-[200px] truncate px-3 py-1.5"
                                    title={val == null ? "" : String(val)}
                                >
                                    {val == null ? (
                                        <span className="opacity-40">—</span>
                                    ) : (
                                        String(val)
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

type FieldOverridesPanelProps = {
    row: ImportRow;
    fields: FieldSpec[];
    onChangeField: (field: string, value: unknown) => void;
};

function FieldOverridesPanel({ row, fields, onChangeField }: FieldOverridesPanelProps) {
    const t = useTranslations("Cms.Import");
    const diff = row.diff as Record<string, { current: unknown; incoming: unknown }> | null;

    const editableFields = fields.filter((f) => f.fieldType.kind !== "foreign_key");

    if (editableFields.length === 0) {
        return (
            <section className="space-y-2">
                <p className="text-sm font-medium">{t("drawer.fieldOverridesTitle")}</p>
                <p className="text-muted-foreground text-xs">{t("drawer.noFieldsMapped")}</p>
            </section>
        );
    }

    return (
        <section className="space-y-3">
            <p className="text-sm font-medium">{t("drawer.fieldOverridesTitle")}</p>
            {editableFields.map((field) => {
                const diffEntry = diff?.[field.name];
                const overrideValue = row.overrides[field.name];
                const displayValue =
                    overrideValue !== undefined ? overrideValue : (diffEntry?.incoming ?? "");
                return (
                    <FieldOverrideRow
                        key={`${row.id}:${field.name}`}
                        field={field}
                        displayValue={displayValue}
                        currentDbValue={diffEntry?.current}
                        onChangeField={onChangeField}
                    />
                );
            })}
        </section>
    );
}

type FieldOverrideRowProps = {
    field: FieldSpec;
    displayValue: unknown;
    currentDbValue: unknown;
    onChangeField: (field: string, value: unknown) => void;
};

function FieldOverrideRow({
    field,
    displayValue,
    currentDbValue,
    onChangeField,
}: FieldOverrideRowProps) {
    const t = useTranslations("Cms.Import");
    const [inputValue, setInputValue] = useState(
        displayValue === null || displayValue === undefined ? "" : String(displayValue)
    );
    const handleBlur = () => {
        onChangeField(field.name, inputValue === "" ? null : inputValue);
    };

    return (
        <div className="space-y-1">
            <Label htmlFor={`field-${field.name}`} className="text-xs font-medium">
                {field.label}
            </Label>
            {currentDbValue !== undefined && (
                <p className="text-muted-foreground text-[10px]">
                    {t("drawer.fieldCurrentValue")}:{" "}
                    {currentDbValue == null ? "—" : String(currentDbValue)}
                </p>
            )}
            <Input
                id={`field-${field.name}`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={handleBlur}
                aria-label={field.label}
                className="h-8 text-sm"
            />
        </div>
    );
}

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
                            {/* Warnings */}
                            {row.warnings.length > 0 && (
                                <section className="space-y-2">
                                    <p className="text-sm font-medium">{t("drawer.warnings")}</p>
                                    <ul className="space-y-1">
                                        {row.warnings.map((w: ImportWarning, i: number) => (
                                            <li
                                                key={`${w.field ?? ""}-${w.code}-${i}`}
                                                className="text-muted-foreground text-xs"
                                            >
                                                <span className="font-mono">{w.code}</span>
                                                {" — "}
                                                {w.message}
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            {/* Section A: Raw CSV data */}
                            <RawCsvPanel row={row} />

                            <hr className="border-border" />

                            {/* Section B: Field overrides */}
                            <FieldOverridesPanel
                                row={row}
                                fields={fields}
                                onChangeField={handleChangeField}
                            />

                            <hr className="border-border" />

                            {/* Section C: FK pickers */}
                            <FkPicker row={row} fkFields={fkFields} onChangeRef={handleChangeRef} />

                            {/* Section D: Skip toggle */}
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
