import sys

file_path = "/home/cyberkitty/Projects/openclaw/ui/src/lain/main.ts"
with open(file_path, "r") as f:
    content = f.read()

# Ищем начало функции
start_marker = "async function initLive2D()"
start_index = content.find(start_marker)

if start_index != -1:
    # Ищем конец файла
    # Удаляем всё от начала функции до конца файла (так как она была последней)
    new_content = content[:start_index]
    
    clean_func = """async function initLive2D() {
  const canvas = document.getElementById("lain-live2d-canvas") as HTMLCanvasElement;
  if (!canvas) return;
  try {
    const app = new (window as any).PIXI.Application({ 
      view: canvas, 
      autoStart: true, 
      backgroundAlpha: 0, 
      resizeTo: canvas.parentElement || window 
    });
    const { Live2DModel } = (window as any).PIXI.live2d;
    const model = await Live2DModel.from('/live2d/custom/ChatGPT Image 14 апр.model3.json');
    app.stage.addChild(model);
    (window as any).__live2d_model = model;
    (window as any).__live2d_core = model.internalModel.coreModel;
    model.anchor.set(0.5, 0.5);
    model.position.set(canvas.width / 2, canvas.height / 2);
    const scale = Math.min(canvas.width / model.width, canvas.height / model.height) * 0.9;
    model.scale.set(scale);
    let blink = 1.0; let blinkT = 0; let closing = false; let breath = 0;
    app.ticker.add((delta: number) => {
      const core = model.internalModel.coreModel;
      breath += delta * 0.05;
      core.setParameterValueById('ParamBreath', (Math.sin(breath) + 1) / 2);
      if (blinkT <= 0) closing = true;
      if (closing) { 
        blink -= 0.2 * delta; 
        if (blink <= 0) { blink = 0; closing = false; blinkT = 100 + Math.random()*200; } 
      } else if (blink < 1) { 
        blink += 0.2 * delta; 
        if (blink > 1) blink = 1; 
      } else { blinkT -= delta; }
      core.setParameterValueById('ParamEyeLOpen', blink);
      model.update();
    });
    window.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      model.focus(((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1));
    });
    console.log("Live2D model loaded perfectly!");
  } catch (err) { console.error("Live2D failed:", err); }
}

setTimeout(initLive2D, 100);
"""
    with open(file_path, "w") as f:
        f.write(new_content + clean_func)
    print("SUCCESS")
else:
    print("NOT FOUND")
