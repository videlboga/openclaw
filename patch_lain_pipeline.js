const fs = require('fs');
const path = 'ui/src/lain/main.ts';
let code = fs.readFileSync(path, 'utf8');

const targetStr = `    if (item.type === 'text') {
      // Ignore empty texts from pending assistant
      if (!item.text || item.text === " ") return html\`\${item.text}\`;
      return html\`<div style="white-space: pre-wrap;">\${item.text}</div>\`;
    }`;

const newStr = `    if (item.type === 'text') {
      // Ignore empty texts from pending assistant
      if (!item.text || item.text === " ") return html\`\${item.text}\`;
      const text = item.text;
      const pipelineMatch = text.match(/(.*?)(~~~|\\`\\`\\`)json\\s*\\n\\s*\\{\\s*"pipeline":([\\s\\S]*?)(~~~|\\`\\`\\`)(.*)/is);
      if (pipelineMatch) {
         const before = pipelineMatch[1] || "";
         const pipelineContent = pipelineMatch[3] || "{}";
         const after = pipelineMatch[5] || "";
         let pipelineData;
         try {
           pipelineData = JSON.parse(\`{"pipeline":\${pipelineContent}\`);
         } catch(e) { pipelineData = null; }
         
         const pipelineUI = pipelineData ? html\`<div style="margin: 12px 0; background: rgba(203,166,247,0.15); border: 1px solid rgba(203,166,247,0.4); border-radius: 8px; padding: 12px;">
            <div style="font-weight: bold; color: #cba6f7; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
               Pipeline Configuration Proposed
            </div>
            <pre style="font-size: 0.85em; opacity: 0.8; margin-bottom: 12px; white-space: pre-wrap; word-break: break-word;">\${JSON.stringify(pipelineData.pipeline, null, 2)}</pre>
            <button class="lain-btn-primary" @click=\${(e) => {
                e.preventDefault();
                window.setTimeout(() => {
                  submitComposer('Выполняй этот пайплайн, пожалуйста.');
                }, 10);
            }} style="width: 100%; text-align: center; padding: 8px; font-weight: bold; cursor: pointer; border: 1px solid #cba6f7; background: #cba6f730; color: #cba6f7; border-radius: 4px;">Execute Pipeline</button>
         </div>\` : html\`<div class="lain-md markdown-body" style="word-break: break-word;">\${unsafeHTML(toSanitizedMarkdownHtml(pipelineMatch[2]))}</div>\`;
         
         return html\`
           <div class="lain-md markdown-body" style="word-break: break-word;">\${unsafeHTML(toSanitizedMarkdownHtml(before))}</div>
           \${pipelineUI}
           <div class="lain-md markdown-body" style="word-break: break-word;">\${unsafeHTML(toSanitizedMarkdownHtml(after))}</div>
         \`;
      }
      return html\`<div class="lain-md markdown-body" style="word-break: break-word;">\${unsafeHTML(toSanitizedMarkdownHtml(text))}</div>\`;
    }`;

if (code.includes(targetStr)) {
  fs.writeFileSync(path, code.replace(targetStr, newStr));
  console.log("Successfully patched main.ts");
} else {
  console.log("Target string not found!");
}
