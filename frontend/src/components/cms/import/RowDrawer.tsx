"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useUpdateRow } from "@/hooks/api/useImport";
import type {
    FieldSpec,
    ImportMapping,
    ImportRow,
    ImportWarning,
} from "@/types/models/import.types";
import { Button } from "@/components/ui/button";
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
    mapping: ImportMapping;
    onClose: () => void;
};

function findRawValue(
    fieldName: string,
    mapping: ImportMapping,
    rawData: Record<string, unknown>
): string {
    const header = Object.entries(mapping.columns).find(([, f]) => f === fieldName)?.[0];
    if (!header) return "";
    const v = rawData[header];
    return v == null ? "" : String(v);
}

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

type FieldOverrideRowProps = {
    field: FieldSpec;
    value: string;
    currentDbValue: unknown;
    onChange: (value: string) => void;
};

function FieldOverrideRow({ field, value, currentDbValue, onChange }: FieldOverrideRowProps) {
    const t = useTranslations("Cms.Import");
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
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label={field.label}
                className="h-8 text-sm"
            />
        </div>
    );
}

type FieldOverridesPanelProps = {
    row: ImportRow;
    fields: FieldSpec[];
    mapping: ImportMapping;
    onSaveOverrides: (overrides: Record<string, string | null>) => void;
    isSaving: boolean;
};

function FieldOverridesPanel({
    row,
    fields,
    mapping,
    onSaveOverrides,
    isSaving,
}: FieldOverridesPanelProps) {
    const t = useTranslations("Cms.Import");
    const diff = row.diff as Record<string, { current: unknown; incoming: unknown }> | null;

    const editableFields = fields.filter((f) => f.fieldType.kind !== "foreign_key");

    const getInitialValue = (field: FieldSpec): string => {
        const override = row.overrides[field.name];
        if (override !== undefined) return override == null ? "" : String(override);
        const diffEntry = diff?.[field.name];
        if (diffEntry?.incoming !== undefined)
            return diffEntry.incoming == null ? "" : String(diffEntry.incoming);
        return findRawValue(field.name, mapping, row.rawData);
    };

    const [localValues, setLocalValues] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        for (const field of editableFields) {
            init[field.name] = getInitialValue(field);
        }
        return init;
    });

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
            {editableFields.map((field) => (
                <FieldOverrideRow
                    key={field.name}
                    field={field}
                    value={localValues[field.name] ?? ""}
                    currentDbValue={diff?.[field.name]?.current}
                    onChange={(val) => setLocalValues((prev) => ({ ...prev, [field.name]: val }))}
                />
            ))}
            <Button
                size="sm"
                disabled={isSaving}
                onClick={() => {
                    const overrides: Record<string, string | null> = {};
                    for (const [name, val] of Object.entries(localValues)) {
                        overrides[name] = val === "" ? null : val;
                    }
                    onSaveOverrides(overrides);
                }}
            >
                {t("drawer.saveOverrides")}
            </Button>
        </section>
    );
}

export function RowDrawer({ row, sessionId, fields, mapping, onClose }: RowDrawerProps) {
    const t = useTranslations("Cms.Import");
    const updateRow = useUpdateRow();

    const fkFields = fields.filter((f) => f.fieldType.kind === "foreign_key");

    const handleSaveOverrides = (overrides: Record<string, string | null>) => {
        if (!row) return;
        updateRow.mutate({ id: row.id, sessionId, overrides });
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

                            {/* Section B: Field overrides — keyed by row.id so state resets on row change */}
                            <FieldOverridesPanel
                                key={row.id}
                                row={row}
                                fields={fields}
                                mapping={mapping}
                                onSaveOverrides={handleSaveOverrides}
                                isSaving={updateRow.isPending}
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
