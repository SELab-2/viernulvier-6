import { describe, expect, it } from "vitest";

import { queryKeys } from "@/hooks/api/query-keys";

describe("queryKeys", () => {
    it("returns stable collection keys", () => {
        expect(queryKeys.user).toEqual(["user"]);
        expect(queryKeys.version).toEqual(["version"]);
        expect(queryKeys.locations.all).toEqual(["locations"]);
        expect(queryKeys.productions.all).toEqual(["productions"]);
        expect(queryKeys.halls.all).toEqual(["halls"]);
        expect(queryKeys.spaces.all).toEqual(["spaces"]);
    });

    it("builds deterministic detail keys", () => {
        expect(queryKeys.locations.detail("id-1")).toEqual(["locations", "id-1"]);
        expect(queryKeys.productions.detail("id-2")).toEqual(["productions", "id-2"]);
        expect(queryKeys.halls.detail("id-3")).toEqual(["halls", "id-3"]);
        expect(queryKeys.spaces.detail("id-4")).toEqual(["spaces", "id-4"]);
    });
});
