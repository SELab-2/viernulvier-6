import { InternalAxiosRequestConfig } from "axios";
import { operations } from "@/types/api/generated";

export type FailedRequest = {
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
};

export interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

// Utility type to extract success response (200 or 201) content from an operation
export type SuccessResponse<T extends keyof operations> = operations[T]["responses"] extends {
    200: { content: { "application/json": infer R } };
}
    ? R
    : operations[T]["responses"] extends {
            201: { content: { "application/json": infer R } };
        }
      ? R
      : never;

// Utility type to extract paginated list response
export type PaginatedListResponse<T extends keyof operations> = operations[T]["responses"] extends {
    200: { content: { "application/json": infer R } };
}
    ? R
    : never;

// Pagination types
export interface PaginationParams {
    cursor?: string | null;
    limit?: number;
}

export interface SearchPaginationParams extends PaginationParams {
    q?: string;
    discipline?: string;
    format?: string;
    theme?: string;
    audience?: string;
    accessibility?: string;
    language?: string;
    date_from?: string;
    date_to?: string;
    sort?: string;
}

export interface PaginatedResult<T> {
    data: T[];
    nextCursor: string | null;
}

// Entity-specific operation name patterns
export type GetOneOperation<Entity extends string> = `get_one_${Entity}` | `get_${Entity}_by_id`;
export type GetAllOperation<Entity extends string> = `get_all_${Entity}s`;
export type CreateOperation<Entity extends string> = `create_${Entity}`;
export type UpdateOperation<Entity extends string> = `update_${Entity}`;
