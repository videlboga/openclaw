import os

path = '/home/cyberkitty/Projects/openclaw/ui/src/lain/main.ts'
with open(path, 'r') as f:
    content = f.read()

old_logic = """    app.ticker.add((delta: number) => {
      const core = model.internalModel.coreModel;
      
      // 1. Моргание
      if (blinkT <= 0) {closing = true;}
      if (closing) {
        blink -= 0.3 * delta;
        if (blink <= 0) { blink = 0; closing = false; blinkT = 60 + Math.random() * 200; }
      } else if (blink < 1) {
        blink += 0.3 * delta;
        if (blink > 1) {blink = 1;}
      } else { blinkT -= delta; }
      
      // 2. Установка параметров
      core.setParameterValueById('ParamEyeLOpen', blink);
      core.setParameterValueById('ParamEyeROpen', blink);
      core.setParameterValueById('ParamEyeBallX', fX);
      core.setParameterValueById('ParamEyeBallY', fY);
      
      // 3. ОБЯЗАТЕЛЬНО: model.update() после записи in core
      model.update(delta);
    });"""

# Note: The 'in core' vs 'после записи в core' might be a typo in my recollection vs file
# Let's search simply by the start and end of the block.

new_logic = """    app.ticker.add((delta: number) => {
      const core = model.internalModel.coreModel;
      
      const session = getCurrentSession();
      const sessionMood = inferMood(session?.row || { status: 'idle' } as any, session?.messages || []);
      
      // 1. Моргание (чуть медленнее: 0.1 вместо 0.3)
      if (blinkT <= 0) {closing = true;}
      if (closing) {
        blink -= 0.1 * delta;
        if (blink <= 0) { blink = 0; closing = false; blinkT = 100 + Math.random() * 300; }
      } else if (blink < 1) {
        blink += 0.1 * delta;
        if (blink > 1) {blink = 1;}
      } else { blinkT -= delta; }
      
      // 2. Движение глаз в зависимости от режима
      let targetX = 0;
      let targetY = 0;

      if (sessionMood === "listening") {
        targetX = Math.sin(Date.now() / 1000) * 0.1;
        targetY = 0.2;
      } else if (sessionMood === "thinking" || sessionMood === "executing") {
        targetX = Math.sin(Date.now() / 2000) * 0.5;
        targetY = Math.cos(Date.now() / 3000) * 0.3;
      } else if (sessionMood === "blocked") {
        targetX = 0;
        targetY = -0.5;
      } else {
        targetX = fX * 0.5;
        targetY = fY * 0.5;
      }

      core.setParameterValueById('ParamEyeLOpen', blink);
      core.setParameterValueById('ParamEyeROpen', blink);
      core.setParameterValueById('ParamEyeBallX', targetX);
      core.setParameterValueById('ParamEyeBallY', targetY);
      
      model.update(delta);
    });"""

if 'app.ticker.add((delta: number) => {' in content:
    start_str = '    app.ticker.add((delta: number) => {'
    end_str = '    });'
    
    # We find the one near the end
    start_index = content.rfind(start_str)
    end_index = content.find(end_str, start_index) + len(end_str)
    
    new_content = content[:start_index] + new_logic + content[end_index:]
    with open(path, 'w') as f:
        f.write(new_content)
    print("Successfully patched")
else:
    print("Could not find ticker block")
