import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export function proxy(request: NextRequest) {
    const token = request.cookies.get("jwt")?.value;
    const pathname = request.nextUrl.pathname;

    const isAuthRoute = pathname.includes("/login");
    const isProtectedRoute = pathname.includes("/admin");

    if (isProtectedRoute && !token) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (isAuthRoute && token) {
        return NextResponse.redirect(new URL("/admin", request.url));
    }

    // Process i18n routing if no auth redirects are needed
    return intlMiddleware(request);
}

export const config = {
    matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
