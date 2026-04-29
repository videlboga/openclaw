const fs = require("fs");
let p = "ui/src/lain/main.ts";
let doc = fs.readFileSync(p, "utf-8");

if (!doc.includes("__OPENCLAW_CONTROL_UI_BASE_PATH__")) {
  doc = `window.__OPENCLAW_CONTROL_UI_BASE_PATH__ = window.location.pathname;\n` + doc;
  fs.writeFileSync(p, doc);
}
