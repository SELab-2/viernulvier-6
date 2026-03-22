import { Metadata } from "next";
import { Playfair_Display, DM_Mono, Inter } from "next/font/google";
import { notFound } from "next/navigation";

import { hasLocale } from "next-intl";
import { getMessages, getTimeZone, setRequestLocale } from "next-intl/server";

import { seoConfig } from "@/config/seo.config";
import { siteConfig } from "@/config/site.config";

import { routing } from "@/i18n/routing";

import "../globals.css";

import { Footer, Header } from "@/components/layout";
import { Providers } from "@/providers";

const playfair = Playfair_Display({
    variable: "--font-display",
    subsets: ["latin"],
    weight: ["400", "500", "700"],
    style: ["normal", "italic"],
});

const dmMono = DM_Mono({
    variable: "--font-mono",
    subsets: ["latin"],
    weight: ["400", "500"],
});

const inter = Inter({
    variable: "--font-body",
    subsets: ["latin"],
    weight: ["400", "500"],
});

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

export default async function RootLayout({
    children,
    params,
}: Readonly<{
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}>) {
    const { locale } = await params;

    if (!hasLocale(routing.locales, locale)) {
        notFound();
    }

    setRequestLocale(locale);

    const messages = await getMessages();
    const timeZone = await getTimeZone();

    return (
        <html lang={locale} suppressHydrationWarning>
            <body
                className={`${playfair.variable} ${dmMono.variable} ${inter.variable} font-body flex min-h-screen w-full flex-col antialiased`}
            >
                <Providers messages={messages} locale={locale} timeZone={timeZone}>
                    <Header />
                    <main className="flex-1">{children}</main>
                    <Footer />
                </Providers>
            </body>
        </html>
    );
}
