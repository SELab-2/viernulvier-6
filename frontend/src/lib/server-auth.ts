export type ServerAuthFetch = typeof fetch;
type AuthCookie = {
    name: string;
    value: string;
};

function apiUrl(path: string): string {
    const baseUrl = (process.env.NEXT_SERVER_API_URL ?? process.env.NEXT_PUBLIC_API_URL)?.replace(
        /\/+$/,
        ""
    );
    if (!baseUrl) {
        throw new Error(
            "NEXT_SERVER_API_URL or NEXT_PUBLIC_API_URL must be set for server auth checks."
        );
    }

    return `${baseUrl}${path}`;
}

export function buildCookieHeader(cookies: AuthCookie[]): string {
    return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

function hasCookie(cookieHeader: string, name: string, value: string): boolean {
    return cookieHeader
        .split(";")
        .map((cookie) => cookie.trim())
        .some((cookie) => cookie === `${name}=${value}`);
}

function shouldBypassAuthForE2e(cookieHeader: string): boolean {
    return (
        process.env.PLAYWRIGHT_AUTH_BYPASS === "1" &&
        hasCookie(cookieHeader, "session_present", "1")
    );
}

async function backendAuthRequest(
    path: string,
    cookieHeader: string,
    fetcher: ServerAuthFetch,
    method = "GET"
): Promise<Response> {
    return fetcher(apiUrl(path), {
        method,
        headers: {
            cookie: cookieHeader,
        },
        cache: "no-store",
    });
}

export async function hasValidCmsSession(
    cookieHeader: string,
    fetcher: ServerAuthFetch = fetch
): Promise<boolean> {
    if (!cookieHeader) return false;
    if (shouldBypassAuthForE2e(cookieHeader)) return true;

    const userResponse = await backendAuthRequest("/editor/me", cookieHeader, fetcher);
    if (userResponse.ok) return true;

    const refreshResponse = await backendAuthRequest(
        "/auth/refresh",
        cookieHeader,
        fetcher,
        "POST"
    );

    return refreshResponse.ok;
}
