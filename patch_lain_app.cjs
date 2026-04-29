const fs = require("fs");
let p = "ui/src/lain/main.ts";
let doc = fs.readFileSync(p, "utf-8");

doc = doc.replace(
  `<openclaw-app id="lain-chat-embed" focus-mode="true" style="width: 100%; height: 100%; display: block;"></openclaw-app>`,
  `
          <div style="flex: 1; display: flex; width: 100%; height: 100%; overflow: hidden;" \${ref((el) => {
            if (el && !el.hasChildNodes()) {
              const appEl = document.createElement("openclaw-app");
              appEl.id = "lain-chat-embed";
              appEl.setAttribute("focus-mode", "true");
              appEl.style.width = "100%";
              appEl.style.height = "100%";
              appEl.style.display = "block";
              el.appendChild(appEl);
            }
          })}></div>`
);

doc = doc.replace(
  `#lain-chat-embed .chat-thread {
              background: transparent !important;
              border: none !important;
              box-shadow: none !important;
            }`,
  `#lain-chat-embed .chat-thread {
              background: transparent !important;
              border: none !important;
              box-shadow: none !important;
              min-height: 0 !important;
              height: 100% !important;
              position: relative !important;
            }
            #lain-chat-embed .shell--chat {
              min-height: 0 !important;
              height: 100% !important;
              display: flex !important;
              flex-direction: column !important;
              overflow: hidden !important;
            }`
);

fs.writeFileSync(p, doc);
