"use client";

import { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    loadingText?: string;
    children: React.ReactNode;
}

export function SubmitButton({
    isLoading,
    loadingText,
    children,
    className,
    disabled,
    ...props
}: SubmitButtonProps) {
    return (
        <button
            type="submit"
            disabled={disabled || isLoading}
            className={cn(
                "bg-primary text-primary-foreground hover:bg-primary/90 flex h-10 w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
                "disabled:opacity-50",
                className
            )}
            {...props}
        >
            {isLoading && loadingText ? loadingText : children}
        </button>
    );
}
