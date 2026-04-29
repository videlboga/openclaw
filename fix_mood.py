import os

path = '/home/cyberkitty/Projects/openclaw/ui/src/lain/main.ts'
with open(path, 'r') as f:
    content = f.read()

# Debug: check what sessionMood is being calculated
debug_print = '      console.log("Lain Mood:", sessionMood);'

# Locate the mood calculation
mood_calc = 'const sessionMood = inferMood(session?.row || { status: "idle" } as any, session?.messages || []);'
# The file actually has single quotes for 'idle'
mood_calc = "const sessionMood = inferMood(session?.row || { status: 'idle' } as any, session?.messages || []);"

if mood_calc in content:
    # Change the else block to NOT follow mouse
    # And maybe add some smoothing
    old_block = """      } else {
        targetX = fX * 0.5;
        targetY = fY * 0.5;
      }"""
    
    new_block = """      } else {
        // Idle: stay centered with very slight breathing movement
        targetX = Math.sin(Date.now() / 5000) * 0.05;
        targetY = Math.cos(Date.now() / 7000) * 0.05;
      }"""
    
    content = content.replace(old_block, new_block)
    
    # Also fix ParamAngleX/Y so they don't follow mouse (if they were)
    # Actually, in the current file read, I only see ParamEyeBallX/Y being set.
    
    with open(path, 'w') as f:
        f.write(content)
    print("Successfully patched idle behavior")
else:
    print("Could not find mood calculation line")
