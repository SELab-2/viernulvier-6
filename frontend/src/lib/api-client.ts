import axios, { AxiosError } from "axios";
import { queryClient } from "./query-client";
import { FailedRequest, CustomAxiosRequestConfig } from "@/types/api/api.types";

import { queryKeys } from "@/hooks/api";
import { RefreshTokenResponse } from "@/types/api/auth.api.types";
import { getBasePath } from "@/lib/base-path";

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    withCredentials: true,
});

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

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

        // Skip refresh for login/logout and if it's already a retry
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes("/auth/login") &&
            !originalRequest.url?.includes("/auth/logout") &&
            !originalRequest.url?.includes("/auth/refresh")
        ) {
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
                await api.post<RefreshTokenResponse>("/auth/refresh");
                processQueue(null);
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as AxiosError, null);
                queryClient.removeQueries({ queryKey: queryKeys.user });

                if (typeof window !== "undefined") {
                    const { pathname } = window.location;
                    if (pathname.includes("/cms") && !pathname.includes("/login")) {
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
