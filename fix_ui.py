import os

path = '/home/cyberkitty/Projects/openclaw/ui/src/lain/main.ts'
with open(path, 'r') as f:
    content = f.read()

# 1. Remove HUD entirely from the HTML template
# The HUD block starts with <aside class="lain-hud ..."> and ends before <aside class="lain-persona" ...>
import re
hud_pattern = r'<aside class="lain-hud.*?/aside>'
content = re.sub(hud_pattern, '', content, flags=re.DOTALL)

# 2. Make Persona full height/width of its container and adjust elements
# We want the Live2D canvas to be prominently displayed and other info to be less obstructive if possible
persona_pattern = r'<aside class="lain-persona".*?/aside>'
new_persona = """<aside class="lain-persona" style="position: relative; flex: 1; display: flex; flex-direction: column;">
          <canvas id="lain-live2d-canvas" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none; z-index: 1;"></canvas>
          <div style="position: relative; z-index: 2; padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: flex-end; background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%); pointer-events: none;">
            <div class="lain-state" style="font-size: 0.8rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 2px;">${current?.mood ?? "idle"}</div>
            <div class="lain-ambient" style="font-size: 0.9rem; max-width: 400px; margin-top: 8px; line-height: 1.4; color: #a0a0a0;">
              ${current?.ambient ?? "Trying to listen to the house through the wires."}
            </div>
          </div>
        </aside>"""

content = re.sub(persona_pattern, new_persona, content, flags=re.DOTALL)

# 3. Clean up CSS - remove .lain-hud and ensure .lain-persona is clean
# We'll just append some styles to the top styles if needed or rely on styles.css
# But let's check styles.css later. For now, we use inline as requested for layout.

with open(path, 'w') as f:
    f.write(content)
print("Successfully removed HUD and maximized Lain")
