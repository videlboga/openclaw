import { resolveCopilotApiToken, DEFAULT_COPILOT_API_BASE_URL } from './dist/extensions/github-copilot/token.js';
import { t as buildCopilotDynamicHeaders } from './dist/copilot-dynamic-headers-BxSbrueq.js';
import fetch from 'node-fetch';

async function run() {
    try {
        console.log("Resolving token...");
        const result = await resolveCopilotApiToken({ requireLoginToken: false });
        if (!result.ok) {
            console.error("Token resolution failed", result.error);
            return;
        }

        console.log("Token resolved successfully!");
        const token = result.value.token;

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
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
                                location: { type: "string" }
                            }
                        }
                    }
                }
            ]
        };

        const res = await globalThis.fetch(`${DEFAULT_COPILOT_API_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(bodyProto)
        });

        console.log("Response status:", res.status);
        const text = await res.text();
        console.log("Response body:", text.substring(0, 300));
    } catch(e) {
        console.error("Crash:", e);
    }
}
run();
