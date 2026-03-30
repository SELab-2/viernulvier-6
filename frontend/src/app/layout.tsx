import type { Metadata } from "next";
import { Playfair_Display, DM_Mono, Inter } from "next/font/google";

import "./globals.css";

import { ThemeProvider } from "@/providers";

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

export const metadata: Metadata = {
    title: "Viernulvier Archive",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html suppressHydrationWarning>
            <body
                className={`${playfair.variable} ${dmMono.variable} ${inter.variable} font-body flex min-h-screen w-full flex-col antialiased`}
            >
                <ThemeProvider>{children}</ThemeProvider>
            </body>
        </html>
    );
}
