import { Live2DCubismModel } from "./Live2DCubismModel";
export declare class TouchController {
    model: Live2DCubismModel;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    constructor(model: Live2DCubismModel);
    touchStart: (posX: number, posY: number) => void;
    touchMove: (posX: number, posY: number) => void;
    getFlickDistance: () => number;
    calculateDistance: (x1: number, y1: number, x2: number, y2: number) => number;
    calculateMovingAmount: (x1: number, x2: number) => number;
    pointerDown: (event: PointerEvent) => void;
    pointerMove: (event: PointerEvent) => void;
    pointerUp: (event: PointerEvent) => void;
    tap: (x: number, y: number) => void;
    startInteractions: () => void;
    cancelInteractions: () => void;
    initInteractions: () => void;
}
