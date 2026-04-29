import { Live2DCubismModel } from "./Live2DCubismModel";
export declare class ExpressionController {
    model: Live2DCubismModel;
    constructor(model: Live2DCubismModel);
    load: () => Promise<void>;
    update: (deltaTime: DOMHighResTimeStamp) => void;
    setExpression: (expression: string) => void;
    setRandomExpression: () => void;
}
