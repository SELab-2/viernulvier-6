import { describe, expect, it } from "vitest";

import { getBasePath } from "@/lib/base-path";

describe("getBasePath", () => {
    it("returns empty string when NEXT_PUBLIC_BASE_PATH is unset", () => {
        expect(getBasePath()).toBe("");
    });

    it("returns empty string when NEXT_PUBLIC_BASE_PATH is '/'", () => {
        process.env.NEXT_PUBLIC_BASE_PATH = "/";
        expect(getBasePath()).toBe("");
    });

    it("returns the path when NEXT_PUBLIC_BASE_PATH is a named path", () => {
        process.env.NEXT_PUBLIC_BASE_PATH = "/my-preview";
        expect(getBasePath()).toBe("/my-preview");
    });
});
