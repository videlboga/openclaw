const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const TARGET_HOST = process.env.OPENCLAW_PROXY_TARGET_HOST || "127.0.0.1";
// HTTP Browser Control (serves the UI)
// Allow overriding in dev: OPENCLAW_PROXY_HTTP_PORT (or OPENCLAW_PROXY_TARGET_PORT)
const TARGET_HTTP_PORT = Number(
  process.env.OPENCLAW_PROXY_HTTP_PORT || process.env.OPENCLAW_PROXY_TARGET_PORT || 18789,
);
// Gateway WebSocket port (control plane)
// Force 18789 for WS unless strictly overridden, avoiding HTTP_PORT bleeding
const TARGET_WS_PORT = Number(
  process.env.OPENCLAW_PROXY_TARGET_WS_PORT || 18789,
);

// Optional override via env for testing: OPENCLAW_PROXY_TOKEN
const ENV_TOKEN = process.env.OPENCLAW_PROXY_TOKEN;

function readTokenFromConfig() {
  if (ENV_TOKEN) {
    return ENV_TOKEN;
  }
  try {
    const cfgPath = path.join(os.homedir(), ".openclaw", "openclaw.json");
    if (!fs.existsSync(cfgPath)) {
      return null;
    }
    const raw = fs.readFileSync(cfgPath, "utf8");
    const cfg = JSON.parse(raw);
    // Common locations where the gateway token may be stored
    return (
      cfg?.gateway?.token ||
      cfg?.gateway?.auth?.token ||
      cfg?.gatewayToken ||
      cfg?.auth?.gateway?.token ||
      cfg?.auth?.token ||
      null
    );
  } catch (err) {
    console.error("openclaw-proxy: failed to read token from config:", err && err.message);
    return null;
  }
}

const server = http.createServer((req, res) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": req.headers.origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
    "Access-Control-Allow-Credentials": "true",
  };

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/api/pipeline/run") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const config = JSON.parse(body);
        const tmpFile = path.join(os.tmpdir(), `pipeline-${Date.now()}.json`);
        fs.writeFileSync(tmpFile, JSON.stringify(config));

        res.writeHead(200, {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        });

        const { spawn } = require("child_process");
        const cp = spawn("npx", ["tsx", "src/agents/pipeline-orchestrator.ts", tmpFile]);

        cp.stdout.on("data", (data) => {
          res.write(`data: ${JSON.stringify({ chunk: data.toString() })}\n\n`);
        });

        cp.stderr.on("data", (data) => {
          res.write(`data: ${JSON.stringify({ error: data.toString() })}\n\n`);
        });

        cp.on("close", (code) => {
          res.write(`data: ${JSON.stringify({ done: true, code })}\n\n`);
          res.end();
          try { fs.unlinkSync(tmpFile); } catch (e) {}
        });
      } catch (err) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  const token = readTokenFromConfig();
  // Masked token for logs
  const maskedToken = token ? `${token.slice(0, 8)}...${token.slice(-8)}` : null;
  console.log(`[openclaw-proxy] ${req.method} ${req.url} - token=${maskedToken}`);
  const headers = { ...req.headers };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    console.warn(
      "openclaw-proxy: no gateway token found; forwarding request without Authorization header",
    );
  }

  // If this is a browser navigation for HTML, send a redirect that includes
  // the token in the URL fragment so client-side JS can read it.
  const accept = (req.headers.accept || "").toString();
  const cookieHeader = (req.headers.cookie || "").toString();
  const redirectedCookie = cookieHeader.includes("__openclaw_proxy_redirected=1");
  if (
    token &&
    (req.method === "GET" || req.method === "HEAD") &&
    accept.includes("text/html") &&
    !redirectedCookie
  ) {
    // Fetch the HTML from the target, inject a small script that sets the
    // URL fragment with the token (so client JS can read it), and return the
    // modified HTML. This avoids redirect loops and works for browsers.
    const fetchOptions = {
      hostname: TARGET_HOST,
      port: TARGET_HTTP_PORT,
      path: req.url,
      method: "GET",
      headers,
    };
    const fetchReq = http.request(fetchOptions, (fetchRes) => {
      const chunks = [];
      fetchRes.on("data", (c) => chunks.push(c));
      fetchRes.on("end", () => {
        try {
          const contentType = (fetchRes.headers["content-type"] || "").toString();
          const status = fetchRes.statusCode || 200;
          if (status === 200 && contentType.includes("text/html")) {
            let body = Buffer.concat(chunks).toString("utf8");
            const safeToken = encodeURIComponent(token);
            const inject = `<script>try{if(!location.hash.includes('token=')){const newUrl = new URL(location.href); newUrl.hash = '#token=${safeToken}'; history.replaceState(null,'',newUrl.href);}}catch(e){}</script>`;
            if (body.includes("</head>")) {
              body = body.replace("</head>", inject + "</head>");
            } else {
              body = inject + body;
            }
            const outHeaders = { ...fetchRes.headers, ...corsHeaders };
            delete outHeaders["content-security-policy"]; // Remove CSP to allow injected script
            outHeaders["set-cookie"] = "__openclaw_proxy_redirected=1; Path=/; Max-Age=60";
            outHeaders["content-length"] = Buffer.byteLength(body, "utf8");
            res.writeHead(status, outHeaders);
            res.end(body);
            console.log("[openclaw-proxy] injected token script into HTML response");
            return;
          }
          // Fallback: pipe through unchanged
          const outHeaders = { ...fetchRes.headers, ...corsHeaders };
          res.writeHead(fetchRes.statusCode || 502, outHeaders);
          fetchRes.pipe(res, { end: true });
        } catch (err) {
          console.error("[openclaw-proxy] error processing HTML fetch:", err && err.message);
          res.writeHead(502, corsHeaders);
          res.end();
        }
      });
    });
    fetchReq.on("error", (err) => {
      console.error("[openclaw-proxy] error fetching HTML from target:", err && err.message);
      res.writeHead(502, corsHeaders);
      res.end();
    });
    fetchReq.end();
    return;
  }

  // Forward regular HTTP requests to the Browser Control HTTP port
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_HTTP_PORT,
    path: req.url,
    method: req.method,
    headers,
  };
  const proxyReq = http.request(options, (proxyRes) => {
    console.log(
      `[openclaw-proxy] proxied HTTP ${req.method} ${req.url} -> ${TARGET_HOST}:${TARGET_HTTP_PORT} (${proxyRes.statusCode})`,
    );
    const outHeaders = { ...proxyRes.headers, ...corsHeaders };
    res.writeHead(proxyRes.statusCode, outHeaders);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on("error", (err) => {
    console.error("[openclaw-proxy] HTTP proxy error:", err && err.message);
    res.writeHead(502, corsHeaders);
    res.end();
  });
  req.pipe(proxyReq, { end: true });
});

