import os

path = '/home/cyberkitty/Projects/openclaw/ui/src/lain/styles.css'
if os.path.exists(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # Ensure .lain-persona takes proper space in the flex container
    # and hide old portrait bits if they are still in CSS
    new_styles = """
.lain-persona {
  flex: 1.5 !important; /* Give more space to Lain */
  border-left: 1px solid rgba(255,255,255,0.1);
  background: #0a0a0a;
  overflow: hidden;
}

.lain-portrait-wrap, .lain-portrait-glow, .lain-portrait {
  display: none !important;
}
"""
    with open(path, 'a') as f:
        f.write(new_styles)
    print("Updated styles.css")
else:
    print("styles.css not found")
