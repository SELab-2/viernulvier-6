import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useGetLocations } from "@/hooks/api/useLocations";
import { queryKeys } from "@/hooks/api/query-keys";
import { createQueryClientWrapper } from "../../utils/query-client";

describe("useGetLocations", () => {
    it("maps DTO response to domain model", async () => {
        const { wrapper } = createQueryClientWrapper();

        const { result } = renderHook(() => useGetLocations(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual([
            {
                id: "67c95f6a-8bb8-43d6-a4bc-f7e18b86f404",
                sourceId: 101,
                name: "Main Venue",
                code: "MV",
                street: "Mainstraat",
                number: "12",
                postalCode: "9000",
                city: "Gent",
                country: "Belgium",
                phone1: "+32-9-000-00-00",
                phone2: null,
                isOwnedByViernulvier: true,
                uitdatabankId: "udb-main",
                address: "Mainstraat 12, 9000 Gent, Belgium",
            },
        ]);
    });

    it("uses React Query cache for repeated hook mounts", async () => {
        const { wrapper, queryClient } = createQueryClientWrapper();

        const first = renderHook(() => useGetLocations(), { wrapper });

        await waitFor(() => {
            expect(first.result.current.isSuccess).toBe(true);
        });

        const cached = queryClient.getQueryData(queryKeys.locations.all);
        expect(cached).toEqual(first.result.current.data);

        const second = renderHook(() => useGetLocations(), { wrapper });
        expect(second.result.current.data).toEqual(first.result.current.data);
    });
});
