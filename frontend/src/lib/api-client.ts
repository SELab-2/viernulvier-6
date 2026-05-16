import axios, { AxiosError } from "axios";
import { queryClient } from "./query-client";
import { FailedRequest, CustomAxiosRequestConfig } from "@/types/api/api.types";

import { queryKeys } from "@/hooks/api";
import { RefreshTokenResponse } from "@/types/api/auth.api.types";
import { getBasePath } from "@/lib/base-path";
import { isProtectedApiRequest, isProtectedRoute } from "@/lib/auth-routing";

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

        const shouldRefreshAuth = isProtectedApiRequest(
            originalRequest.url,
            originalRequest.method
        );

        // Only protected API requests should attempt session refresh.
        if (error.response?.status === 401 && !originalRequest._retry && shouldRefreshAuth) {
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
