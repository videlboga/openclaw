const fs = require("fs");
const file = "ui/src/lain/main.ts";
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  'font-weight: bold;">',
  'font-weight: bold;" @click=${() => submitComposer("Отлично, развертывай: " + pipelineData.pipelineId)}>'
);

fs.writeFileSync(file, content);
