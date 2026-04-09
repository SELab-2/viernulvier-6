import { Metadata } from "next";
import { redirect } from "next/navigation";

import { hasLocale } from "next-intl";
import { getMessages, getTimeZone, setRequestLocale } from "next-intl/server";

import { seoConfig } from "@/config/seo.config";
import { siteConfig } from "@/config/site.config";

import { routing } from "@/i18n/routing";

import { Providers } from "@/providers";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;

    return {
        ...seoConfig,
        alternates: {
            canonical: `/${locale}`,
            languages: siteConfig.languages,
        },
    };
}

export default async function LocaleLayout({
    children,
    params,
}: Readonly<{
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}>) {
    const { locale } = await params;

    if (!hasLocale(routing.locales, locale)) {
        redirect(`/en`);
    }

    setRequestLocale(locale);

    const messages = await getMessages();
    const timeZone = await getTimeZone();

    return (
        <Providers messages={messages} locale={locale} timeZone={timeZone}>
            {children}
        </Providers>
    );
}
