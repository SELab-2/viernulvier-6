import { describe, expect, it } from "vitest";

import { mapUser } from "@/mappers/user.mapper";
import { UserRole } from "@/types/models/user.types";

describe("mapUser", () => {
    it("maps admin DTO to user domain model", () => {
        const mapped = mapUser({
            id: "e911f5ce-9ffd-4dcf-9f0d-2f95fbd58fc7",
            email: "admin@example.com",
            role: "admin",
        });

        expect(mapped).toEqual({
            id: "e911f5ce-9ffd-4dcf-9f0d-2f95fbd58fc7",
            email: "admin@example.com",
            role: UserRole.ADMIN,
        });
    });

    it("falls back to user role when missing/unknown", () => {
        expect(
            mapUser({
                id: "id-1",
                email: "a@b.com",
            }).role
        ).toBe(UserRole.USER);

        expect(
            mapUser({
                id: "id-2",
                email: "c@d.com",
                role: "super-admin",
            }).role
        ).toBe(UserRole.USER);
    });
});
