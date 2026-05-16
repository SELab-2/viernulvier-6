import axios, { AxiosError } from "axios";
import { queryClient } from "./query-client";
import { FailedRequest, CustomAxiosRequestConfig } from "@/types/api/api.types";

import { queryKeys } from "@/hooks/api";
import { RefreshTokenResponse } from "@/types/api/auth.api.types";
import { getBasePath } from "@/lib/base-path";
import { isProtectedRoute } from "@/lib/auth-routing";

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    withCredentials: true,
});

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];
let refreshPromise: Promise<RefreshTokenResponse> | null = null;

export function refreshAuthSession(): Promise<RefreshTokenResponse> {
    if (!refreshPromise) {
        refreshPromise = api
            .post<RefreshTokenResponse>("/auth/refresh")
            .then((response) => response.data)
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
}

const processQueue = (error: AxiosError | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;

        const isAuthRequest =
            originalRequest.url?.includes("/auth/login") ||
            originalRequest.url?.includes("/auth/logout") ||
            originalRequest.url?.includes("/auth/refresh");

        // Any non-auth request may be seeing an expired access token. Only redirect on protected UI routes.
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => api(originalRequest))
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                await refreshAuthSession();
                processQueue(null);
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as AxiosError, null);
                queryClient.removeQueries({ queryKey: queryKeys.user });

                if (typeof window !== "undefined") {
                    const { pathname } = window.location;
                    if (isProtectedRoute(pathname)) {
                        window.location.assign(`${getBasePath()}/login`);
                    }
                }

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);
