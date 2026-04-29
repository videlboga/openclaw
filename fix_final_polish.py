import os

main_ts_path = 'ui/src/lain/main.ts'
with open(main_ts_path, 'r') as f:
    content = f.read()

# 1. Fix black bar above: change object-fit: cover to contain or adjust canvas alignment
# Actually, the user says "black stripe above", which suggests 'cover' is working but the scaling/alignment might be off or the background is black.
# Let's ensure the canvas itself starts from the very top.
content = content.replace(
    'object-fit: cover;',
    'object-fit: cover; object-position: center top;'
)

# 2. Make blinking even rarer
# Old: blinkT = 100 + Math.random() * 300;
# New: blinkT = 200 + Math.random() * 600; (approx twice as rare)
content = content.replace(
    'blinkT = 100 + Math.random() * 300;',
    'blinkT = 250 + Math.random() * 800;'
)

# 3. Ensure full height scaling in updateSize
# Old helper used 0.95 scale. Let's use 1.05 to slightly overflow and ensure NO bars.
content = content.replace(
    'const scale = (canvas.height / (model.height / model.scale.y)) * 0.95;',
    'const scale = (canvas.height / (model.height / model.scale.y)) * 1.0;'
)

with open(main_ts_path, 'w') as f:
    f.write(content)

styles_css_path = 'ui/src/lain/styles.css'
with open(styles_css_path, 'r') as f:
    styles = f.read()

# Remove any top padding from persona that might cause a gap
if '.lain-persona {' in styles:
    styles = styles.replace(
        '.lain-persona {\n  border-left: 1px solid var(--border-color);\n  display: flex;\n  flex-direction: column;\n  position: relative;\n  overflow: hidden;\n  background: #000;\n}',
        '.lain-persona {\n  border-left: 1px solid var(--border-color);\n  display: flex;\n  flex-direction: column;\n  position: relative;\n  overflow: hidden;\n  background: #000;\n  padding: 0 !important;\n}'
    )

with open(styles_css_path, 'w') as f:
    f.write(styles)

print("Final polish: rare blinking and gap fix applied.")
