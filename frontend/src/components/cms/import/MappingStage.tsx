"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

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
        const saved = savedColumns[header] ?? null;
        initial[header] = saved !== null ? saved : (suggested[header] ?? null);
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
    const mappedFieldNames = new Set(Object.values(columns).filter(Boolean) as string[]);
    const missingRequired = requiredFields.filter((f) => !mappedFieldNames.has(f.name));

    function handleColumnChange(header: string, fieldName: string | null) {
        setColumns((prev) => ({ ...prev, [header]: fieldName }));
    }

    function handleSave() {
        updateMapping.mutate({ id: session.id, mapping: { columns } });
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
                <h2 className="text-base font-semibold">{t("mapping.title")}</h2>
                <p className="text-muted-foreground mt-1 text-sm">{t("mapping.description")}</p>
            </div>

            {missingRequired.length > 0 && (
                <div
                    role="alert"
                    className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm"
                >
                    <p className="font-medium">{t("mapping.requiredMissing")}</p>
                    <ul className="mt-1 list-disc pl-4">
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

            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left">
                        <th className="text-muted-foreground pr-4 pb-2 text-xs font-medium">
                            {t("mapping.headerColumn")}
                        </th>
                        <th className="text-muted-foreground pb-2 text-xs font-medium">
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

            <div className="flex items-center gap-3">
                <Button onClick={handleSave} disabled={isSaving} variant="outline">
                    {isSaving ? t("mapping.saving") : t("mapping.save")}
                </Button>

                <Button onClick={handleStartDryRun} disabled={dryRunDisabled}>
                    {isStartingDryRun ? t("mapping.startingDryRun") : t("mapping.startDryRun")}
                </Button>

                {isDirty && (
                    <span className="text-muted-foreground text-xs">
                        {t("mapping.unsavedChanges")}
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
            <div className="mx-auto max-w-3xl pt-4">
                <p className="text-muted-foreground text-sm">{t("mapping.title")}</p>
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
        <MappingStageInner
            key={`${session.id}:${session.updatedAt}`}
            session={session}
            fields={fields}
            previewRows={previewRows ?? []}
            savedMapping={session.mapping}
        />
    );
}
