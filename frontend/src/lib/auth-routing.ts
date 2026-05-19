const LOCALE_SEGMENTS = new Set(["en", "nl"]);
const AUTH_API_PATHS = new Set(["/auth/login", "/auth/logout", "/auth/refresh"]);
const WRITE_METHODS = new Set(["post", "put", "patch", "delete"]);

function toPath(value: string): string {
    try {
        return new URL(value, "http://local").pathname;
    } catch {
        return value.split("?")[0]?.split("#")[0] ?? value;
    }
}

function stripLocale(pathname: string): string {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0 && LOCALE_SEGMENTS.has(segments[0])) {
        return `/${segments.slice(1).join("/")}`;
    }
    return pathname || "/";
}

export function isProtectedRoute(pathname: string): boolean {
    const path = stripLocale(toPath(pathname));
    return (
        path === "/cms" ||
        path.startsWith("/cms/") ||
        path === "/admin" ||
        path.startsWith("/admin/")
    );
}

export function isProtectedApiRequest(url: string | undefined, method = "get"): boolean {
    if (!url) return false;

    const path = toPath(url);
    const normalizedMethod = method.toLowerCase();
    const segments = path.split("/").filter(Boolean);

    if (AUTH_API_PATHS.has(path)) return false;
    if (path === "/editor/me") return true;
    if (segments.includes("cms")) return true;
    if (/^\/collections\/[^/]+\/items(?:\/|$)/.test(path)) return true;
    if (path === "/media/upload-url") return true;
    if (path === "/taxonomy/tags" || path.startsWith("/taxonomy/tags/")) return true;
    if (WRITE_METHODS.has(normalizedMethod)) return true;

    return path === "/import-errors";
}
