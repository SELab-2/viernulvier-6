import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useTaxonomyLookup } from "@/hooks/api/useTaxonomyLookup";
import * as useTaxonomyModule from "@/hooks/api/useTaxonomy";

vi.mock("@/hooks/api/useTaxonomy");

const wrapper = ({ children }: { children: ReactNode }) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

beforeEach(() => {
    vi.mocked(useTaxonomyModule.useGetFacets).mockReturnValue({
        data: [
            {
                slug: "discipline",
                translations: [
                    { languageCode: "nl", label: "Discipline" },
                    { languageCode: "en", label: "Discipline" },
                ],
                tags: [
                    {
                        slug: "concert",
                        sortOrder: 1,
                        translations: [
                            { languageCode: "nl", label: "Concert", description: null },
                            { languageCode: "en", label: "Concert", description: null },
                        ],
                    },
                ],
            },
            {
                slug: "format",
                translations: [
                    { languageCode: "nl", label: "Vorm" },
                    { languageCode: "en", label: "Format" },
                ],
                tags: [
                    {
                        slug: "workshop",
                        sortOrder: 2,
                        translations: [
                            { languageCode: "nl", label: "Workshop", description: null },
                            { languageCode: "en", label: "Workshop", description: null },
                        ],
                    },
                ],
            },
        ],
        isLoading: false,
    } as ReturnType<typeof useTaxonomyModule.useGetFacets>);
});

describe("useTaxonomyLookup", () => {
    it("builds a slug → label map for the requested locale", () => {
        const { result } = renderHook(() => useTaxonomyLookup("nl"), { wrapper });
        const concert = result.current.get("concert");
        expect(concert).toBeDefined();
        expect(concert?.label).toBe("Concert");
        expect(concert?.facet).toBe("discipline");
        expect(concert?.facetSortIndex).toBe(0);
        expect(concert?.sortOrder).toBe(1);
    });

    it("falls back to the other locale's label when current locale is missing", () => {
        vi.mocked(useTaxonomyModule.useGetFacets).mockReturnValue({
            data: [
                {
                    slug: "format",
                    translations: [{ languageCode: "en", label: "Format" }],
                    tags: [
                        {
                            slug: "workshop",
                            sortOrder: 2,
                            translations: [
                                { languageCode: "en", label: "Workshop EN", description: null },
                            ],
                        },
                    ],
                },
            ],
            isLoading: false,
        } as ReturnType<typeof useTaxonomyModule.useGetFacets>);

        const { result } = renderHook(() => useTaxonomyLookup("nl"), { wrapper });
        expect(result.current.get("workshop")?.label).toBe("Workshop EN");
    });

    it("falls back to the slug when no translation is available", () => {
        vi.mocked(useTaxonomyModule.useGetFacets).mockReturnValue({
            data: [
                {
                    slug: "format",
                    translations: [],
                    tags: [
                        {
                            slug: "workshop",
                            sortOrder: 2,
                            translations: [],
                        },
                    ],
                },
            ],
            isLoading: false,
        } as unknown as ReturnType<typeof useTaxonomyModule.useGetFacets>);

        const { result } = renderHook(() => useTaxonomyLookup("nl"), { wrapper });
        expect(result.current.get("workshop")?.label).toBe("workshop");
    });
});
