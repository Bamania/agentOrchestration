import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * The ONE place that reads environment variables. Everything else imports
 * `config` instead of touching process.env, so every setting the app has is
 * listed here, typed, and defaulted.
 *
 * BE/.env is loaded with Node's built-in loader (no dotenv dependency). It
 * resolves relative to this file, not the cwd, so it works from any folder.
 * Variables already set in the shell win over .env - Node never overwrites them.
 */
const envPath = fileURLToPath(new URL("../.env", import.meta.url)); // src/ or dist/ -> BE/.env
if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
}

/** Empty strings count as unset, so `OPENAI_API_KEY=` in .env means "no key". */
function read(name: string): string | undefined {
    const value = process.env[name]?.trim();
    return value ? value : undefined;
}

export const config = {
    /** Which provider to build: "openai" or "gemini". */
    llmProvider: read("LLM_PROVIDER")?.toLowerCase() ?? "openai",
    openaiApiKey: read("OPENAI_API_KEY"),
    openaiModel: read("OPENAI_MODEL") ?? "gpt-4o-mini",
    geminiApiKey: read("GEMINI_API_KEY"),
    geminiModel: read("GEMINI_MODEL") ?? "gemini-3.8-flash",
    enableTelemetry: read("AGENT_ENABLE_TELEMETRY")?.toLowerCase() === "true",
};
