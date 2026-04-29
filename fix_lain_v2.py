import sys

file_path = "/home/cyberkitty/Projects/openclaw/ui/src/lain/main.ts"
with open(file_path, "r") as f:
    lines = f.readlines()

start_line = -1
for i, line in enumerate(lines):
    if "async function initLive2D()" in line:
        start_line = i
        break

if start_line != -1:
    new_func = [
        "async function initLive2D() {\n",
        "  const canvas = document.getElementById(\"lain-live2d-canvas\") as HTMLCanvasElement;\n",
        "  if (!canvas) return;\n",
        "  try {\n",
        "    const app = new (window as any).PIXI.Application({ view: canvas, autoStart: true, backgroundAlpha: 0, resizeTo: canvas.parentElement || window });\n",
        "    const { Live2DModel } = (window as any).PIXI.live2d;\n",
        "    const model = await Live2DModel.from('/live2d/custom/ChatGPT Image 14 апр.model3.json');\n",
        "    app.stage.addChild(model);\n",
        "    \n",
        "    (window as any).__live2d_model = model;\n",
        "    (window as any).__live2d_core = model.internalModel.coreModel;\n",
        "\n",
        "    model.anchor.set(0.5, 0.5);\n",
        "    model.position.set(canvas.width / 2, canvas.height / 2);\n",
        "    const scale = Math.min(canvas.width / model.width, canvas.height / model.height) * 0.9;\n",
        "    model.scale.set(scale);\n",
        "\n",
        "    let blink = 1.0; let blinkT = 0; let closing = false; let breath = 0;\n",
        "\n",
        "    app.ticker.add((delta) => {\n",
        "      const core = model.internalModel.coreModel;\n",
        "      // Breathing\n",
        "      breath += delta * 0.05;\n",
        "      core.setParameterValueById('ParamBreath', (Math.sin(breath) + 1) / 2);\n",
        "      \n",
        "      // Blink\n",
        "      if (blinkT <= 0) closing = true;\n",
        "      if (closing) { blink -= 0.2 * delta; if (blink <= 0) { blink = 0; closing = false; blinkT = 100 + Math.random()*200; } }\n",
        "      else if (blink < 1) { blink += 0.2 * delta; if (blink > 1) blink = 1; }\n",
        "      else blinkT -= delta;\n",
        "\n",
        "      core.setParameterValueById('ParamEyeLOpen', blink);\n",
        "      model.update();\n",
        "    });\n",
        "\n",
        "    window.addEventListener('mousemove', (e) => {\n",
        "      const rect = canvas.getBoundingClientRect();\n",
        "      model.focus(((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1));\n",
        "    });\n",
        "    console.log(\"Live2D model loaded perfectly!\");\n",
        "  } catch (err) { console.error(\"Live2D failed:\", err); }\n",
        "}\n"
    ]
    # Ищем конец текущей функции (первая } в начале строки после start_line)
    end_line = -1
    for i in range(start_line + 1, len(lines)):
        if lines[i].strip() == "}":
            end_line = i
            break
    
    if end_line != -1:
        lines[start_line:end_line+1] = new_func
        with open(file_path, "w") as f:
            f.writelines(lines)
        print("SUCCESS")
