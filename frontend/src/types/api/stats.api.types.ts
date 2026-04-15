import { components } from "@/types/api/generated";
import { SuccessResponse } from "./api.types";

export type GetStatsResponse = SuccessResponse<"get_stats">;

export type StatsPayload = components["schemas"]["StatsPayload"];
