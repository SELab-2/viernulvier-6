"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, X, Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGetHalls } from "@/hooks/api/useHalls";

export interface SelectOption {
    value: string;
    label: string;
}

export type FieldType = "text" | "boolean" | "select" | "hall-multiselect";

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
    onSave?: (data: TData) => void;
    previewUrl?: string;
    onPreview?: () => void;
    /** Optional slot rendered inside the sheet body, below the form fields, for a given entity. */
    extraContent?: (entity: TData) => React.ReactNode;
}

const NULL_SENTINEL = "__null__";

function HallMultiSelectField({
    fieldId,
    label,
    value,
    onChange,
}: {
    fieldId: string;
    label: string;
    value: string[];
    onChange: (value: string[]) => void;
}) {
    const [open, setOpen] = useState(false);
    const { data } = useGetHalls();
    const halls = data?.data ?? [];

    const toggle = (id: string) => {
        if (value.includes(id)) {
            onChange(value.filter((v) => v !== id));
        } else {
            onChange([...value, id]);
        }
    };

    const selectedHalls = halls.filter((h) => value.includes(h.id));

    return (
        <div className="flex flex-col gap-1.5">
            <Label
                htmlFor={fieldId}
                className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase"
            >
                {label}
            </Label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id={fieldId}
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="border-foreground/20 focus:ring-foreground/30 h-auto min-h-9 w-full justify-between px-3 py-2 text-sm font-normal"
                    >
                        <div className="flex flex-wrap gap-1">
                            {selectedHalls.length === 0 ? (
                                <span className="text-muted-foreground">—</span>
                            ) : (
                                selectedHalls.map((h) => (
                                    <Badge
                                        key={h.id}
                                        variant="secondary"
                                        className="gap-1 pr-1 text-xs"
                                    >
                                        {h.name}
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggle(h.id);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.stopPropagation();
                                                    toggle(h.id);
                                                }
                                            }}
                                            className="hover:text-destructive ml-0.5 cursor-pointer"
                                        >
                                            <X className="h-3 w-3" />
                                        </span>
                                    </Badge>
                                ))
                            )}
                        </div>
                        <ChevronsUpDown className="text-muted-foreground ml-2 h-4 w-4 shrink-0" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="border-foreground/20 w-[320px] p-0" align="start">
                    <Command>
                        <CommandInput placeholder="Search halls..." />
                        <CommandList>
                            <CommandEmpty>No halls found.</CommandEmpty>
                            <CommandGroup>
                                {halls.map((hall) => (
                                    <CommandItem
                                        key={hall.id}
                                        value={hall.name}
                                        onSelect={() => toggle(hall.id)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value.includes(hall.id)
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                        {hall.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}

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
            <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                    {field.label}
                </span>
                <div className="border-foreground/10 bg-foreground/[0.02] rounded-sm border px-3 py-2">
                    <code className="text-muted-foreground font-mono text-xs">
                        {stringValue || "—"}
                    </code>
                </div>
            </div>
        );
    }

    if (field.type === "text") {
        return (
            <div className="flex flex-col gap-1.5">
                <Label
                    htmlFor={fieldId}
                    className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase"
                >
                    {field.label}
                </Label>
                <Input
                    id={fieldId}
                    value={stringValue}
                    onChange={(e) => onChange(e.target.value)}
                    className="border-foreground/20 focus-visible:ring-foreground/30 h-9 text-sm"
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
                <Label
                    htmlFor={fieldId}
                    className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase"
                >
                    {field.label}
                </Label>
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
                    <SelectTrigger
                        id={fieldId}
                        className="border-foreground/20 focus:ring-foreground/30 h-9 w-full text-sm"
                    >
                        <SelectValue placeholder={t("selectPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent className="border-foreground/20">
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

    if (field.type === "hall-multiselect") {
        const ids = Array.isArray(value) ? (value as string[]) : [];
        return (
            <HallMultiSelectField
                fieldId={fieldId}
                label={field.label}
                value={ids}
                onChange={onChange}
            />
        );
    }

    const options = field.options ?? [];

    return (
        <div className="flex flex-col gap-1.5">
            <Label
                htmlFor={fieldId}
                className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase"
            >
                {field.label}
            </Label>
            <Select value={stringValue} onValueChange={onChange}>
                <SelectTrigger
                    id={fieldId}
                    className="border-foreground/20 focus:ring-foreground/30 h-9 w-full text-sm"
                >
                    <SelectValue placeholder={t("selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent className="border-foreground/20">
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
    onSave?: (data: TData) => void;
    onClose: () => void;
    extraContent?: (entity: TData) => React.ReactNode;
}

function SheetFormBody<TData extends { id: string } & Record<string, unknown>>({
    entity,
    fields,
    onSave,
    onClose,
    extraContent,
}: SheetFormBodyProps<TData>) {
    const t = useTranslations("Cms.EditSheet");
    const [values, setValues] = useState<Partial<TData>>(() => ({ ...entity }));

    const handleChange = (key: keyof TData, value: unknown) => {
        setValues((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        onSave?.({ ...entity, ...values } as TData);
        onClose();
    };

    return (
        <>
            <div className="flex flex-col gap-5 overflow-y-auto px-6 py-6">
                {fields.map((field) => (
                    <FieldRow
                        key={String(field.key)}
                        field={field}
                        value={values[field.key as keyof typeof values]}
                        onChange={(v) => handleChange(field.key, v)}
                    />
                ))}
                {extraContent && (
                    <div className="border-foreground/10 border-t pt-5">{extraContent(entity)}</div>
                )}
            </div>
            <div className="border-foreground/10 border-t px-6 py-4">
                <SheetFooter className="flex-row justify-end gap-3 sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="border-foreground/20 hover:bg-foreground/5 px-4 py-2 font-mono text-[10px] tracking-[1px] uppercase transition-colors"
                    >
                        {t("cancel")}
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="bg-foreground text-background hover:bg-foreground/90 px-4 py-2 font-mono text-[10px] tracking-[1px] uppercase transition-colors"
                    >
                        {t("saveChanges")}
                    </button>
                </SheetFooter>
            </div>
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
    previewUrl,
    onPreview,
    extraContent,
}: EditSheetProps<TData>) {
    const t = useTranslations("Cms.EditSheet");
    const tArticles = useTranslations("Cms.Articles");
    const formKey = entity?.id ?? null;

    const handlePreview = () => {
        if (onPreview) {
            onPreview();
        } else if (previewUrl) {
            window.open(previewUrl, "_blank");
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="border-foreground/20 flex flex-col gap-0 border-l p-0 sm:max-w-md">
                <SheetHeader className="border-foreground/10 border-b px-6 pt-6 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="text-muted-foreground mb-2 font-mono text-[9px] tracking-[2px] uppercase">
                            {t("editMode")}
                        </div>
                        {(previewUrl || onPreview) && (
                            <button
                                type="button"
                                onClick={handlePreview}
                                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-mono text-[9px] tracking-[1px] uppercase transition-colors"
                            >
                                <Eye className="h-3.5 w-3.5" />
                                {tArticles("preview")}
                            </button>
                        )}
                    </div>
                    <SheetTitle className="font-display text-2xl font-bold tracking-tight">
                        {title}
                    </SheetTitle>
                    {description && (
                        <SheetDescription className="font-body text-muted-foreground text-sm">
                            {description}
                        </SheetDescription>
                    )}
                </SheetHeader>
                {entity !== null && (
                    <SheetFormBody
                        key={formKey}
                        entity={entity}
                        fields={fields}
                        onSave={onSave}
                        onClose={() => onOpenChange(false)}
                        extraContent={extraContent}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}
