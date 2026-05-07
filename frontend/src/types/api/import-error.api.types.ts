import { PaginatedListResponse } from "./api.types";

export type GetImportErrorsResponse = PaginatedListResponse<"get_import_errors">;
export type ImportErrorsListResponse = GetImportErrorsResponse;
export type ImportErrorResponse = GetImportErrorsResponse["data"][number];
