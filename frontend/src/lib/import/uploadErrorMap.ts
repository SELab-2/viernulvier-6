const ERROR_CODE_MAP: Record<string, string> = {
    invalid_csv: "errors.uploadInvalidCsv",
    missing_headers: "errors.uploadMissingHeaders",
    too_few_columns: "errors.uploadTooFewColumns",
    empty_file: "errors.uploadEmptyFile",
    wrong_delimiter: "errors.uploadWrongDelimiter",
    invalid_encoding: "errors.uploadInvalidEncoding",
};

export function uploadErrorKey(error: unknown): string {
    if (error !== null && typeof error === "object" && "response" in error) {
        const response = (error as { response?: { data?: { code?: string } } }).response;
        const code = response?.data?.code;
        if (
            typeof code === "string" &&
            Object.prototype.hasOwnProperty.call(ERROR_CODE_MAP, code)
        ) {
            return ERROR_CODE_MAP[code] as string;
        }
    }
    return "errors.uploadFailed";
}
