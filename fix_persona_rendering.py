import os

path = 'ui/src/lain/main.ts'
with open(path, 'r') as f:
    content = f.read()

# Make sure model.anchor and position are correct for the new container
old_setup = """    model.anchor.set(0.5, 0.5);
    model.position.set(canvas.width / 2, canvas.height / 2);
    const scale = Math.min(canvas.width / (model.width || 1), canvas.height / (model.height || 1)) * 0.9;
    model.scale.set(scale);"""

# Use 1.0 scale and bottom-center alignment if we want it "full"
# or just ensure it fills the canvas
new_setup = """    model.anchor.set(0.5, 1.0); // anchor to bottom center
    
    const updateSize = () => {
        model.position.set(canvas.width / 2, canvas.height);
        // Calculate scale to fit height
        const scale = (canvas.height / (model.height / model.scale.y)) * 0.95;
        model.scale.set(scale);
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);"""

if old_setup in content:
    content = content.replace(old_setup, new_setup)
    with open(path, 'w') as f:
        f.write(content)
    print("Updated Live2D scaling and positioning.")
else:
    print("Could not find old_setup block.")
