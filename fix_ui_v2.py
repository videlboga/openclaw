import os

main_ts_path = 'ui/src/lain/main.ts'
with open(main_ts_path, 'r') as f:
    content = f.read()

# Update grid-template-columns: remove --hud-width (3rd column) and the last 260px (4th column)
# Old: grid-template-columns: var(--contexts-width, 280px) minmax(0, 1fr) var(--hud-width, 260px) 260px;
# New: grid-template-columns: var(--contexts-width, 280px) minmax(0, 1fr) var(--persona-width, 400px);

content = content.replace(
    'grid-template-columns: var(--contexts-width, 280px) minmax(0, 1fr) var(--hud-width, 260px) 260px;',
    'grid-template-columns: var(--contexts-width, 280px) minmax(0, 1fr) var(--persona-width, 400px);'
)

# Also update the vars in style="..."
content = content.replace(
    '--hud-width: ${state.hudCollapsed ? "44px" : "260px"};',
    '--persona-width: 400px;'
)

with open(main_ts_path, 'w') as f:
    f.write(content)

styles_css_path = 'ui/src/lain/styles.css'
with open(styles_css_path, 'r') as f:
    styles = f.read()

# Update .lain-main in CSS too (it's hardcoded there as well)
styles = styles.replace(
    'grid-template-columns: var(--contexts-width, 280px) minmax(0, 1fr) var(--hud-width, 260px) 260px;',
    'grid-template-columns: var(--contexts-width, 280px) minmax(0, 1fr) 400px;'
)

# Remove old padding/background from .lain-persona that might restrict it
styles = styles.replace(
    '.lain-persona {\n  border-left: 1px solid var(--border-color);\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 18px;\n}',
    '.lain-persona {\n  border-left: 1px solid var(--border-color);\n  display: flex;\n  flex-direction: column;\n  position: relative;\n  overflow: hidden;\n  background: #000;\n}'
)

with open(styles_css_path, 'w') as f:
    f.write(styles)

print("UI logic and layout updated to remove empty space and fix persona container.")
