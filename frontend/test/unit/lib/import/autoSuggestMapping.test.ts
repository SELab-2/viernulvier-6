import { describe, expect, it } from "vitest";

import { autoSuggestMapping } from "@/lib/import/autoSuggestMapping";
import type { FieldSpec } from "@/types/models/import.types";

function makeField(name: string, label: string, required = false): FieldSpec {
    return { name, label, required, uniqueLookup: false, fieldType: { kind: "string" } };
}

const productionFields: FieldSpec[] = [
    makeField("title_nl", "Titel", true),
    makeField("subtitle_nl", "Ondertitel"),
    makeField("description_nl", "Description"),
    makeField("genre", "Genre"),
    makeField("source_id", "Planning ID"),
];

const eventFields: FieldSpec[] = [
    makeField("start_time", "Starttime", true),
    makeField("end_time", "Endtime"),
    makeField("hall_id", "Hall"),
    makeField("production_id", "Production"),
];

describe("autoSuggestMapping", () => {
    it("returns empty object for empty headers", () => {
        const result = autoSuggestMapping([], productionFields);
        expect(result).toEqual({});
    });

    it("maps all headers to null when fields list is empty", () => {
        const result = autoSuggestMapping(["Titel", "Genre"], []);
        expect(result).toEqual({ Titel: null, Genre: null });
    });

    it("exact label match — Titel → title_nl", () => {
        const result = autoSuggestMapping(["Titel"], productionFields);
        expect(result["Titel"]).toBe("title_nl");
    });

    it("exact label match — Ondertitel → subtitle_nl", () => {
        const result = autoSuggestMapping(["Ondertitel"], productionFields);
        expect(result["Ondertitel"]).toBe("subtitle_nl");
    });

    it("exact label match — Starttime → start_time", () => {
        const result = autoSuggestMapping(["Starttime"], eventFields);
        expect(result["Starttime"]).toBe("start_time");
    });

    it("exact label match — Hall → hall_id", () => {
        const result = autoSuggestMapping(["Hall"], eventFields);
        expect(result["Hall"]).toBe("hall_id");
    });

    it("exact name match (normalised) — genre header → genre field", () => {
        const result = autoSuggestMapping(["Genre"], productionFields);
        expect(result["Genre"]).toBe("genre");
    });

    it("underscore↔space equivalence — 'planning id' matches 'Planning ID' label → source_id", () => {
        const result = autoSuggestMapping(["Planning ID"], productionFields);
        expect(result["Planning ID"]).toBe("source_id");
    });

    it("case-insensitive match — 'titel' lower-case maps to title_nl", () => {
        const result = autoSuggestMapping(["titel"], productionFields);
        expect(result["titel"]).toBe("title_nl");
    });

    it("name-based match — 'start_time' header matches start_time field", () => {
        const result = autoSuggestMapping(["start_time"], eventFields);
        expect(result["start_time"]).toBe("start_time");
    });

    it("below-threshold header returns null", () => {
        const result = autoSuggestMapping(["XYZXYZXYZ"], productionFields);
        expect(result["XYZXYZXYZ"]).toBeNull();
    });

    it("maps all legacy production headers correctly", () => {
        const headers = ["Titel", "Ondertitel", "Description1", "Genre", "Planning ID"];
        const result = autoSuggestMapping(headers, productionFields);
        expect(result["Titel"]).toBe("title_nl");
        expect(result["Ondertitel"]).toBe("subtitle_nl");
        expect(result["Genre"]).toBe("genre");
        expect(result["Planning ID"]).toBe("source_id");
    });

    it("maps all legacy event headers correctly", () => {
        const headers = ["Starttime", "Endtime", "Hall", "Production"];
        const result = autoSuggestMapping(headers, eventFields);
        expect(result["Starttime"]).toBe("start_time");
        expect(result["Endtime"]).toBe("end_time");
        expect(result["Hall"]).toBe("hall_id");
        expect(result["Production"]).toBe("production_id");
    });

    it("duplicate matches — two headers mapping to the same field both resolve (no uniqueness enforcement)", () => {
        const fields: FieldSpec[] = [makeField("title_nl", "Titel")];
        const result = autoSuggestMapping(["Titel", "titel"], fields);
        expect(result["Titel"]).toBe("title_nl");
        expect(result["titel"]).toBe("title_nl");
    });
});
