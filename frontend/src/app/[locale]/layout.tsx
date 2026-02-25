import { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";

import { hasLocale } from "next-intl";
import { getMessages, getTimeZone, setRequestLocale } from "next-intl/server";

import { seoConfig } from "@/config/seo.config";
import { siteConfig } from "@/config/site.config";

import { routing } from "@/i18n/routing";

import "../globals.css";

import { Footer, Header } from "@/components/layout";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/providers";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;

    return {
        ...seoConfig,
        alternates: {
            canonical: `/${locale}`,
            languages: siteConfig.languages,
        },
    } satisfies Metadata;
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

    const [messages, timeZone] = await Promise.all([getMessages(), getTimeZone()]);

    return (
        <html lang={locale} suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} min-h-screen w-full antialiased`}
            >
                <Providers messages={messages} locale={locale} timeZone={timeZone}>
                    <Header />
                    {children}
                    <Toaster richColors />
                    <Footer />
                </Providers>
            </body>
        </html>
    );
}
