import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { PaginationParams, PaginatedResult } from "@/types/api/api.types";
import { operations } from "@/types/api/generated";
import { GetImportErrorsResponse, ImportErrorResponse } from "@/types/api/import-error.api.types";

import { queryKeys } from "./query-keys";

type GetImportErrorsQuery = NonNullable<operations["get_import_errors"]["parameters"]["query"]>;

interface ImportErrorsQueryParams extends PaginationParams {
    resolved?: GetImportErrorsQuery["resolved"];
}

interface ImportErrorsListOptions {
    enabled?: boolean;
    pagination?: PaginationParams;
    resolved?: GetImportErrorsQuery["resolved"];
}

type ImportErrorsResult = PaginatedResult<ImportErrorResponse>;

const fetchImportErrors = async (params?: ImportErrorsQueryParams): Promise<ImportErrorsResult> => {
    const { data } = await api.get<GetImportErrorsResponse>("/import-errors", { params });
    return {
        data: data.data,
        nextCursor: data.next_cursor ?? null,
    };
};

export const useGetImportErrors = (options?: ImportErrorsListOptions) => {
    const params: ImportErrorsQueryParams = {
        cursor: options?.pagination?.cursor,
        limit: options?.pagination?.limit ?? 50,
        resolved: options?.resolved,
    };

    return useQuery({
        queryKey: queryKeys.importErrors.all(options?.pagination, options?.resolved),
        queryFn: () => fetchImportErrors(params),
        ...options,
    });
};
