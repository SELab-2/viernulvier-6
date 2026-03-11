"use client";

import { type AbstractIntlMessages } from "next-intl";

import { IntlProvider, QueryProvider, ThemeProvider } from "@/providers";
import { Toaster } from "@/components/ui/sonner";

export function Providers({
    children,
    messages,
    locale,
    timeZone,
}: {
    children: React.ReactNode;
    messages: AbstractIntlMessages;
    locale?: string;
    timeZone?: string;
}) {
    return (
        <ThemeProvider>
            <IntlProvider messages={messages} locale={locale} timeZone={timeZone}>
                <QueryProvider>
                    {children}
                    <Toaster richColors />
                </QueryProvider>
            </IntlProvider>
        </ThemeProvider>
    );
}
