import { Live2DCubismModel } from "./Live2DCubismModel";
export declare class WavFileController {
    model: Live2DCubismModel;
    samples: Float32Array[] | null;
    previousRms: number;
    rms: number;
    sampleOffset: number;
    userTime: number;
    numChannels: number;
    bitsPerSample: number;
    sampleRate: number;
    samplesPerChannel: number;
    smoothingFactor: number;
    volumeNode: GainNode;
    sourceNode: AudioBufferSourceNode | null;
    constructor(model: Live2DCubismModel);
    start: (wavBuffer: ArrayBuffer | AudioBuffer, playAudio?: boolean) => Promise<void>;
    play: (audioBuffer: AudioBuffer) => Promise<void>;
    stop: () => Promise<void>;
    update: (deltaTime: DOMHighResTimeStamp) => void;
    getRms(): number;
}
