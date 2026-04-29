import { describe, it, expect } from "vitest";
import { DEFAULT_PROVIDER, DEFAULT_MODEL, DEFAULT_CONTEXT_TOKENS } from "./defaults.js";

describe("agents/defaults", () => {
  it("exports the expected default provider and model", () => {
    expect(DEFAULT_PROVIDER).toBe("openrouter");
    expect(DEFAULT_MODEL).toBe("deepseek/deepseek-v4-pro");
  });

  it("provides a sane default token budget", () => {
    expect(typeof DEFAULT_CONTEXT_TOKENS).toBe("number");
    expect(DEFAULT_CONTEXT_TOKENS).toBeGreaterThan(0);
  });
});
