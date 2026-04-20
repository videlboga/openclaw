import type { StreamFn } from "@mariozechner/pi-agent-core";
import { streamSimple } from "@mariozechner/pi-ai";
import type { ProviderWrapStreamFnContext } from "openclaw/plugin-sdk/plugin-entry";
import {
  applyAnthropicEphemeralCacheControlMarkers,
  buildCopilotDynamicHeaders,
  hasCopilotVisionInput,
  streamWithPayloadPatch,
} from "openclaw/plugin-sdk/provider-stream-shared";

type _StreamContext = Parameters<StreamFn>[1];

export function wrapCopilotAnthropicStream(baseStreamFn: StreamFn | undefined): StreamFn {
  const underlying = baseStreamFn ?? streamSimple;
  return (model, context, options) => {
    // Only special-case GitHub Copilot models.
    if (model.provider !== "github-copilot") {
      return underlying(model, context, options);
    }

    // For Anthropic transport we already need the dynamic headers and ephemeral
    // cache-control markers.
    if (model.api === "anthropic-messages") {
      return streamWithPayloadPatch(
        underlying,
        model,
        context,
        {
          ...options,
          headers: {
            ...buildCopilotDynamicHeaders({
              messages: context.messages,
              hasImages: hasCopilotVisionInput(context.messages),
            }),
            ...options?.headers,
          },
        },
        applyAnthropicEphemeralCacheControlMarkers,
      );
    }

    // OpenAI-compatible Copilot endpoints also require the IDE identity headers
    // for IDE-authenticated calls.
    if (model.api === "openai-responses") {
      return underlying(model, context, {
        ...options,
        headers: {
          ...buildCopilotDynamicHeaders({
            messages: context.messages,
            hasImages: hasCopilotVisionInput(context.messages),
          }),
          ...options?.headers,
        },
      });
    }

    return underlying(model, context, options);
  };
}

export function wrapCopilotProviderStream(ctx: ProviderWrapStreamFnContext): StreamFn {
  // Ensure IDE identity headers are merged as a top-level fallback for
  // any provider runtime that uses this wrapper. Some embedded runtimes
  // may call the provider stream with different transport hooks; merging
  // Editor-Version here increases the chance the header reaches the
  // outbound request path.
  const underlying = wrapCopilotAnthropicStream(ctx.streamFn);
  return (model, context, options) => {
    if (model.provider !== "github-copilot") {
      return underlying(model, context, options);
    }
    const headers = {
      ...buildCopilotDynamicHeaders({
        messages: context.messages,
        hasImages: hasCopilotVisionInput(context.messages),
      }),
      ...options?.headers,
    };
    return underlying(model, context, { ...options, headers });
  };
}
