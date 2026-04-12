"use client";

import { cn } from "@/lib/utils";

type Props = {
    primary: string;
    fallback: string;
    className?: string;
};

export function resolveLocalized(
    primary: string,
    fallback: string
): {
    value: string;
    isFallback: boolean;
} {
    if (primary && primary.length > 0) return { value: primary, isFallback: false };
    return { value: fallback, isFallback: fallback.length > 0 };
}

export function LocalizedText({ primary, fallback, className }: Props) {
    const { value, isFallback } = resolveLocalized(primary, fallback);
    return (
        <span className={cn(className, isFallback && "text-muted-foreground italic")}>{value}</span>
    );
}
