import { describe, it, expect } from "vitest";
import { uploadErrorKey } from "@/lib/import/uploadErrorMap";

describe("uploadErrorKey", () => {
    it("returns the mapped key for a known error code", () => {
        const err = { response: { data: { code: "invalid_csv" } } };
        expect(uploadErrorKey(err)).toBe("errors.uploadInvalidCsv");
    });

    it("returns the mapped key for wrong_delimiter", () => {
        const err = { response: { data: { code: "wrong_delimiter" } } };
        expect(uploadErrorKey(err)).toBe("errors.uploadWrongDelimiter");
    });

    it("returns the fallback key for an unknown code", () => {
        const err = { response: { data: { code: "completely_unknown" } } };
        expect(uploadErrorKey(err)).toBe("errors.uploadFailed");
    });

    it("returns the fallback key when there is no response body", () => {
        const err = { message: "Network Error" };
        expect(uploadErrorKey(err)).toBe("errors.uploadFailed");
    });

    it("returns the fallback key for null input", () => {
        expect(uploadErrorKey(null)).toBe("errors.uploadFailed");
    });
});
