Local proxy for Control UI

This document explains the local proxy used to provide the Control UI (Lain) a
reliable gateway token and to forward WebSocket upgrades with Authorization.

Why a local proxy
- Browsers load the UI from a dev server (vite) and the gateway runs separately.
- To avoid exposing the gateway token in the URL or requiring the user to paste it
  into the UI, a local proxy can inject the token into the page or serve it on
  a loopback-only endpoint.

What we implemented
- `openclaw-proxy.cjs` injects a small script into proxied HTML pages which:
  - writes the gateway token into `sessionStorage` under keys `openclaw.control.token.v1:<scope>`
  - sets `window.__openclaw.gatewayToken` for quick access
  - attempts a fetch to `/__openclaw/token` as a robust fallback
- The proxy also exposes an HTTP endpoint `GET /__openclaw/token` returning
  `{ token: "<gateway-token>" }` on loopback. This endpoint is only available
  from the local machine (the proxy binds to 127.0.0.1) and is considered a
  local-only convenience for development.
- The UI (`ui/src/lain/main.ts`) was updated to:
  - prefer the OpenRouter/DeepSeek model when present in the gateway catalog
  - try to detect the proxy and, if a token is found, prefer connecting to the
    proxy origin so the proxy can add Authorization headers during WS upgrade
  - wait up to a short timeout (~600ms) for `/__openclaw/token` before
    establishing the WebSocket connection, preventing a race between UI startup
    and proxy token availability.

Security notes
- The proxy serves sensitive secrets (gateway token and provider API keys). Keep
  it bound to loopback (127.0.0.1) and avoid exposing it to untrusted networks.
- File secrets (e.g. `~/.openclaw/.env`) MUST be mode 600 so only the user can
  read them.
- The token endpoint is a convenience for development only. Do not enable it on
  public interfaces or in production.

How to use
1. Start the gateway and UI as usual.
2. Start the proxy (systemd user service is provided):
   systemctl --user enable --now openclaw-proxy.service
3. Open the UI through the proxy:
   http://127.0.0.1:19004/lain.html
4. If the UI doesn't connect, open DevTools and check:
   - window.__openclaw.gatewayToken and sessionStorage keys
   - Network → WS upgrade request headers (Authorization should be present)

Rollbacks
- If you prefer the legacy fragment approach or want to disable the token
  endpoint, revert the changes in `openclaw-proxy.cjs` and `ui/src/lain/main.ts`.

Contact
- If you need help landing these changes to a branch or making them configurable
  behind a feature flag, ping the maintainer team.
