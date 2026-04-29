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
    const models = result?.models ?? [];
    const filtered = models.filter((m) => m.provider !== "github-copilot" && m.provider !== "copilot-proxy");
    try {
      // eslint-disable-next-line no-console
      console.info("openclaw:models.filtered.count", filtered.length);
    } catch {}
    return filtered;
  } catch {
    return [];
  }
}
