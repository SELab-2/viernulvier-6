"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";

export interface SelectOption {
    value: string;
    label: string;
}

export type FieldType = "text" | "boolean" | "select";

export interface FieldDef<TData> {
    key: keyof TData;
    label: string;
    type: FieldType;
    options?: SelectOption[];
    readOnly?: boolean;
}

export interface EditSheetProps<TData extends { id: string } & Record<string, unknown>> {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entity: TData | null;
    fields: FieldDef<TData>[];
    title: string;
    description?: string;
    /**
     * Called when the user clicks "Save". Must return a promise that resolves on
     * success or rejects on failure.
     *
     * **UX behaviour (deliberate choice):**
     * The sheet waits for the promise to settle before closing. While pending the
     * save button is disabled. On rejection the sheet stays open so the user can
     * retry or correct their input without losing context.
     *
     * To switch to optimistic close-immediately behaviour, change `handleSave` in
     * `SheetFormBody` to call `onClose()` before awaiting the promise.
     */
    onSave?: (data: TData) => Promise<unknown>;
}

const NULL_SENTINEL = "__null__";

interface FieldRowProps<TData> {
    field: FieldDef<TData>;
    value: unknown;
    onChange: (value: unknown) => void;
}

function FieldRow<TData>({ field, value, onChange }: FieldRowProps<TData>) {
    const t = useTranslations("Cms.EditSheet");
    const fieldId = `field-${String(field.key)}`;
    const stringValue = value === null || value === undefined ? "" : String(value);

    if (field.readOnly) {
        return (
            <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {field.label}
                </span>
                <p className="text-sm">{stringValue || "—"}</p>
            </div>
        );
    }

    if (field.type === "text") {
        return (
            <div className="flex flex-col gap-1.5">
                <Label htmlFor={fieldId}>{field.label}</Label>
                <Input
                    id={fieldId}
                    value={stringValue}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-8 text-sm"
                />
            </div>
        );
    }

    if (field.type === "boolean") {
        const selectValue = value === null || value === undefined ? NULL_SENTINEL : String(value);
        const booleanOptions: SelectOption[] = [
            { value: "true", label: t("yes") },
            { value: "false", label: t("no") },
        ];

        return (
            <div className="flex flex-col gap-1.5">
                <Label htmlFor={fieldId}>{field.label}</Label>
                <Select
                    value={selectValue}
                    onValueChange={(v) => {
                        if (v === NULL_SENTINEL) {
                            onChange(null);
                        } else {
                            onChange(v === "true");
                        }
                    }}
                >
                    <SelectTrigger id={fieldId} size="sm" className="w-full">
                        <SelectValue placeholder={t("selectPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NULL_SENTINEL}>—</SelectItem>
                        {booleanOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        );
    }

    const options = field.options ?? [];

    return (
        <div className="flex flex-col gap-1.5">
            <Label htmlFor={fieldId}>{field.label}</Label>
            <Select value={stringValue} onValueChange={onChange}>
                <SelectTrigger id={fieldId} size="sm" className="w-full">
                    <SelectValue placeholder={t("selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

interface SheetFormBodyProps<TData extends { id: string } & Record<string, unknown>> {
    entity: TData;
    fields: FieldDef<TData>[];
    onSave?: (data: TData) => Promise<unknown>;
    onClose: () => void;
}

function SheetFormBody<TData extends { id: string } & Record<string, unknown>>({
    entity,
    fields,
    onSave,
    onClose,
}: SheetFormBodyProps<TData>) {
    const t = useTranslations("Cms.EditSheet");
    const [values, setValues] = useState<Partial<TData>>(() => ({ ...entity }));
    const [isPending, setIsPending] = useState(false);

    const handleChange = (key: keyof TData, value: unknown) => {
        setValues((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (!onSave) return;
        setIsPending(true);
        try {
            await onSave({ ...entity, ...values } as TData);
            onClose();
        } catch {
            // Stay open on failure — the mutation hook is responsible for
            // showing an error toast to the user.
        } finally {
            setIsPending(false);
        }
    };

    return (
        <>
            <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
                {fields.map((field) => (
                    <FieldRow
                        key={String(field.key)}
                        field={field}
                        value={values[field.key as keyof typeof values]}
                        onChange={(v) => handleChange(field.key, v)}
                    />
                ))}
            </div>
            <Separator />
            <SheetFooter className="flex-row justify-end gap-2 px-6 py-4">
                <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
                    {t("cancel")}
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isPending}>
                    {t("saveChanges")}
                </Button>
            </SheetFooter>
        </>
    );
}

export function EditSheet<TData extends { id: string } & Record<string, unknown>>({
    open,
    onOpenChange,
    entity,
    fields,
    title,
    description,
    onSave,
}: EditSheetProps<TData>) {
    /**
     * `openCount` forces a full remount of `SheetFormBody` every time the sheet
     * opens. Without it, opening the same entity twice in a row (e.g. open →
     * edit a field → close without saving → reopen) would show stale edits
     * because React's `key` (entity ID) hasn't changed so the component keeps
     * its old state.
     *
     * The counter is incremented inside the `onOpenChange` callback (an event
     * handler, not during render) to satisfy React 19's strict ref/setState
     * rules.
     */
    const [openCount, setOpenCount] = useState(0);

    const handleOpenChange = useCallback(
        (next: boolean) => {
            if (next) setOpenCount((c) => c + 1);
            onOpenChange(next);
        },
        [onOpenChange]
    );

    const formKey = entity ? `${entity.id}-${openCount}` : null;

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-md">
                <SheetHeader className="px-6 pt-6 pb-4">
                    <SheetTitle>{title}</SheetTitle>
                    {description && <SheetDescription>{description}</SheetDescription>}
                </SheetHeader>
                <Separator />
                {entity !== null && (
                    <SheetFormBody
                        key={formKey}
                        entity={entity}
                        fields={fields}
                        onSave={onSave}
                        onClose={() => onOpenChange(false)}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}
