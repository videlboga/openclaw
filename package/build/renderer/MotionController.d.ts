import { CubismMotionQueueEntryHandle } from "../framework/src/motion/cubismmotionqueuemanager";
import { FinishedMotionCallback, BeganMotionCallback } from "../framework/src/motion/acubismmotion";
import { Live2DCubismModel } from "./Live2DCubismModel";
export declare class MotionController {
    model: Live2DCubismModel;
    constructor(model: Live2DCubismModel);
    load: () => Promise<void>;
    update: (deltaTime: DOMHighResTimeStamp) => boolean;
    stopMotions: () => void;
    startMotion: (group: string, i: number, priority: number, onStartMotion?: BeganMotionCallback, onEndMotion?: FinishedMotionCallback) => Promise<CubismMotionQueueEntryHandle>;
    startRandomMotion: (group: string | null, priority: number, onStartMotion?: BeganMotionCallback, onEndMotion?: FinishedMotionCallback) => Promise<CubismMotionQueueEntryHandle>;
}
