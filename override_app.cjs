const fs = require('fs');
let content = fs.readFileSync('ui/src/lain/main.ts', 'utf-8');

content = content.replace('import { OpenClawApp } from "../ui/app.ts";', '');
content = content.replace('import { html } from "lit";', '');
content = content.replace('const originalRender = OpenClawApp.prototype.render;', '');
content = content.replace(/OpenClawApp\.prototype\.render = function\(\) \{[\s\S]*?\};\n/, '');

const newOverride = `
import { OpenClawApp } from "../ui/app.ts";
const originalRender = OpenClawApp.prototype.render;
OpenClawApp.prototype.render = function() {
  const result = originalRender.call(this);
  return html\`\${result}<style>
    .sidebar { display: none !important; }
    .topbar { display: none !important; }
    .shell {
      grid-template-columns: 1fr !important;
      grid-template-rows: 1fr !important;
      grid-template-areas: "main" !important;
      padding: 0 !important;
      background: transparent !important;
      min-height: 100% !important;
      border: none !important;
    }
    .main { padding: 0 !important; }
    .chat { background: transparent !important; }
    .chat-view { background: transparent !important; border: none !important; }
  </style>\`;
};
`;

content = content.replace('import { html, render, nothing } from "lit-html";', `import { html, render, nothing } from "lit-html";\n${newOverride}`);

fs.writeFileSync('ui/src/lain/main.ts', content);
