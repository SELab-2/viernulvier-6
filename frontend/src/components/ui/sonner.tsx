"use client";

import { Check, Info, Loader2, TriangleAlert, X } from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
    const { theme = "system" } = useTheme();

    return (
        <Sonner
            theme={theme as ToasterProps["theme"]}
            className="toaster group"
            icons={{
                success: <Check className="size-4" />,
                info: <Info className="size-4" />,
                warning: <TriangleAlert className="size-4" />,
                error: <X className="size-4" />,
                loading: <Loader2 className="size-4 animate-spin" />,
            }}
            style={
                {
                    "--normal-bg": "var(--popover)",
                    "--normal-text": "var(--popover-foreground)",
                    "--normal-border": "var(--border)",
                    "--success-bg": "var(--popover)",
                    "--success-text": "var(--popover-foreground)",
                    "--success-border": "var(--border)",
                    "--error-bg": "var(--popover)",
                    "--error-text": "var(--destructive)",
                    "--error-border": "var(--destructive)",
                    "--border-radius": "var(--radius)",
                } as React.CSSProperties
            }
            toastOptions={{
                classNames: {
                    toast: "gap-3 px-4 py-3 text-sm",
                    icon: "mt-0.5 shrink-0",
                    success: "border-l-2 border-l-foreground",
                    error: "border-l-2 border-l-destructive",
                    warning: "border-l-2 border-l-muted-foreground",
                    info: "border-l-2 border-l-muted-foreground",
                },
            }}
            {...props}
        />
    );
};

export { Toaster };
