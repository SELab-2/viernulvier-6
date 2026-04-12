import { http, HttpResponse } from "msw";

import type { components } from "@/types/api/generated";
import { apiUrl } from "../../utils/env";

export const authHandlers = [
    http.get(apiUrl("/editor/me"), () => {
        return HttpResponse.json({
            id: "4c4d5a6b-5e2a-4e59-aaf4-f8b432dbf0a0",
            email: "admin@viernulvier.be",
            role: "admin",
        } satisfies components["schemas"]["EditorResponse"]);
    }),
    http.post(apiUrl("/auth/refresh"), () => {
        return HttpResponse.json({
            success: true,
            message: "refreshed",
        } satisfies components["schemas"]["AuthResponse"]);
    }),
    http.post(apiUrl("/auth/login"), () => {
        return HttpResponse.json({
            success: true,
            message: "logged-in",
        } satisfies components["schemas"]["AuthResponse"]);
    }),
    http.post(apiUrl("/auth/logout"), () => {
        return HttpResponse.json({
            success: true,
            message: "logged-out",
        } satisfies components["schemas"]["AuthResponse"]);
    }),
    http.post(apiUrl("/editor/create"), () => {
        return HttpResponse.json({
            id: "bb360abf-6728-4cfe-8b9a-79d0adfb3222",
            email: "new.editor@viernulvier.be",
            role: "editor",
        } satisfies components["schemas"]["EditorResponse"]);
    }),
];
