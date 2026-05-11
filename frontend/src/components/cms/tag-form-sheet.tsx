"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface TagFormValues {
    nl: string;
    en: string;
}

interface TagFormSheetProps {
    open: boolean;
    facetLabel: string;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: TagFormValues) => void;
    isSubmitting: boolean;
    initialValues?: TagFormValues;
    errorMessage?: string;
}

export function TagFormSheet({
    open,
    facetLabel,
    onOpenChange,
    onSubmit,
    isSubmitting,
    initialValues,
    errorMessage,
}: TagFormSheetProps) {
    const [nl, setNl] = React.useState(initialValues?.nl ?? "");
    const [en, setEn] = React.useState(initialValues?.en ?? "");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nl.trim()) return;
        onSubmit({ nl: nl.trim(), en: en.trim() });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="overflow-y-auto p-0">
                <SheetHeader className="border-foreground/10 border-b px-6 pt-6 pb-4">
                    <SheetTitle>
                        {initialValues ? "Edit tag" : "New tag"} — {facetLabel}
                    </SheetTitle>
                </SheetHeader>
                <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
                    <div className="space-y-1.5">
                        <Label htmlFor="tag-nl">NL label</Label>
                        <Input
                            id="tag-nl"
                            value={nl}
                            onChange={(e) => setNl(e.target.value)}
                            placeholder="Nederlandse naam"
                            required
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="tag-en">EN label</Label>
                        <Input
                            id="tag-en"
                            value={en}
                            onChange={(e) => setEn(e.target.value)}
                            placeholder="English name"
                        />
                    </div>
                    {errorMessage && <p className="text-destructive text-sm">{errorMessage}</p>}
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full"
                        aria-label="Save"
                    >
                        {isSubmitting ? "Saving…" : "Save"}
                    </Button>
                </form>
            </SheetContent>
        </Sheet>
    );
}
