sed -i 's/const res = await fetchGuarded(url, {/console.log("PAYLOAD_TO_COPILOT:", JSON.stringify(fetchOptions.body)); const res = await fetchGuarded(url, {/' src/agents/provider-transport-fetch.ts
