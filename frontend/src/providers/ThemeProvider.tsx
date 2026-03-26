"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // next-themes injects an inline <script> for pre-hydration theme detection.
    // React 19 warns about script tags inside client components, but this is a
    // known upstream issue (https://github.com/pacocoursey/next-themes/issues/296).
    // The warning is cosmetic, the script runs correctly via SSR and the theme works.
    return (
        <NextThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            value={{ light: "light", dark: "dark" }}
            disableTransitionOnChange
        >
            {children}
        </NextThemeProvider>
    );
}
