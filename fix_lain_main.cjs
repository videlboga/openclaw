const fs = require("fs");
const path = "ui/src/lain/main.ts";
let content = fs.readFileSync(path, { encoding: "utf-8" });

// 1. Ensure imports
let madeChanges = false;
if (!content.includes('import "../ui/app.ts";')) {
  content = content.replace('import "./styles.css";', 'import "./styles.css";\nimport "../ui/app.ts";');
  madeChanges = true;
}

if (!content.includes('__OPENCLAW_CONTROL_UI_BASE_PATH__')) {
  content = 'window.__OPENCLAW_CONTROL_UI_BASE_PATH__ = window.location.pathname;\n' + content;
  madeChanges = true;
}

// 2. Ensure CSS override rules for OpenclawApp
// Let's rewrite the lain-stream section perfectly
const lainStreamRegex = /<section class="lain-stream"[\s\S]*?<\/section>/m;
const idealSection = `<section class="lain-stream" style="padding:0; position:relative; background: transparent; flex: 1; display:flex; flex-direction: column;">
          <style>
            #lain-chat-embed {
              --sidebar-width: 0px !important;
              --header-height: 0px !important;
              background: transparent !important;
              flex: 1;
              display: flex;
              flex-direction: column;
              height: 100%;
            }
            #lain-chat-embed::part(shell-header),
            #lain-chat-embed .shell-header,
            #lain-chat-embed .nav-desktop,
            #lain-chat-embed .nav-sidebar,
            #lain-chat-embed .nav-drawer,
            #lain-chat-embed .nav-backdrop,
            #lain-chat-embed .page-title,
            #lain-chat-embed .page-sub,
            #lain-chat-embed .page-header,
            #lain-chat-embed .page-meta,
            #lain-chat-embed .chat-new-messages,
            #lain-chat-embed .chat-focus-exit,
            #lain-chat-embed .agent-chat__toolbar-right .btn--ghost {
              display: none !important;
            }
            #lain-chat-embed .shell,
            #lain-chat-embed .page-content,
            #lain-chat-embed .chat-split-container,
            #lain-chat-embed .chat-main,
            #lain-chat-embed .chat,
            #lain-chat-embed .chat-thread {
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
            }
            #lain-chat-embed .page-content {
              padding: 0 !important;
              display: flex !important;
              flex-direction: column !important;
              flex: 1 !important;
            }
            #lain-chat-embed .agent-chat__input {
              background: rgba(0, 0, 0, 0.4) !important;
              border-radius: 12px;
              border: 1px solid rgba(255, 255, 255, 0.1);
              margin: 10px;
            }
          </style>
          
          <div style="flex: 1; display: flex; flex-direction: column; width: 100%; height: 100%; overflow: hidden;" \${ref((el) => {
            if (el && !document.getElementById("lain-chat-embed")) {
              const appEl = document.createElement("openclaw-app");
              appEl.id = "lain-chat-embed";
              appEl.setAttribute("focus-mode", "true");
              appEl.style.width = "100%";
              appEl.style.height = "100%";
              appEl.style.display = "flex";
              appEl.style.flexDirection = "column";
              el.appendChild(appEl);
            }
          })}></div>
        </section>`;

if (!content.includes('display: flex !important;\n              flex-direction: column !important;\n              flex: 1 !important;')) {
    content = content.replace(lainStreamRegex, idealSection);
    madeChanges = true;
}

if (madeChanges || !content.includes('import "../ui/app.ts";')) {
    // Just force it
    content = content.replace('import "./styles.css";', 'import "./styles.css";\nimport "../ui/app.ts";');
    content = content.replace(lainStreamRegex, idealSection);
    fs.writeFileSync(path, content, "utf-8");
    console.log("Updated main.ts with strict override");
} else {
    console.log("No changes needed");
}