// Handle WebSocket upgrade requests and proxy them to the gateway WS port.
server.on("upgrade", (req, socket, head) => {
  const token = readTokenFromConfig();
  const maskedToken = token ? `${token.slice(0, 8)}...${token.slice(-8)}` : null;
  console.log(`[openclaw-proxy] upgrade request ${req.url} - token=${maskedToken}`);
  const headers = { ...req.headers };
  if (token) {
    headers["authorization"] = `Bearer ${token}`;
  }
  // Spoof Origin so the gateway accepts the WebSocket connection from a custom UI
  if (headers["origin"]) {
    headers["origin"] = `http://${TARGET_HOST}:${TARGET_WS_PORT}`;
  }

  const isVite = req.headers["sec-websocket-protocol"] === "vite-hmr";
  
  if (isVite) {
    if (headers["origin"]) {
      headers["origin"] = `http://${TARGET_HOST}:${TARGET_HTTP_PORT}`;
    }
  }
  const options = {
    hostname: TARGET_HOST,
    port: isVite ? TARGET_HTTP_PORT : TARGET_WS_PORT,
    path: req.url,
    method: "GET",
    headers,
  };

  // Re-write custom /ws requests to the root / path if the gateway expects it
  if (options.path === "/ws") {
    options.path = "/";
  }

  const proxyReq = http.request(options);
  proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
    console.log(
      `[openclaw-proxy] proxied upgrade -> ${TARGET_HOST}:${TARGET_WS_PORT} (${proxyRes.statusCode})`,
    );
    try {
      // Write the 101 response back to the client
      socket.write(
        `HTTP/1.1 ${proxyRes.statusCode} ${proxyRes.statusMessage}\r\n` +
          Object.entries(proxyRes.headers)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\r\n") +
          "\r\n\r\n",
      );
      if (proxyHead && proxyHead.length) {
        proxySocket.unshift(proxyHead);
      }
      socket.pipe(proxySocket).pipe(socket);
    } catch (err) {
      console.error("[openclaw-proxy] upgrade proxy error:", err && err.message);
      try {
        socket.end();
      } catch {}
      try {
        proxySocket.end();
      } catch {}
    }
  });
  proxyReq.on("error", (err) => {
    console.error("[openclaw-proxy] upgrade request error:", err && err.message);
    try {
      socket.end();
    } catch {}
  });
  proxyReq.end();
});

server.listen(19004, "127.0.0.1", () => {
  console.log(
    `OpenClaw proxy listening on http://127.0.0.1:19004/ -> http://${TARGET_HOST}:${TARGET_HTTP_PORT}, ws://${TARGET_HOST}:${TARGET_WS_PORT}/`,
  );
  if (process.env.OPENCLAW_PROXY_HTTP_PORT || process.env.OPENCLAW_PROXY_WS_PORT) {
    console.log("openclaw-proxy: running with env overrides:", {
      OPENCLAW_PROXY_TARGET_HOST: process.env.OPENCLAW_PROXY_TARGET_HOST,
      OPENCLAW_PROXY_HTTP_PORT: process.env.OPENCLAW_PROXY_HTTP_PORT,
      OPENCLAW_PROXY_WS_PORT: process.env.OPENCLAW_PROXY_WS_PORT,
    });
  }
});
