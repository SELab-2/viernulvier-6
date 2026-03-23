import { loadEnvConfig } from "@next/env";

export const getApiBaseUrl = (): string => {
    let baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

    if (!baseUrl) {
        loadEnvConfig(process.cwd());
        baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
    }

    if (!baseUrl) {
        throw new Error("NEXT_PUBLIC_API_URL must be set in the test environment.");
    }

    return baseUrl;
};

export const apiUrl = (path: string): string => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${getApiBaseUrl()}${normalizedPath}`;
};
