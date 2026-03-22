import { describe, expect, it } from "vitest";

import { mapUser } from "@/mappers/user.mapper";

describe("mapUser", () => {
    it("maps admin DTO to user domain model", () => {
        const mapped = mapUser({
            id: "e911f5ce-9ffd-4dcf-9f0d-2f95fbd58fc7",
            email: "admin@example.com",
        });

        expect(mapped).toEqual({
            id: "e911f5ce-9ffd-4dcf-9f0d-2f95fbd58fc7",
            email: "admin@example.com",
        });
    });
});
