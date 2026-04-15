import { readFileSync } from 'fs';
import os from 'os';
import path from 'path';

async function testCopilot() {
  const tokenPath = path.join(os.homedir(), '.config/github-copilot/hosts.json');
  let token = '';
  try {
    const data = JSON.parse(readFileSync(tokenPath, 'utf8'));
    token = data['github.com'].oauth_token;
  } catch (e) {
    console.error('Failed to read Copilot token:', e.message);
    process.exit(1);
  }

  // Get Copilot session token
  const sessionRes = await fetch('https://api.github.com/copilot_internal/v2/token', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!sessionRes.ok) {
    console.error('Failed to get session token:', sessionRes.status, await sessionRes.text());
    process.exit(1);
  }
  const sessionData = await sessionRes.json();
  const sessionToken = sessionData.token;

  console.log('Got session token.');

  const res = await fetch('https://api.githubcopilot.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
      'Editor-Version': 'vscode/1.85.0',
      'Editor-Plugin-Version': 'copilot-chat/0.12.0',
      'Vscode-Sessionid': '12345678-1234-1234-1234-123456789012',
      'Vscode-Machineid': '12345678-1234-1234-1234-123456789012',
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'hello' }],
      model: 'gpt-4o',
      stream: false,
      tools: [
        {
          type: 'function',
          function: {
             name: 'test_tool',
             description: 'does nothing',
             parameters: { type: 'object', properties: {} }
          }
        }
      ]
    })
  });

  const body = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', body);
}

testCopilot().catch(console.error);
