import { operations, paths } from "@/types/api/generated";

export type PathKey = keyof paths;
export type OperationKey = keyof operations;

type JsonContent<T> = T extends { content: { "application/json": infer R } } ? R : never;

type FirstSuccessResponse<TResponses> = 200 extends keyof TResponses
    ? TResponses[200]
    : 201 extends keyof TResponses
      ? TResponses[201]
      : 202 extends keyof TResponses
        ? TResponses[202]
        : 203 extends keyof TResponses
          ? TResponses[203]
          : 204 extends keyof TResponses
            ? TResponses[204]
            : never;

export type OperationRequestBody<TOperation extends OperationKey> = operations[TOperation] extends {
    requestBody: { content: { "application/json": infer TBody } };
}
    ? TBody
    : never;

export type OperationSuccessResponse<TOperation extends OperationKey> = JsonContent<
    FirstSuccessResponse<operations[TOperation]["responses"]>
>;

export type PathOperation<
    TPath extends PathKey,
    TMethod extends keyof paths[TPath],
> = paths[TPath][TMethod];
