"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
    useFieldSpec,
    useImportRows,
    useImportSession,
    useStartDryRun,
    useUpdateMapping,
} from "@/hooks/api/useImport";
import { autoSuggestMapping } from "@/lib/import/autoSuggestMapping";
import type {
    FieldSpec,
    ImportMapping,
    ImportRow,
    ImportSession,
} from "@/types/models/import.types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ColumnMapRow } from "./ColumnMapRow";

type MappingStageProps = {
    sessionId: string;
};

function buildSampleValues(header: string, rows: ImportRow[]): string[] {
    return rows.map((row) => {
        const v = row.rawData[header];
        return v == null ? "" : String(v);
    });
}

function columnsAreEqual(
    a: Record<string, string | null>,
    b: Record<string, string | null>,
    headers: string[]
): boolean {
    for (const h of headers) {
        if ((a[h] ?? null) !== (b[h] ?? null)) {
            return false;
        }
    }
    return true;
}

function buildInitialColumns(
    headers: string[],
    savedColumns: Record<string, string | null>,
    fields: FieldSpec[]
): Record<string, string | null> {
    const suggested = autoSuggestMapping(headers, fields);
    const initial: Record<string, string | null> = {};
    for (const header of headers) {
        const hasSaved = Object.prototype.hasOwnProperty.call(savedColumns, header);
        initial[header] = hasSaved ? (savedColumns[header] ?? null) : (suggested[header] ?? null);
    }
    return initial;
}

// ── Inner component — receives session and fields synchronously so useState initializer runs once ──

type MappingStageInnerProps = {
    session: ImportSession;
    fields: FieldSpec[];
    previewRows: ImportRow[];
    savedMapping: ImportMapping;
};

function MappingStageInner({ session, fields, previewRows, savedMapping }: MappingStageInnerProps) {
    const t = useTranslations("Cms.Import");

    const updateMapping = useUpdateMapping();
    const startDryRun = useStartDryRun();

    const [columns, setColumns] = useState<Record<string, string | null>>(() =>
        buildInitialColumns(session.originalHeaders, savedMapping.columns, fields)
    );

    const headers = session.originalHeaders;

    const isDirty = !columnsAreEqual(columns, savedMapping.columns, headers);

    const requiredFields = fields.filter((f) => f.required);
    const mappedFieldNames = new Set(Object.values(columns).filter((s): s is string => s !== null));
    const missingRequired = requiredFields.filter((f) => !mappedFieldNames.has(f.name));

    function handleColumnChange(header: string, fieldName: string | null) {
        setColumns((prev) => ({ ...prev, [header]: fieldName }));
    }

    function handleSave() {
        updateMapping.mutate(
            { id: session.id, mapping: { columns } },
            { onSuccess: () => toast.success(t("mapping.saveSuccess")) }
        );
    }

    function handleStartDryRun() {
        startDryRun.mutate(session.id);
    }

    const isSaving = updateMapping.isPending;
    const isStartingDryRun = startDryRun.isPending;
    const dryRunDisabled = isSaving || isStartingDryRun || isDirty || missingRequired.length > 0;

    return (
        <div className="mx-auto max-w-3xl space-y-6 pt-4">
            <div>
                <h2 className="font-display text-foreground text-lg font-bold tracking-tight">
                    {t("mapping.title")}
                </h2>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                    {t("mapping.helperText")}
                </p>
            </div>

            {missingRequired.length > 0 && (
                <div
                    role="alert"
                    className="animate-in fade-in slide-in-from-top-1 border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm duration-200"
                >
                    <p className="font-medium">{t("mapping.requiredMissing")}</p>
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                        {missingRequired.map((f) => (
                            <li key={f.name}>{f.label}</li>
                        ))}
                    </ul>
                </div>
            )}

            {updateMapping.isError && (
                <p role="alert" className="text-destructive text-sm">
                    {t("errors.saveMappingFailed")}
                </p>
            )}

            {startDryRun.isError && (
                <p role="alert" className="text-destructive text-sm">
                    {t("errors.dryRunStartFailed")}
                </p>
            )}

            <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-sm">
                    <thead>
                        <tr className="border-foreground/10 border-b text-left">
                            <th className="text-muted-foreground pr-4 pb-2 font-mono text-[10px] font-medium tracking-[1.5px] uppercase">
                                {t("mapping.headerColumn")}
                            </th>
                            <th className="text-muted-foreground pb-2 font-mono text-[10px] font-medium tracking-[1.5px] uppercase">
                                {t("mapping.fieldColumn")}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {headers.map((header) => (
                            <ColumnMapRow
                                key={header}
                                header={header}
                                sampleValues={buildSampleValues(header, previewRows)}
                                fields={fields}
                                currentMapping={columns[header] ?? null}
                                onChange={(fieldName) => handleColumnChange(header, fieldName)}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSave} disabled={isSaving} variant="outline">
                    {isSaving ? t("mapping.saving") : t("mapping.save")}
                </Button>

                <Button onClick={handleStartDryRun} disabled={dryRunDisabled}>
                    {isStartingDryRun ? t("mapping.startingDryRun") : t("mapping.startDryRun")}
                </Button>

                {isDirty && (
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <span
                            className="inline-block h-2 w-2 rounded-full bg-current"
                            aria-hidden="true"
                        />
                        <span className="font-mono text-[10px] tracking-wide">
                            {t("mapping.unsavedChanges")}
                        </span>
                    </span>
                )}
            </div>
        </div>
    );
}

// ── Outer loader component ──

export function MappingStage({ sessionId }: MappingStageProps) {
    const t = useTranslations("Cms.Import");

    const {
        data: session,
        isPending: sessionLoading,
        isError: sessionError,
    } = useImportSession(sessionId);

    const {
        data: fields,
        isPending: fieldsLoading,
        isError: fieldsError,
    } = useFieldSpec(session?.entityType ?? "", {
        enabled: Boolean(session?.entityType),
    });

    const { data: previewRows } = useImportRows(sessionId, { limit: 3 });

    if (sessionLoading || fieldsLoading) {
        return (
            <div className="mx-auto max-w-3xl space-y-6 pt-4">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        );
    }

    if (sessionError) {
        return (
            <p role="alert" className="text-destructive pt-4 text-sm">
                {t("errors.sessionLoadFailed")}
            </p>
        );
    }

    if (fieldsError) {
        return (
            <p role="alert" className="text-destructive pt-4 text-sm">
                {t("errors.fieldsLoadFailed")}
            </p>
        );
    }

    if (!session || !fields) {
        return null;
    }

    return (
        // Remounting on save discards concurrent local edits (acceptable v1; Phase 10 should revisit).
        <MappingStageInner
            key={`${session.id}:${session.updatedAt}`}
            session={session}
            fields={fields}
            previewRows={previewRows ?? []}
            savedMapping={session.mapping}
        />
    );
}
