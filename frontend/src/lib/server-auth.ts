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
