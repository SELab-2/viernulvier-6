"use client";

import { Check, X, Minus } from "lucide-react";

export function BooleanCell({ value }: { value: boolean | null }) {
    if (value === null) {
        return (
            <span className="text-muted-foreground/40 inline-flex items-center">
                <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
            </span>
        );
    }

    return value ? (
        <span className="text-foreground inline-flex items-center">
            <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
        </span>
    ) : (
        <span className="text-muted-foreground/40 inline-flex items-center">
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </span>
    );
}
