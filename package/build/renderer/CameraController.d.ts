import { Live2DCubismModel } from "./Live2DCubismModel";
export declare class CameraController {
    model: Live2DCubismModel;
    x: number;
    y: number;
    scale: number;
    minScale: number;
    maxScale: number;
    zoomStep: number;
    panSpeed: number;
    isPanning: boolean;
    lastPosition: {
        x: number;
        y: number;
    };
    zoomEnabled: boolean;
    enablePan: boolean;
    doubleClickReset: boolean;
    constructor(model: Live2DCubismModel);
    zoomIn: (factor?: number) => void;
    zoomOut: (factor?: number) => void;
    handleMouseDown: (event: MouseEvent) => void;
    handleMouseMove: (event: MouseEvent) => void;
    handleMouseUp: () => void;
    handleWheel: (event: WheelEvent) => void;
    handleDoubleClick: () => void;
    addListeners: () => void;
    removeListeners: () => void;
    initListeners: () => void;
}
