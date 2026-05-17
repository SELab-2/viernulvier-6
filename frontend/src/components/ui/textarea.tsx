import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
    function Textarea({ className, ...props }, ref) {
        return (
            <textarea
                ref={ref}
                data-slot="textarea"
                className={cn(
                    "border-input selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground dark:bg-input/30 w-full min-w-0 rounded-none border bg-transparent px-3 py-2 text-base shadow-xs transition-colors outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                    "focus-visible:border-ring",
                    "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
                    className
                )}
                {...props}
            />
        );
    }
);

export { Textarea };
