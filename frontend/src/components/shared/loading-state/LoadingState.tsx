"use client";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
    message: string;
    className?: string;
    spinnerSize?: "sm" | "md" | "lg";
}

const spinnerSizes = {
    sm: "size-4",
    md: "size-6",
    lg: "size-8",
};

export function LoadingState({ message, className, spinnerSize = "md" }: LoadingStateProps) {
    return (
        <div
            className={cn(
                "flex min-h-[50vh] flex-col items-center justify-center gap-4",
                className
            )}
        >
            <Spinner className={cn("text-primary", spinnerSizes[spinnerSize])} />
            <p className="text-muted-foreground text-sm">{message}</p>
        </div>
    );
}
