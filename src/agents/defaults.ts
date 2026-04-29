// Defaults for agent metadata when upstream does not supply them.
// Keep this aligned with the product-level latest-model baseline.
// Switch default provider to OpenRouter and default model to DeepSeek's v4 pro.
// When running locally or in production, set OPENROUTER_API_KEY in the environment
// (see .env.example). This repo includes OpenRouter integrations and tests.
export const DEFAULT_PROVIDER = "openrouter" as const;
export const DEFAULT_MODEL = "deepseek/deepseek-v4-pro" as const;
// Conservative fallback used when model metadata is unavailable.
export const DEFAULT_CONTEXT_TOKENS = 200_000;
