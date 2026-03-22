"use client";

import { forwardRef, InputHTMLAttributes, useId } from "react";

import { cn } from "@/lib/utils";

export interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
    label?: string;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
    ({ className, error, label, id, ...props }, ref) => {
        const generatedId = useId();
        const inputId = id || props.name || generatedId;

        return (
            <div className="flex w-full flex-col gap-1.5">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="text-foreground text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        {label}
                    </label>
                )}
                <input
                    id={inputId}
                    ref={ref}
                    className={cn(
                        "border-input bg-background peer ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm transition-colors",
                        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        error && "border-destructive focus-visible:ring-destructive",
                        className
                    )}
                    {...props}
                />
            </div>
        );
    }
);

InputField.displayName = "InputField";
