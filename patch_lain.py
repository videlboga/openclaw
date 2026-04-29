import sys

file_path = "ui/src/lain/main.ts"
with open(file_path, "r") as f:
    content = f.read()

old_text = '    console.log("Live2D model loaded perfectly!");'
new_text = """    console.log("Live2D model loaded perfectly!");

    // Set global variables for debugging
    (window as any).__live2d_model = model;
    (window as any).__live2d_core = model.internalModel.coreModel;

    // Follow cursor
    window.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      model.focus(x, y);
    });

    let blinkState = 1.0;
    let blinkTimer = 0;
    let isClosing = false;

    // Main manual animation loop
    app.ticker.add((delta: number) => {
      const core = model.internalModel.coreModel;
      if (blinkTimer <= 0) { isClosing = true; blinkTimer = 100 + Math.random() * 200; }
      if (isClosing) {
        blinkState -= 0.15 * delta;
        if (blinkState <= 0) { blinkState = 0; isClosing = false; }
      } else if (blinkState < 1.0) {
        blinkState += 0.15 * delta;
        if (blinkState > 1.0) blinkState = 1.0;
      } else { blinkTimer -= delta; }
      core.setParameterValueById('ParamEyeLOpen', blinkState);
      model.update();
    });"""

if old_text in content:
    new_content = content.replace(old_text, new_text)
    with open(file_path, "w") as f:
        f.write(new_content)
    print("SUCCESS")
else:
    print("NOT FOUND")
