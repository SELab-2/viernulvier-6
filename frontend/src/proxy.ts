import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export function proxy(request: NextRequest) {
    const token = request.cookies.get("access_token")?.value;
    const pathname = request.nextUrl.pathname;

    const isAuthRoute = pathname.includes("/login");
    const isProtectedRoute = pathname.includes("/cms");

    if (isProtectedRoute && !token) {
        // Mutate the path and let next-intl handle the localized redirect
        request.nextUrl.pathname = "/login";
        return intlMiddleware(request);
    }

    if (isAuthRoute && token) {
        // Mutate the path and let next-intl handle the localized redirect
        request.nextUrl.pathname = "/cms";
        return intlMiddleware(request);
    }

    return intlMiddleware(request);
}

export const config = {
    matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
