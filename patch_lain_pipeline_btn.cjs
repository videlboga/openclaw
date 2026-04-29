const fs = require("fs");
const file = "ui/src/lain/main.ts";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  'Execute Pipeline\n          </button>',
  'Execute Pipeline\n          </button>"\n          @click=${() => {\n            submitComposer("Подтверждаю запуск пайплайна: " + pipelineData.pipelineId);\n          }}\n          >'
);

if (!content.includes('window.executeLainPipeline')) {
  // We can attach click handlers using lit-html correctly.
  // Wait, I already made it string-based HTML inside renderMessageContent?
  // No, renderText returns lit-html html\`...
  // So I can just add @click to the lit-html template!
}
