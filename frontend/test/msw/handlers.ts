import { http, HttpResponse } from "msw";
import { apiUrl } from "../utils/env";

export const handlers = [
    http.get(apiUrl("/locations"), () => {
        return HttpResponse.json([
            {
                id: "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404",
                source_id: 101,
                name: "Main Venue",
                code: "MV",
                street: "Mainstraat",
                number: "12",
                postal_code: "9000",
                city: "Gent",
                country: "Belgium",
                phone_1: "+32-9-000-00-00",
                phone_2: null,
                is_owned_by_viernulvier: true,
                uitdatabank_id: "udb-main",
            },
        ]);
    }),
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
];
