import { Live2DCubismModel } from "./Live2DCubismModel";
export declare class WebGLRenderer {
    model: Live2DCubismModel;
    shader: WebGLProgram;
    constructor(model: Live2DCubismModel);
    createShader: () => WebGLProgram;
    deleteShader: () => void;
    start: () => void;
    loadTexture: (index: number, image: HTMLImageElement) => void;
    deleteTextures: () => void;
    deleteTexture: (texture: WebGLTexture) => void;
    resize: () => void;
    contextLost: () => boolean;
    prepare: () => void;
    draw: () => void;
}
