import {
  definePluginEntry,
  type ProviderResolveDynamicModelContext,
  type ProviderRuntimeModel,
} from "openclaw/plugin-sdk/plugin-entry";
import { createProviderApiKeyAuthMethod } from "openclaw/plugin-sdk/provider-auth-api-key";
import {
  buildProviderReplayFamilyHooks,
  DEFAULT_CONTEXT_TOKENS,
} from "openclaw/plugin-sdk/provider-model-shared";
import {
  buildProviderStreamFamilyHooks,
  getOpenRouterModelCapabilities,
  loadOpenRouterModelCapabilities,
} from "openclaw/plugin-sdk/provider-stream-family";
import { openrouterMediaUnderstandingProvider } from "./media-understanding-provider.js";
import { applyOpenrouterConfig, OPENROUTER_DEFAULT_MODEL_REF } from "./onboard.js";
import { buildOpenrouterProvider } from "./provider-catalog.js";
import { wrapOpenRouterProviderStream } from "./stream.js";

const PROVIDER_ID = "openrouter";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_DEFAULT_MAX_TOKENS = 8192;
const OPENROUTER_CACHE_TTL_MODEL_PREFIXES = [
  "anthropic/",
  "moonshot/",
  "moonshotai/",
  "zai/",
] as const;

export default definePluginEntry({
  id: "openrouter",
  name: "OpenRouter Provider",
  description: "Bundled OpenRouter provider plugin",
  register(api) {
    const PASSTHROUGH_GEMINI_REPLAY_HOOKS = buildProviderReplayFamilyHooks({
      family: "passthrough-gemini",
    });
    const _OPENROUTER_THINKING_STREAM_HOOKS = buildProviderStreamFamilyHooks("openrouter-thinking");
    function buildDynamicOpenRouterModel(
      ctx: ProviderResolveDynamicModelContext,
    ): ProviderRuntimeModel {
      const capabilities = getOpenRouterModelCapabilities(ctx.modelId);
      return {
        id: ctx.modelId,
        name: capabilities?.name ?? ctx.modelId,
        api: "openai-completions",
        provider: PROVIDER_ID,
        baseUrl: OPENROUTER_BASE_URL,
        reasoning: capabilities?.reasoning ?? false,
        input: capabilities?.input ?? ["text"],
        cost: capabilities?.cost ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: capabilities?.contextWindow ?? DEFAULT_CONTEXT_TOKENS,
        maxTokens: capabilities?.maxTokens ?? OPENROUTER_DEFAULT_MAX_TOKENS,
      };
    }

    function isOpenRouterCacheTtlModel(modelId: string): boolean {
      return OPENROUTER_CACHE_TTL_MODEL_PREFIXES.some((prefix) => modelId.startsWith(prefix));
    }

    api.registerProvider({
      id: PROVIDER_ID,
      label: "OpenRouter",
      docsPath: "/providers/models",
      envVars: ["OPENROUTER_API_KEY"],
      auth: [
        createProviderApiKeyAuthMethod({
          providerId: PROVIDER_ID,
          methodId: "api-key",
          label: "OpenRouter API key",
          hint: "API key",
          optionKey: "openrouterApiKey",
          flagName: "--openrouter-api-key",
          envVar: "OPENROUTER_API_KEY",
          promptMessage: "Enter OpenRouter API key",
          defaultModel: OPENROUTER_DEFAULT_MODEL_REF,
          expectedProviders: ["openrouter"],
          applyConfig: (cfg) => applyOpenrouterConfig(cfg),
          wizard: {
            choiceId: "openrouter-api-key",
            choiceLabel: "OpenRouter API key",
            groupId: "openrouter",
            groupLabel: "OpenRouter",
            groupHint: "API key",
          },
        }),
      ],
      catalog: {
        order: "simple",
        run: async (ctx) => {
          const apiKey = ctx.resolveProviderApiKey(PROVIDER_ID).apiKey;
          if (!apiKey) {
            return null;
          }
          return {
            provider: {
              ...buildOpenrouterProvider(),
              apiKey,
            },
          };
        },
      },
      // Synthesize OpenRouter-accessible aliases for DeepSeek and Qwen at
      // runtime to avoid static cross-package imports and TypeScript
      // rootDir diagnostics. This hook will be invoked by the provider
      // runtime when augmenting the global model catalog.
      augmentModelCatalog: async ({ config }) => {
        const result: Array<{ id: string; name: string; provider: string; contextWindow?: number; reasoning?: boolean; input?: string[] }> = [];
        try {
          // Use a runtime-evaluated import to avoid TypeScript static
          // module resolution (rootDir) checks for cross-package imports.
          const deepseekMod = await Function('return import("../deepseek/models.js")')();
          const qwenMod = await Function('return import("../qwen/models.js")')();

          const deepseekCatalog = deepseekMod?.DEEPSEEK_MODEL_CATALOG as
            | Array<{ id: string; name?: string; contextWindow?: number; reasoning?: boolean; input?: string[] }>
            | undefined;
          const qwenCatalog = qwenMod?.QWEN_MODEL_CATALOG as
            | Array<{ id: string; name?: string; contextWindow?: number; reasoning?: boolean; input?: string[] }>
            | undefined;

          if (Array.isArray(deepseekCatalog)) {
            for (const m of deepseekCatalog) {
              result.push({
                id: `openrouter/deepseek/${m.id}`,
                name: m.name ? `${m.name} (DeepSeek)` : `deepseek/${m.id}`,
                provider: "openrouter",
                contextWindow: m.contextWindow,
                reasoning: m.reasoning ?? false,
                input: m.input,
              });
            }
          }

          if (Array.isArray(qwenCatalog)) {
            for (const m of qwenCatalog) {
              result.push({
                id: `openrouter/qwen/${m.id}`,
                name: m.name ? `${m.name} (Qwen)` : `qwen/${m.id}`,
                provider: "openrouter",
                contextWindow: m.contextWindow,
                reasoning: m.reasoning ?? false,
                input: m.input,
              });
            }
          }
        } catch (err) {
          // Best-effort: if dynamic imports fail, return no supplemental entries.
        }
        return result as any;
      },
      resolveDynamicModel: (ctx) => buildDynamicOpenRouterModel(ctx),
      prepareDynamicModel: async (ctx) => {
        await loadOpenRouterModelCapabilities(ctx.modelId);
      },
      ...PASSTHROUGH_GEMINI_REPLAY_HOOKS,
      resolveReasoningOutputMode: () => "native",
      isModernModelRef: () => true,
      wrapStreamFn: wrapOpenRouterProviderStream,
      isCacheTtlEligible: (ctx) => isOpenRouterCacheTtlModel(ctx.modelId),
    });
    api.registerMediaUnderstandingProvider(openrouterMediaUnderstandingProvider);
  },
});
