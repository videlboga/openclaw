export TOKEN=$(jq -r .token ~/.openclaw/credentials/github-copilot.token.json)

curl -s "https://api.individual.githubcopilot.com/chat/completions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Editor-Version: vscode/1.96.2" \
  -H "Editor-Plugin-Version: copilot-chat/0.26.2" \
  -H "User-Agent: GitHubCopilotChat/0.26.2" \
  -H "Openai-Intent: conversation-panel" \
  -d '{
    "model": "gpt-5-mini",
    "stream": false,
    "messages": [
      {
        "role": "user",
        "content": "Hi"
      }
    ],
    "tools": [
      {
        "type": "function",
        "function": {
           "name": "get_weather",
           "description": "get weather",
           "parameters": {
               "type": "object",
               "properties": {}
           }
        }
      }
    ],
    "tool_choice": "auto"
  }'

echo -e "\n\n"

curl -s "https://api.individual.githubcopilot.com/chat/completions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Editor-Version: vscode/1.96.2" \
  -H "Editor-Plugin-Version: copilot-chat/0.26.2" \
  -H "User-Agent: GitHubCopilotChat/0.26.2" \
  -H "Openai-Intent: conversation-panel" \
  -d '{
    "model": "gpt-5-mini",
    "stream": true,
    "messages": [
      {
        "role": "user",
        "content": "Hi"
      }
    ],
    "stream_options": { "include_usage": true },
    "tools": [
      {
        "type": "function",
        "function": {
           "name": "get_weather",
           "description": "get weather",
           "parameters": {
               "type": "object",
               "properties": {}
           }
        }
      }
    ]
  }'

