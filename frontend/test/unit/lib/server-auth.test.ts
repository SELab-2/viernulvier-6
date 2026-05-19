import { afterEach, describe, expect, it, vi } from "vitest";

import { buildCookieHeader, hasValidCmsSession, type ServerAuthFetch } from "@/lib/server-auth";

describe("server-auth", () => {
    const originalServerApiUrl = process.env.NEXT_SERVER_API_URL;

    afterEach(() => {
        if (originalServerApiUrl === undefined) {
            delete process.env.NEXT_SERVER_API_URL;
        } else {
            process.env.NEXT_SERVER_API_URL = originalServerApiUrl;
        }
    });

    it("serializes cookies for backend server auth checks", () => {
        expect(
            buildCookieHeader([
                { name: "access_token", value: "access" },
                { name: "refresh_token", value: "refresh" },
            ])
        ).toBe("access_token=access; refresh_token=refresh");
    });

    it("accepts a valid access token without refreshing", async () => {
        const fetcher = vi
            .fn<ServerAuthFetch>()
            .mockResolvedValueOnce(new Response(null, { status: 200 }));

        await expect(hasValidCmsSession("access_token=valid", fetcher)).resolves.toBe(true);

        expect(fetcher).toHaveBeenCalledOnce();
        expect(fetcher).toHaveBeenCalledWith(
            "http://localhost:3001/api/editor/me",
            expect.objectContaining({ headers: { cookie: "access_token=valid" } })
        );
    });

    it("prefers the internal server API URL when configured", async () => {
        process.env.NEXT_SERVER_API_URL = "http://api:3001/api";
        const fetcher = vi
            .fn<ServerAuthFetch>()
            .mockResolvedValueOnce(new Response(null, { status: 200 }));

        await hasValidCmsSession("access_token=valid", fetcher);

        expect(fetcher).toHaveBeenCalledWith("http://api:3001/api/editor/me", expect.any(Object));
    });

    it("accepts an expired access token when refresh succeeds", async () => {
        const fetcher = vi
            .fn<ServerAuthFetch>()
            .mockResolvedValueOnce(new Response(null, { status: 401 }))
            .mockResolvedValueOnce(new Response(null, { status: 200 }));

        await expect(
            hasValidCmsSession("access_token=expired; refresh_token=valid", fetcher)
        ).resolves.toBe(true);

        expect(fetcher).toHaveBeenCalledTimes(2);
        expect(fetcher).toHaveBeenLastCalledWith(
            "http://localhost:3001/api/auth/refresh",
            expect.objectContaining({ method: "POST" })
        );
    });

    it("rejects invalid access and refresh tokens before rendering cms", async () => {
        const fetcher = vi
            .fn<ServerAuthFetch>()
            .mockResolvedValueOnce(new Response(null, { status: 401 }))
            .mockResolvedValueOnce(new Response(null, { status: 401 }));

        await expect(
            hasValidCmsSession("access_token=random; refresh_token=random", fetcher)
        ).resolves.toBe(false);
    });

    it("rejects requests without auth cookies", async () => {
        const fetcher = vi.fn<ServerAuthFetch>();

        await expect(hasValidCmsSession("", fetcher)).resolves.toBe(false);

        expect(fetcher).not.toHaveBeenCalled();
    });
});
