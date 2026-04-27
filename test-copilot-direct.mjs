import fetch from "node-fetch";
import { t as buildCopilotDynamicHeaders } from "./dist/copilot-dynamic-headers-BjO6UZWj.js";
import {
  resolveCopilotApiToken,
  DEFAULT_COPILOT_API_BASE_URL,
} from "./dist/extensions/github-copilot/token.js";

async function run() {
  try {
    console.log("Reading GitHub token from OpenClaw auth-profiles and exchanging for a fresh Copilot session token...");
    const os = await import("os");
    const fs = await import("fs/promises");
    const path = await import("path");
    const home = os.homedir();
    const authPath = path.join(home, ".openclaw", "agents", "main", "agent", "auth-profiles.json");
    let githubToken = null;
    try {
      const rawAuth = await fs.readFile(authPath, "utf8");
      const auth = JSON.parse(rawAuth);
      githubToken = auth?.profiles?.["github-copilot:github"]?.token;
    } catch (e) {
      // ignore - we'll fall back to cached copilot token if present
    }

    // If we don't have a GitHub token, try the cached Copilot token as a last resort.
    let token = null;
    const cachePath = path.join(home, ".openclaw", "credentials", "github-copilot.token.json");
    try {
      const raw = await fs.readFile(cachePath, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.token) {token = parsed.token;}
    } catch (e) {
      // ignore - we'll attempt exchange if we have githubToken
    }

    if (githubToken) {
      // Exchange GitHub token for a fresh Copilot token
      const tokenRes = await fetch("https://api.github.com/copilot_internal/v2/token", {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${githubToken}`,
        },
      });
      if (!tokenRes.ok) {
        console.error("Failed to exchange GitHub token for Copilot token:", tokenRes.status, await tokenRes.text());
        if (!token) {return;}
      } else {
        const json = await tokenRes.json();
        token = json.token;
      }
    }

    if (!token) {
      console.error('No Copilot token available (neither cached nor exchangeable)');
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // Inject dynamic headers
    const ideHeaders = buildCopilotDynamicHeaders({ messages: [], hasImages: false });
    Object.assign(headers, ideHeaders);

    console.log("Sending request to Copilot with headers:", Object.keys(headers));

    const bodyProto = {
      model: "gpt-4o",
      messages: [{ role: "user", content: "hi" }],
      stream: false,
      tools: [
        {
          type: "function",
          function: {
            name: "get_weather",
            description: "Provides the current weather.",
            parameters: {
              type: "object",
              properties: {
                location: { type: "string" },
              },
            },
          },
        },
      ],
    };

    const res = await globalThis.fetch(`${DEFAULT_COPILOT_API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyProto),
    });

    console.log("Response status:", res.status);
    const text = await res.text();
    console.log("Response body:", text.substring(0, 300));
  } catch (e) {
    console.error("Crash:", e);
  }
}
run();
