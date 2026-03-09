"use client";

import { type AbstractIntlMessages } from "next-intl";

import { IntlProvider, QueryProvider, ThemeProvider } from "@/providers";
import { Toaster } from "@/components/ui/sonner";

export function Providers({
    children,
    messages,
    locale,
}: {
    children: React.ReactNode;
    messages: AbstractIntlMessages;
    locale?: string;
}) {
    return (
        <ThemeProvider>
            <IntlProvider messages={messages} locale={locale}>
                <QueryProvider>
                    {children}
                    <Toaster richColors />
                </QueryProvider>
            </IntlProvider>
        </ThemeProvider>
    );
}
