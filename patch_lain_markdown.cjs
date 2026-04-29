const fs = require("fs");
const file = "ui/src/lain/main.ts";
let content = fs.readFileSync(file, "utf8");

if (!content.includes('import { unsafeHTML }')) {
  content = `import { unsafeHTML } from "lit-html/directives/unsafe-html.js";\nimport { toSanitizedMarkdownHtml } from "../ui/markdown.ts";\n` + content;
}

const newRenderFunc = `
function renderMessageContent(contentArray, fallbackText) {
  const renderText = (text) => {
    if (!text || text === " ") return html\`\${text}\`;
    
    // Check for pipeline block
    const pipelineMatch = text.match(/\\\`\\\`\\\`json\\s+pipeline\\s+([\\s\\S]*?)\\\`\\\`\\\`/);
    if (pipelineMatch) {
      const before = text.substring(0, pipelineMatch.index);
      const after = text.substring(pipelineMatch.index + pipelineMatch[0].length);
      let pipelineData = null;
      try {
        pipelineData = JSON.parse(pipelineMatch[1]);
      } catch (e) {
        console.error("Failed to parse pipeline JSON", e);
      }
      
      const pipelineUI = pipelineData ? html\`
        <div style="margin: 12px 0; padding: 12px; background: rgba(203,166,247,0.15); border: 1px solid #cba6f7; border-radius: 8px;">
          <h4 style="margin:0 0 8px 0; color: #cba6f7;">🚀 Pipeline Protocol: \${pipelineData.pipelineId || 'Unnamed'}</h4>
          <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 8px;">
            <strong>Workspace:</strong> \${pipelineData.workspaceDir || 'current'}<br/>
            <strong>Agents:</strong> \${pipelineData.agents ? pipelineData.agents.map(a => a.id).join(', ') : 'none'}
          </div>
          <button style="background: #cba6f7; color: #1e1e2e; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">
            Execute Pipeline
          </button>
        </div>\` : html\`<div style="color:red">Invalid pipeline format</div>\`;
        
      return html\`
        <div class="lain-md">\${unsafeHTML(toSanitizedMarkdownHtml(before))}</div>
        \${pipelineUI}
        <div class="lain-md">\${unsafeHTML(toSanitizedMarkdownHtml(after))}</div>
      \`;
    }

    return html\`<div class="lain-md markdown-body" style="word-break: break-word;">\${unsafeHTML(toSanitizedMarkdownHtml(text))}</div>\`;
  };

  if (!contentArray || !Array.isArray(contentArray) || contentArray.length === 0) {
    return renderText(fallbackText);
  }
  return contentArray.map(item => {
    if (item.type === 'text') {
      return renderText(item.text);
    }
    if (item.type === 'tool_call' || item.name) {
      let argsStr = "";
      if (item.args) {
        argsStr = typeof item.args === 'string' ? item.args : JSON.stringify(item.args, null, 2);
      }
      // truncate long arguments visually
      return html\`<div style="margin: 8px 0; background: rgba(203,166,247,0.1); border-left: 2px solid #cba6f7; padding: 8px; border-radius: 0 4px 4px 0; font-family: monospace; font-size: 0.85em; word-break: break-all;">
        <div style="color: #cba6f7; font-weight: bold; margin-bottom: argsStr ? '4px' : '0';">\${item.name || item.type || 'tool'}</div>
        \${argsStr ? html\`<div style="opacity: 0.8; white-space: pre-wrap; max-height: 200px; overflow-y: auto;">\${argsStr}</div>\` : ''}
      </div>\`;
    }
    if (item.type === 'tool_result') {
      // Check if item.text has pipeline
      if (item.text && item.text.includes('json pipeline')) {
        return html\`<div style="margin: 8px 0; background: rgba(166,227,161,0.1); border-left: 2px solid #a6e3a1; padding: 8px; border-radius: 0 4px 4px 0; font-family: monospace; font-size: 0.85em; word-break: break-all;">
          <div style="color: #a6e3a1; font-weight: bold; margin-bottom: 4px;">\${item.name || 'tool_result'}</div>
          \${renderText(item.text)}
        </div>\`;
      }
      return html\`<div style="margin: 8px 0; background: rgba(166,227,161,0.1); border-left: 2px solid #a6e3a1; padding: 8px; border-radius: 0 4px 4px 0; font-family: monospace; font-size: 0.85em; word-break: break-all;">
        <div style="color: #a6e3a1; font-weight: bold; margin-bottom: item.text ? '4px' : '0';">\${item.name || 'tool_result'}</div>
        \${item.text ? html\`<div style="opacity: 0.8; white-space: pre-wrap; max-height: 120px; overflow-y: auto;">\${item.text}</div>\` : ''}
      </div>\`;
    }
    return html\`<pre style="font-size:0.85em; opacity:0.8; word-break: break-all;">\${JSON.stringify(item, null, 2)}</pre>\`;
  });
}
`;

content = content.replace(/function renderMessageContent\([\s\S]*?\}\n\}/, newRenderFunc.trim());

fs.writeFileSync(file, content);
console.log("Patched!");
