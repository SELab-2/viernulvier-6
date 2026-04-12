import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/constants/i18n.constants";

const intlMiddleware = createIntlMiddleware(routing);

function extractLocale(pathname: string): string {
    const first = pathname.split("/").filter(Boolean)[0];
    return first && (SUPPORTED_LOCALES as readonly string[]).includes(first)
        ? first
        : DEFAULT_LOCALE;
}

export default function proxy(request: NextRequest) {
    const token = request.cookies.get("access_token")?.value;
    const pathname = request.nextUrl.pathname;

    const isProtectedRoute = pathname.includes("/cms");

    if (isProtectedRoute && !token) {
        const locale = extractLocale(pathname);
        const redirectUrl = new URL(`/${locale}/login`, request.url);
        return NextResponse.redirect(redirectUrl);
    }

    return intlMiddleware(request);
}

export const config = {
    matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
