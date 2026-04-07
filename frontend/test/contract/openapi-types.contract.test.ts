import { describe, expectTypeOf, it } from "vitest";

import { components, operations } from "@/types/api/generated";
import { EventCreateRequest, EventResponse, EventUpdateRequest } from "@/types/api/event.api.types";
import { HallCreateRequest, HallResponse, HallUpdateRequest } from "@/types/api/hall.api.types";
import {
    LocationCreateRequest,
    LocationResponse,
    LocationUpdateRequest,
} from "@/types/api/location.api.types";
import {
    ProductionCreateRequest,
    ProductionResponse,
    ProductionUpdateRequest,
} from "@/types/api/production.api.types";
import { SpaceCreateRequest, SpaceResponse, SpaceUpdateRequest } from "@/types/api/space.api.types";
import { FacetResponse, TagResponse, EntityType, Facet } from "@/types/api/taxonomy.api.types";

describe("OpenAPI type contract", () => {
    it("keeps resource aliases tied to generated schemas", () => {
        expectTypeOf<LocationResponse>().toEqualTypeOf<components["schemas"]["LocationPayload"]>();
        expectTypeOf<LocationCreateRequest>().toEqualTypeOf<
            components["schemas"]["LocationPostPayload"]
        >();
        expectTypeOf<LocationUpdateRequest>().toEqualTypeOf<
            components["schemas"]["LocationPayload"]
        >();

        expectTypeOf<ProductionResponse>().toEqualTypeOf<
            components["schemas"]["ProductionPayload"]
        >();
        expectTypeOf<ProductionCreateRequest>().toEqualTypeOf<
            components["schemas"]["ProductionPostPayload"]
        >();
        expectTypeOf<ProductionUpdateRequest>().toEqualTypeOf<
            components["schemas"]["ProductionPayload"]
        >();

        expectTypeOf<EventResponse>().toEqualTypeOf<components["schemas"]["EventPayload"]>();
        expectTypeOf<EventCreateRequest>().toEqualTypeOf<
            Omit<components["schemas"]["EventPostPayload"], "created_at" | "updated_at">
        >();
        expectTypeOf<EventUpdateRequest>().toEqualTypeOf<
            Omit<components["schemas"]["EventPayload"], "updated_at">
        >();

        expectTypeOf<HallResponse>().toEqualTypeOf<components["schemas"]["HallPayload"]>();
        expectTypeOf<HallCreateRequest>().toEqualTypeOf<components["schemas"]["HallPostPayload"]>();
        expectTypeOf<HallUpdateRequest>().toEqualTypeOf<components["schemas"]["HallPayload"]>();

        expectTypeOf<SpaceResponse>().toEqualTypeOf<components["schemas"]["SpacePayload"]>();
        expectTypeOf<SpaceCreateRequest>().toEqualTypeOf<
            components["schemas"]["SpacePostPayload"]
        >();
        expectTypeOf<SpaceUpdateRequest>().toEqualTypeOf<components["schemas"]["SpacePayload"]>();

        expectTypeOf<FacetResponse>().toEqualTypeOf<components["schemas"]["FacetResponse"]>();
        expectTypeOf<TagResponse>().toEqualTypeOf<components["schemas"]["TagResponse"]>();
        expectTypeOf<EntityType>().toEqualTypeOf<components["schemas"]["EntityType"]>();
        expectTypeOf<Facet>().toEqualTypeOf<components["schemas"]["Facet"]>();
    });

    it("keeps key operation schemas available", () => {
        expectTypeOf<
            operations["get_all_locations"]["responses"][200]["content"]["application/json"]
        >().toEqualTypeOf<components["schemas"]["PaginatedResponse_LocationPayload"]>();
        expectTypeOf<
            operations["create_production"]["requestBody"]["content"]["application/json"]
        >().toEqualTypeOf<components["schemas"]["ProductionPostPayload"]>();
        expectTypeOf<
            operations["get_all_events"]["responses"][200]["content"]["application/json"]
        >().toEqualTypeOf<components["schemas"]["PaginatedResponse_EventPayload"]>();
        expectTypeOf<
            operations["create_event"]["requestBody"]["content"]["application/json"]
        >().toEqualTypeOf<components["schemas"]["EventPostPayload"]>();
        expectTypeOf<
            operations["get_facets"]["responses"][200]["content"]["application/json"]
        >().toEqualTypeOf<components["schemas"]["FacetResponse"][]>();
    });
});
