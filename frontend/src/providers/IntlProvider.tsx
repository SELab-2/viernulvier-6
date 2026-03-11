"use client";

import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";

export function IntlProvider({
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
        <NextIntlClientProvider messages={messages} locale={locale} timeZone={timeZone}>
            {children}
        </NextIntlClientProvider>
    );
}
