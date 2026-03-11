import { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";

import { hasLocale } from "next-intl";
import { getTimeZone, setRequestLocale } from "next-intl/server";

import { seoConfig } from "@/config/seo.config";
import { siteConfig } from "@/config/site.config";

import { routing } from "@/i18n/routing";

import "../globals.css";

import { Footer, Header } from "@/components/layout";
import { Providers } from "@/providers";
import { Toaster } from "@/components/ui";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
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

// Script to prevent flash of wrong theme - runs before React hydration
const ThemeScript = () => (
    <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Theme detection script must run before hydration
        dangerouslySetInnerHTML={{
            __html: `
                (function() {
                    try {
                        var theme = localStorage.getItem('theme');
                        var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                        var resolved = theme === 'system' || !theme ? systemTheme : theme;
                        document.documentElement.classList.add(resolved);
                    } catch (e) {}
                })();
            `,
        }}
    />
);

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

    const messages = (await import(`../../messages/${locale}.json`)).default;
    const timeZone = await getTimeZone();

    return (
        <html lang={locale} suppressHydrationWarning>
            <head>
                <ThemeScript />
            </head>
            <body
                className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}
            >
                <Providers messages={messages} locale={locale} timeZone={timeZone}>
                    <Header />
                    <main className="flex flex-1 flex-col">{children}</main>
                    <Toaster richColors />
                    <Footer />
                </Providers>
            </body>
        </html>
    );
}
