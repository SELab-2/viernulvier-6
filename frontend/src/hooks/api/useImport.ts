import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import {
    mapFieldSpecs,
    mapImportRow,
    mapImportRows,
    mapImportSession,
    mapImportSessions,
    mapUpdateMappingRequest,
    mapUpdateRowRequest,
    mapUploadResult,
} from "@/mappers/import.mapper";
import {
    FieldSpecResponse,
    ImportRowResponse,
    ImportSessionResponse,
    UploadResponse,
} from "@/types/api/import.api.types";
import {
    FieldSpec,
    ImportMapping,
    ImportRow,
    ImportRowsParams,
    ImportSession,
    ImportSessionStatus,
    ImportSessionsParams,
    UploadResult,
} from "@/types/models/import.types";

import { queryKeys } from "./query-keys";

const ACTIVE_SESSION_POLL_MS = 1500;
const ACTIVE_SESSION_STATUSES = new Set<ImportSessionStatus>(["dry_run_pending", "committing"]);

const isActiveSessionStatus = (status: ImportSessionStatus | undefined): boolean =>
    Boolean(status && ACTIVE_SESSION_STATUSES.has(status));

// ─── Queries ──────────────────────────────────────────────────────────────────

const fetchImportSessions = async (params?: ImportSessionsParams): Promise<ImportSession[]> => {
    const { data } = await api.get<ImportSessionResponse[]>("/import/sessions", { params });
    return mapImportSessions(data);
};

const fetchImportSession = async (id: string): Promise<ImportSession> => {
    const { data } = await api.get<ImportSessionResponse>(`/import/sessions/${id}`);
    return mapImportSession(data);
};

const fetchImportRows = async (
    sessionId: string,
    params?: ImportRowsParams
): Promise<ImportRow[]> => {
    const { data } = await api.get<ImportRowResponse[]>(`/import/sessions/${sessionId}/rows`, {
        params,
    });
    return mapImportRows(data);
};

const fetchFieldSpec = async (entityType: string): Promise<FieldSpec[]> => {
    const { data } = await api.get<FieldSpecResponse[]>(`/import/fields/${entityType}`);
    return mapFieldSpecs(data);
};

const fetchEntityTypes = async (): Promise<string[]> => {
    const { data } = await api.get<string[]>("/import/entity-types");
    return data;
};

export const useImportSessions = (params?: ImportSessionsParams) => {
    return useQuery({
        queryKey: queryKeys.imports.sessions(params),
        queryFn: () => fetchImportSessions(params),
    });
};

export const useImportSession = (id: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.imports.session(id),
        queryFn: () => fetchImportSession(id),
        enabled: Boolean(id) && (options?.enabled ?? true),
        refetchInterval: (query) => {
            const status = (query.state.data as ImportSession | undefined)?.status;
            return isActiveSessionStatus(status) ? ACTIVE_SESSION_POLL_MS : false;
        },
    });
};

export const useImportRows = (
    sessionId: string,
    params?: ImportRowsParams,
    options?: { enabled?: boolean }
) => {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: queryKeys.imports.rows(sessionId, params),
        queryFn: () => fetchImportRows(sessionId, params),
        enabled: Boolean(sessionId) && (options?.enabled ?? true),
        refetchInterval: () => {
            const session = queryClient.getQueryData<ImportSession>(
                queryKeys.imports.session(sessionId)
            );
            return isActiveSessionStatus(session?.status) ? ACTIVE_SESSION_POLL_MS : false;
        },
    });
};

export const useFieldSpec = (entityType: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.imports.fieldSpec(entityType),
        queryFn: () => fetchFieldSpec(entityType),
        enabled: Boolean(entityType) && (options?.enabled ?? true),
    });
};

export const useEntityTypes = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.imports.entityTypes,
        queryFn: fetchEntityTypes,
        enabled: options?.enabled ?? true,
    });
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useCreateImportSession = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: { file: File; entityType: string }): Promise<UploadResult> => {
            const form = new FormData();
            form.append("file", payload.file);
            form.append("entity_type", payload.entityType);
            const { data } = await api.post<UploadResponse>("/import/sessions", form);
            return mapUploadResult(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.imports.sessions() });
        },
    });
};

export const useUpdateMapping = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: {
            id: string;
            mapping: ImportMapping;
        }): Promise<ImportSession> => {
            const { data } = await api.patch<ImportSessionResponse>(
                `/import/sessions/${payload.id}/mapping`,
                mapUpdateMappingRequest(payload.mapping)
            );
            return mapImportSession(data);
        },
        onSuccess: (session) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.imports.session(session.id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.imports.sessions() });
        },
    });
};

export const useStartDryRun = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string): Promise<ImportSession> => {
            const { data } = await api.post<ImportSessionResponse>(
                `/import/sessions/${id}/dry-run`
            );
            return mapImportSession(data);
        },
        onSuccess: (session) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.imports.session(session.id) });
            queryClient.invalidateQueries({
                queryKey: queryKeys.imports.rows(session.id),
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.imports.sessions() });
        },
    });
};

export const useUpdateRow = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: {
            id: string;
            sessionId: string;
            overrides?: Record<string, unknown> | null;
            resolvedRefs?: Record<string, string | null> | null;
            skip?: boolean | null;
        }): Promise<ImportRow> => {
            const { data } = await api.patch<ImportRowResponse>(
                `/import/rows/${payload.id}`,
                mapUpdateRowRequest({
                    overrides: payload.overrides,
                    resolvedRefs: payload.resolvedRefs,
                    skip: payload.skip,
                })
            );
            return mapImportRow(data);
        },
        onSuccess: (_row, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.imports.rows(variables.sessionId),
            });
        },
    });
};

export const useCommitImport = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string): Promise<ImportSession> => {
            const { data } = await api.post<ImportSessionResponse>(`/import/sessions/${id}/commit`);
            return mapImportSession(data);
        },
        onSuccess: (session) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.imports.session(session.id) });
            queryClient.invalidateQueries({
                queryKey: queryKeys.imports.rows(session.id),
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.imports.sessions() });
        },
    });
};

export const useRevertRow = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: { id: string; sessionId: string }): Promise<ImportRow> => {
            const { data } = await api.post<ImportRowResponse>(`/import/rows/${payload.id}/revert`);
            return mapImportRow(data);
        },
        onSuccess: (_row, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.imports.rows(variables.sessionId),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.imports.session(variables.sessionId),
            });
        },
    });
};

export const useRollbackSession = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string): Promise<ImportSession> => {
            const { data } = await api.post<ImportSessionResponse>(
                `/import/sessions/${id}/rollback`
            );
            return mapImportSession(data);
        },
        onSuccess: (session) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.imports.session(session.id) });
            queryClient.invalidateQueries({
                queryKey: queryKeys.imports.rows(session.id),
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.imports.sessions() });
        },
    });
};

export const useCancelSession = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string): Promise<void> => {
            await api.delete(`/import/sessions/${id}`);
        },
        onSuccess: (_result, id) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.imports.sessions() });
            queryClient.removeQueries({ queryKey: queryKeys.imports.session(id) });
        },
    });
};
