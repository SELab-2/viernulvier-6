"use client";

import { useTranslations } from "next-intl";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
    /** Optional message to display. Defaults to a generic loading message */
    message?: string;
    className?: string;
    spinnerSize?: "sm" | "md" | "lg";
    /** Whether to take up full screen height */
    fullScreen?: boolean;
}

const spinnerSizes = {
    sm: "size-4",
    md: "size-6",
    lg: "size-8",
};

export function LoadingState({
    message,
    className,
    spinnerSize = "md",
    fullScreen = true,
}: LoadingStateProps) {
    const generalTranslations = useTranslations("General");
    const displayMessage = message ?? generalTranslations("loading");

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center gap-4",
                fullScreen ? "h-screen" : "min-h-[50vh]",
                className
            )}
        >
            <Spinner className={cn("text-primary", spinnerSizes[spinnerSize])} />
            <p className="text-muted-foreground text-sm">{displayMessage}</p>
        </div>
    );
}
