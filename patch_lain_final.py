import sys

file_path = "ui/src/lain/main.ts"
with open(file_path, "r") as f:
    content = f.read()

# Находим место после addChild(model)
marker = "app.stage.addChild(model);"
if marker in content:
    patch = """
    app.stage.addChild(model);
    (model as any).app = app; // CRITICAL: Link app to model for debugging
    
    // Debug exports
    (window as any).__live2d_model = model;
    (window as any).__live2d_core = model.internalModel.coreModel;
    (window as any).__pixi_app = app;"""
    
    content = content.replace(marker, patch)

# Находим место после настройки позиции
pos_marker = "model.position.set(canvas.width / 2, canvas.height / 2);"
if pos_marker in content:
    loop_patch = """
    model.position.set(canvas.width / 2, canvas.height / 2);
    
    // Blink and Breath logic
    let blinkState = 1.0;
    let blinkTimer = 0;
    let isClosing = false;
    let breathTime = 0;

    app.ticker.add((delta: number) => {
      const core = model.internalModel.coreModel;
      
      // 1. DYNAMIC BREATHING (to see if model is alive at all)
      breathTime += delta * 0.05;
      const breathValue = (Math.sin(breathTime) + 1) / 2; // 0 to 1
      core.setParameterValueById('ParamBreath', breathValue);
      
      // 2. BLINKING
      if (blinkTimer <= 0) { isClosing = true; }
      if (isClosing) {
        blinkState -= 0.2 * delta;
        if (blinkState <= 0) { blinkState = 0; isClosing = false; blinkTimer = 100 + Math.random() * 200; }
      } else if (blinkState < 1.0) {
        blinkState += 0.2 * delta;
      } else {
        blinkTimer -= delta;
      }
      core.setParameterValueById('ParamEyeLOpen', blinkState);
      
      // 3. CURSOR TRACKING (simple version)
      // model.focus() is usually enough if called here
      
      model.update();
    });

    // Follow cursor
    window.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      model.focus(x, y);
    });"""
    
    content = content.replace(pos_marker, loop_patch)

with open(file_path, "w") as f:
    f.write(content)
