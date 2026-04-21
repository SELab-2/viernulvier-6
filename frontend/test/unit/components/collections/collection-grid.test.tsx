import { describe, expect, it, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, cleanup } from "../../../utils/test-utils";
import { CollectionGrid } from "@/components/collections/CollectionGrid";
import type { CollectionItem } from "@/types/models/collection.types";

vi.mock("@/components/collections/CollectionItemCard", () => ({
    UniformCardsContext: React.createContext(false),
    CollectionItemCard: ({ item }: { item: CollectionItem }) => (
        <div data-testid="card" data-position={String(item.position)} datatype={item.contentType} />
    ),
}));

const makeItem = (
    id: string,
    position: number,
    contentType: CollectionItem["contentType"] = "production"
): CollectionItem => ({
    id,
    contentId: id,
    contentType,
    position,
    translations: [],
    createdAt: "2026-01-01T00:00:00Z",
});

describe("CollectionGrid", () => {
    afterEach(() => cleanup());

    it("renders one card per item", () => {
        const items = [makeItem("a", 1), makeItem("b", 2), makeItem("c", 3)];
        render(<CollectionGrid items={items} />);
        expect(screen.getAllByTestId("card")).toHaveLength(3);
    });

    it("renders items sorted by position ascending", () => {
        const items = [makeItem("a", 3), makeItem("b", 1), makeItem("c", 2)];
        render(<CollectionGrid items={items} />);
        const cards = screen.getAllByTestId("card");
        expect(cards[0]).toHaveAttribute("data-position", "1");
        expect(cards[1]).toHaveAttribute("data-position", "2");
        expect(cards[2]).toHaveAttribute("data-position", "3");
    });

    it("does not mutate the original items array during sort", () => {
        const items = [makeItem("a", 3), makeItem("b", 1)];
        const original = [...items];
        render(<CollectionGrid items={items} />);
        expect(items[0].id).toBe(original[0].id);
        expect(items[1].id).toBe(original[1].id);
    });

    it("renders an empty section when items is empty", () => {
        const { container } = render(<CollectionGrid items={[]} />);
        const section = container.querySelector("section");
        expect(section).toBeInTheDocument();
        expect(screen.queryByTestId("card")).not.toBeInTheDocument();
    });
});
