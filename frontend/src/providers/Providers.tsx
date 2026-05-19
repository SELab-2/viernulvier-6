"use client";

import { type AbstractIntlMessages } from "next-intl";

import { IntlProvider, QueryProvider } from "@/providers";
import { PreviewProvider } from "@/contexts/PreviewContext";
import { Toaster } from "@/components/ui/sonner";
import { useSessionRefresh } from "@/hooks/useSessionRefresh";

function SessionRefresh() {
    useSessionRefresh();
    return null;
}

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
        <IntlProvider messages={messages} locale={locale} timeZone={timeZone}>
            <QueryProvider>
                <PreviewProvider>
                    <SessionRefresh />
                    {children}
                    <Toaster richColors />
                </PreviewProvider>
            </QueryProvider>
        </IntlProvider>
    );
}
