export type FailedRequest = {
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
};
