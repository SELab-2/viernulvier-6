"use client";

import { cn } from "@/lib/utils";

export interface FormErrorProps {
    message: string;
    className?: string;
}

export function FormError({ message, className }: FormErrorProps) {
    return (
        <div
            className={cn("bg-destructive/10 border-destructive rounded-md border p-3", className)}
        >
            <p className="text-destructive text-sm font-medium">{message}</p>
        </div>
    );
}
