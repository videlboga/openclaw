---
summary: "Use OpenRouter's unified API to access many models in OpenClaw"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
title: "OpenRouter"
---

# OpenRouter

OpenRouter provides a **unified API** that routes requests to many models behind a single
endpoint and API key. It is OpenAI-compatible, so most OpenAI SDKs work by switching the base URL.

## CLI setup

```bash
openclaw onboard --auth-choice openrouter-api-key
```

## Config snippet

Note: do NOT commit real API keys to the repository. Use environment variables
or your deployment secret store. Example only:

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      // example default set to DeepSeek v4 Pro
      model: { primary: "deepseek/deepseek-v4-pro" },
    },
  },
}
```

## Local quick set

To set your OpenRouter API key locally without committing it to the repo, run one of the following on your machine (replace the example key with your real key):

```bash
# export for current shell/session
export OPENROUTER_API_KEY="sk-or-REPLACE_WITH_YOUR_KEY"

# or save to your local OpenClaw env (~/.openclaw/.env)
mkdir -p "$HOME/.openclaw" && printf '%s\n' "OPENROUTER_API_KEY=sk-or-REPLACE_WITH_YOUR_KEY" > "$HOME/.openclaw/.env"
```

OpenClaw will prefer a process env variable first, then `./.env`, and finally `~/.openclaw/.env`.

## Notes

- Model refs are `openrouter/<provider>/<model>`.
- Onboarding defaults to `openrouter/auto`. Switch to a concrete model later with
  `openclaw models set openrouter/<provider>/<model>`.
- For more model/provider options, see [/concepts/model-providers](/concepts/model-providers).
- OpenRouter uses a Bearer token with your API key under the hood.
- On real OpenRouter requests (`https://openrouter.ai/api/v1`), OpenClaw also
  adds OpenRouter's documented app-attribution headers:
  `HTTP-Referer: https://openclaw.ai`, `X-OpenRouter-Title: OpenClaw`, and
  `X-OpenRouter-Categories: cli-agent`.
- On verified OpenRouter routes, Anthropic model refs also keep the
  OpenRouter-specific Anthropic `cache_control` markers that OpenClaw uses for
  better prompt-cache reuse on system/developer prompt blocks.
- If you repoint the OpenRouter provider at some other proxy/base URL, OpenClaw
  does not inject those OpenRouter-specific headers or Anthropic cache markers.
- OpenRouter still runs through the proxy-style OpenAI-compatible path, so
  native OpenAI-only request shaping such as `serviceTier`, Responses `store`,
  OpenAI reasoning-compat payloads, and prompt-cache hints is not forwarded.
- Gemini-backed OpenRouter refs stay on the proxy-Gemini path: OpenClaw keeps
  Gemini thought-signature sanitation there, but does not enable native Gemini
  replay validation or bootstrap rewrites.
- On supported non-`auto` routes, OpenClaw maps the selected thinking level to
  OpenRouter proxy reasoning payloads. Unsupported model hints and
  `openrouter/auto` skip that reasoning injection.
- If you pass OpenRouter provider routing under model params, OpenClaw forwards
  it as OpenRouter routing metadata before the shared stream wrappers run.
