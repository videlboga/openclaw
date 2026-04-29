import sys

file_path = "/home/cyberkitty/Projects/openclaw/ui/src/lain/main.ts"
with open(file_path, "r") as f:
    lines = f.readlines()

# Очистим функцию initLive2D от дубликатов и восстановим чистую структуру
start_line = -1
end_line = -1

for i, line in enumerate(lines):
    if "async function initLive2D()" in line:
        start_line = i
    if start_line != -1 and line.strip() == "}":
        # Ищем закрывающую скобку самой функции (простая эвристика)
        if i > start_line + 10 and (i == len(lines)-1 or "function" in lines[i+1] or "setTimeout" in lines[i+1]):
            end_line = i
            break

if start_line != -1 and end_line != -1:
    new_func = [
        "async function initLive2D() {\n",
        "  const canvas = document.getElementById(\"lain-live2d-canvas\") as HTMLCanvasElement;\n",
        "  if (!canvas) {\n",
        "    console.warn(\"Live2D canvas not found\");\n",
        "    return;\n",
        "  }\n",
        "  \n",
        "  try {\n",
        "    const app = new (window as any).PIXI.Application({\n",
        "      view: canvas,\n",
        "      autoStart: true,\n",
        "      backgroundAlpha: 0,\n",
        "      resizeTo: canvas.parentElement || window\n",
        "    });\n",
        "\n",
        "    const { Live2DModel } = (window as any).PIXI.live2d;\n",
        "    const model = await Live2DModel.from('/live2d/custom/ChatGPT Image 14 апр.model3.json');\n",
        "    app.stage.addChild(model);\n",
        "    (model as any).app = app;\n",
        "\n",
        "    (window as any).__live2d_model = model;\n",
        "    (window as any).__live2d_core = model.internalModel.coreModel;\n",
        "    (window as any).__pixi_app = app;\n",
        "\n",
        "    const scaleX = canvas.width / model.width;\n",
        "    const scaleY = canvas.height / model.height;\n",
        "    model.scale.set(Math.min(scaleX, scaleY) * 0.9);\n",
        "    model.anchor.set(0.5, 0.5);\n",
        "    model.position.set(canvas.width / 2, canvas.height / 2);\n",
        "\n",
        "    let blinkState = 1.0;\n",
        "    let blinkTimer = 0;\n",
        "    let isClosing = false;\n",
        "    let breathTime = 0;\n",
        "\n",
        "    app.ticker.add((delta: number) => {\n",
        "      const core = model.internalModel.coreModel;\n",
        "      breathTime += delta * 0.05;\n",
        "      core.setParameterValueById('ParamBreath', (Math.sin(breathTime) + 1) / 2);\n",
        "      if (blinkTimer <= 0) { isClosing = true; }\n",
        "      if (isClosing) {\n",
        "        blinkState -= 0.2 * delta;\n",
        "        if (blinkState <= 0) { blinkState = 0; isClosing = false; blinkTimer = 100 + Math.random() * 200; }\n",
        "      } else if (blinkState < 1.0) {\n",
        "        blinkState += 0.2 * delta;\n",
        "        if (blinkState > 1.0) blinkState = 1.0;\n",
        "      } else { blinkTimer -= delta; }\n",
        "      core.setParameterValueById('ParamEyeLOpen', blinkState);\n",
        "      model.update();\n",
        "    });\n",
        "\n",
        "    window.addEventListener('mousemove', (e) => {\n",
        "      const rect = canvas.getBoundingClientRect();\n",
        "      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;\n",
        "      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);\n",
        "      model.focus(x, y);\n",
        "    });\n",
        "\n",
        "    console.log(\"Live2D model loaded perfectly!\");\n",
        "  } catch (err) {\n",
        "    console.error(\"Live2D initialization failed:\", err);\n",
        "  }\n",
        "}\n"
    ]
    # Заменяем старую функцию на новую
    lines[start_line:end_line+1] = new_func
    with open(file_path, "w") as f:
        f.writelines(lines)
    print("FIXED")
else:
    print("NOT FOUND")
