import { http, HttpResponse } from "msw";

import { apiUrl } from "../../utils/env";

export const authHandlers = [
    http.get(apiUrl("/admin/me"), () => {
        return HttpResponse.json({
            id: "4c4d5a6b-5e2a-4e59-aaf4-f8b432dbf0a0",
            email: "admin@viernulvier.be",
        });
    }),
    http.post(apiUrl("/auth/refresh"), () => {
        return HttpResponse.json({
            success: true,
            message: "refreshed",
        });
    }),
    http.post(apiUrl("/auth/login"), () => {
        return HttpResponse.json({
            success: true,
            message: "logged-in",
        });
    }),
    http.post(apiUrl("/auth/logout"), () => {
        return HttpResponse.json({
            success: true,
            message: "logged-out",
        });
    }),
];
