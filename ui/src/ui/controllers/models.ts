import type { GatewayBrowserClient } from "../gateway.ts";
import type { ModelCatalogEntry } from "../types.ts";

/**
 * Fetch the model catalog from the gateway.
 *
 * Accepts a {@link GatewayBrowserClient} (matching the existing ui/ controller
 * convention).  Returns an array of {@link ModelCatalogEntry}; on failure the
 * caller receives an empty array rather than throwing.
 */
export async function loadModels(client: GatewayBrowserClient): Promise<ModelCatalogEntry[]> {
  try {
    const result = await client.request<{ models: ModelCatalogEntry[] }>("models.list", {});
    // Debug: log the raw model catalog returned by the gateway so we can
    // diagnose why the UI only shows a single model in the picker.
    try {
      // eslint-disable-next-line no-console
      console.info("openclaw:models.raw", result?.models ?? []);
    } catch {}

  // Best-effort: hide Copilot providers from the UI model list so users
  // don't see GitHub Copilot / copilot-proxy choices in the picker.
  // However, be permissive for OpenRouter/DeepSeek/Qwen models (they may
  // sometimes appear with unexpected provider labels) by allowing entries
  // whose provider or id indicates these providers.
  const models = result?.models ?? [];
    try {
      const ids = models.map((m) => m.id).slice(0, 50);
      const providerCounts: Record<string, number> = {};
      for (const m of models) {
        const p = (m.provider ?? "").toLowerCase();
        providerCounts[p] = (providerCounts[p] || 0) + 1;
      }
      // eslint-disable-next-line no-console
      console.info("openclaw:models.ids", ids);
      // eslint-disable-next-line no-console
      console.info("openclaw:models.providerCounts", providerCounts);
    } catch {}
    const allowedProviderSet = new Set(["openrouter", "deepseek", "qwen"]);
    // Known model id prefixes we consider "normal" models even when their
    // provider was labeled/copied under a proxy like `copilot-proxy`.
    const allowedIdPrefixes = [
      "gpt-",
      "claude-",
      "gemini-",
      "grok-",
      "openrouter/",
      "deepseek-",
      "qwen",
      "glm-",
      "kimi-",
    ];

    const excludedDebug: { id: string; provider: string; reason: string }[] = [];

    const filtered = models.filter((m) => {
      const provider = (m.provider ?? "").toLowerCase();
      const id = (m.id ?? "").toLowerCase();
      // Always hide explicit GitHub Copilot provider
      if (provider === "github-copilot") {
        excludedDebug.push({ id: m.id ?? "", provider: m.provider ?? "", reason: "github-copilot" });
        return false;
      }
      // Explicitly exclude the Copilot proxy provider entirely. The proxy
      // module is not wanted in our deployment and we should not surface its
      // mirrored model list in the UI even when it contains mainstream ids.
      if (provider === "copilot-proxy") {
        excludedDebug.push({ id: m.id ?? "", provider: m.provider ?? "", reason: "copilot-proxy disabled" });
        return false;
      }
      // Allow if provider is explicitly one of our desired providers
      if (allowedProviderSet.has(provider)) {
        return true;
      }
      // Allow if id is namespaced with one of the desired prefixes
      for (const p of allowedIdPrefixes) {
        if (id.startsWith(p)) {
          return true;
        }
      }
      // Fallback: accept entries that don't look like a Copilot/github provider
      if (provider.includes("copilot") || provider.includes("github")) {
        excludedDebug.push({ id: m.id ?? "", provider: m.provider ?? "", reason: "provider looks like copilot/github" });
        return false;
      }
      return true;
    });
    try {
      // eslint-disable-next-line no-console
      if (excludedDebug.length > 0) console.info("openclaw:models.excluded", excludedDebug);
    } catch {}
    try {
      // eslint-disable-next-line no-console
      console.info("openclaw:models.filtered.count", filtered.length);
    } catch {}
    return filtered;
  } catch {
    return [];
  }
}
