import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const defaultApiBaseUrl = "http://localhost:3001/api";
const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? defaultApiBaseUrl;
const normalizedApiBaseUrl = configuredApiBaseUrl.replace(/\/+$/, "");
const openApiUrl = `${normalizedApiBaseUrl}/openapi.json`;
const outputFile = path.resolve("src/types/api/generated.ts");

mkdirSync(path.dirname(outputFile), { recursive: true });

try {
    execSync(`npx openapi-typescript "${openApiUrl}" -o "${outputFile}"`, {
        stdio: "inherit",
    });
} catch {
    console.error("Failed to generate OpenAPI types.");
    console.error(`Expected local backend OpenAPI at: ${openApiUrl}`);
    console.error("Make sure the backend is running before pushing.");
    process.exit(1);
}
