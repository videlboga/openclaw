"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Live2DCubismModel = exports.compressLive2DTextures = exports.isLive2DZip = void 0;
const cubismmodelsettingjson_1 = require("../framework/src/cubismmodelsettingjson");
const cubismdefaultparameterid_1 = require("../framework/src/cubismdefaultparameterid");
const cubismeyeblink_1 = require("../framework/src/effect/cubismeyeblink");
const cubismbreath_1 = require("../framework/src/effect/cubismbreath");
const cubismmotionqueuemanager_1 = require("../framework/src/motion/cubismmotionqueuemanager");
const live2dcubismframework_1 = require("../framework/src/live2dcubismframework");
const cubismviewmatrix_1 = require("../framework/src/math/cubismviewmatrix");
const cubismmatrix44_1 = require("../framework/src/math/cubismmatrix44");
const cubismmoc_1 = require("../framework/src/model/cubismmoc");
const csmvector_1 = require("../framework/src/type/csmvector");
const csmmap_1 = require("../framework/src/type/csmmap");
const Live2DCubismUserModel_1 = require("./Live2DCubismUserModel");
const WavFileController_1 = require("./WavFileController");
const TouchController_1 = require("./TouchController");
const MotionController_1 = require("./MotionController");
const ExpressionController_1 = require("./ExpressionController");
const CameraController_1 = require("./CameraController");
const WebGLRenderer_1 = require("./WebGLRenderer");
const path_1 = __importDefault(require("path"));
let id = null;
const isLive2DZip = async (arrayBuffer) => {
    var _a;
    let fileType;
    let JSZip;
    try {
        fileType = await Promise.resolve().then(() => __importStar(require("magic-bytes.js"))).then((r) => r.default);
        JSZip = await Promise.resolve().then(() => __importStar(require("jszip"))).then((r) => r.default);
    }
    catch (_b) {
        return Promise.reject("jszip and magic-bytes.js required");
    }
    let isZip = false;
    const result = ((_a = fileType(new Uint8Array(arrayBuffer))) === null || _a === void 0 ? void 0 : _a[0]) || { mime: "" };
    if (result.mime === "application/zip")
        isZip = true;
    if (!isZip)
        return false;
    const zip = await JSZip.loadAsync(arrayBuffer);
    let hasModel = false;
    let hasMoc3 = false;
    let hasTexture = false;
    for (const [relativePath, file] of Object.entries(zip.files)) {
        if (relativePath.startsWith("__MACOSX") || file.dir)
            continue;
        if (relativePath.endsWith('model3.json'))
            hasModel = true;
        if (relativePath.endsWith("moc3"))
            hasMoc3 = true;
        if (relativePath.match(/\.(png|jpg|webp|avif)$/))
            hasTexture = true;
    }
    return hasModel && hasMoc3 && hasTexture;
};
exports.isLive2DZip = isLive2DZip;
const compressLive2DTextures = async (arrayBuffer, maxSize = 8192, quality = 0.8, format = "webp") => {
    var _a, _b;
    let fileType;
    let JSZip;
    try {
        fileType = await Promise.resolve().then(() => __importStar(require("magic-bytes.js"))).then((r) => r.default);
        JSZip = await Promise.resolve().then(() => __importStar(require("jszip"))).then((r) => r.default);
    }
    catch (_c) {
        return Promise.reject("jszip and magic-bytes.js required");
    }
    const result = ((_a = fileType(new Uint8Array(arrayBuffer))) === null || _a === void 0 ? void 0 : _a[0]) || { mime: "" };
    if (result.mime !== "application/zip")
        return arrayBuffer;
    const zip = await JSZip.loadAsync(arrayBuffer);
    const newZip = new JSZip();
    for (const [relativePath, file] of Object.entries(zip.files)) {
        if (relativePath.startsWith("__MACOSX") || file.dir)
            continue;
        if (relativePath.endsWith("model3.json")) {
            const json = JSON.parse(await file.async("string"));
            for (let i = 0; i < ((_b = json.FileReferences.Textures) === null || _b === void 0 ? void 0 : _b.length); i++) {
                const texture = json.FileReferences.Textures[i];
                json.FileReferences.Textures[i] = texture.replace(/\.(png|jpg|webp|avif)$/, `.${format}`);
            }
            newZip.file(relativePath, JSON.stringify(json, null, 4));
        }
        else if (relativePath.match(/\.(png|jpg|webp|avif)$/)) {
            const blob = await file.async("blob");
            const image = await createImageBitmap(blob);
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (image.width > maxSize || image.height > maxSize) {
                const aspectRatio = image.width / image.height;
                if (image.width > image.height) {
                    canvas.width = maxSize;
                    canvas.height = maxSize / aspectRatio;
                }
                else {
                    canvas.height = maxSize;
                    canvas.width = maxSize * aspectRatio;
                }
            }
            else {
                canvas.width = image.width;
                canvas.height = image.height;
            }
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            const newBlob = await new Promise(resolve => canvas.toBlob(resolve, `image/${format}`, quality));
            newZip.file(relativePath.replace(/\.(png|jpg|webp|avif)$/, `.${format}`), newBlob);
        }
        else {
            newZip.file(relativePath, await file.async("arraybuffer"));
        }
    }
    const newBuffer = await newZip.generateAsync({ type: "arraybuffer" });
    return newBuffer;
};
exports.compressLive2DTextures = compressLive2DTextures;
class Live2DCubismModel extends Live2DCubismUserModel_1.Live2DCubismUserModel {
    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }
    emit(event, ...args) {
        if (this.events[event]) {
            this.events[event].forEach(listener => listener(...args));
        }
    }
    off(event, listener) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(l => l !== listener);
        }
    }
    get zoomEnabled() {
        return this.cameraController.zoomEnabled;
    }
    set zoomEnabled(zoomEnabled) {
        this.cameraController.zoomEnabled = zoomEnabled;
    }
    get minScale() {
        return this.cameraController.minScale;
    }
    set minScale(minScale) {
        this.cameraController.minScale = minScale;
    }
    get maxScale() {
        return this.cameraController.maxScale;
    }
    set maxScale(maxScale) {
        this.cameraController.maxScale = maxScale;
    }
    get panSpeed() {
        return this.cameraController.panSpeed;
    }
    set panSpeed(panSpeed) {
        this.cameraController.panSpeed = panSpeed;
    }
    get zoomStep() {
        return this.cameraController.zoomStep;
    }
    set zoomStep(zoomStep) {
        this.cameraController.zoomStep = zoomStep;
    }
    get scale() {
        return this.cameraController.scale;
    }
    set scale(scale) {
        this.cameraController.scale = scale;
    }
    get x() {
        return this.cameraController.x;
    }
    set x(x) {
        this.cameraController.x = x;
    }
    get y() {
        return this.cameraController.y;
    }
    set y(y) {
        this.cameraController.y = y;
    }
    get lipsyncSmoothing() {
        return this.wavController.smoothingFactor;
    }
    set lipsyncSmoothing(lipsyncSmoothing) {
        this.wavController.smoothingFactor = lipsyncSmoothing;
    }
    get volume() {
        return this.wavController.volumeNode.gain.value;
    }
    set volume(volume) {
        this.wavController.volumeNode.gain.value = volume;
    }
    get doubleClickReset() {
        return this.cameraController.doubleClickReset;
    }
    set doubleClickReset(doubleClickReset) {
        this.cameraController.doubleClickReset = doubleClickReset;
    }
    get paused() {
        return this._paused;
    }
    set paused(paused) {
        if (paused)
            this.stopMotions();
        this._paused = paused;
    }
    constructor(canvas, options) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8;
        if (!options)
            options = {};
        super();
        this.events = {};
        this.totalMotionCount = 0;
        this.needsResize = false;
        this.loaded = false;
        this.cubismLoaded = false;
        this.destroy = (destroyCubism = false) => {
            cancelAnimationFrame(id);
            this.motions.clear();
            this.expressions.clear();
            this.eyeBlinkIds.clear();
            this.lipSyncIds.clear();
            this.webGLRenderer.deleteTextures();
            this.webGLRenderer.deleteShader();
            this.touchController.cancelInteractions();
            this.cameraController.removeListeners();
            this.expressionIds = [];
            this.motionIds = [];
            Object.keys(this.events).forEach(event => {
                this.events[event] = [];
            });
            if (this.buffers) {
                this.buffers.modelBuffer = null;
                this.buffers.expressionBuffers = [];
                this.buffers.physicsBuffer = null;
                this.buffers.poseBuffer = null;
                this.buffers.userDataBuffer = null;
                this.buffers.motionGroups = [];
                this.buffers.textureImages = [];
            }
            this.buffers = null;
            this.loaded = false;
            this.cubismLoaded = false;
            this.model.release();
            if (destroyCubism)
                live2dcubismframework_1.CubismFramework.dispose();
        };
        this.loadCubismCore = async () => {
            await new Promise(async (resolve, reject) => {
                if (document.querySelector(`script[src="${this.cubismCorePath}"]`)) {
                    return resolve();
                }
                const script = document.createElement("script");
                script.src = this.cubismCorePath;
                document.body.appendChild(script);
                script.onload = () => resolve();
                script.onerror = (err) => reject(err);
            });
        };
        this.loadFramework = async () => {
            live2dcubismframework_1.CubismFramework.startUp({ logFunction: (msg) => console.log(msg), loggingLevel: 5 });
            live2dcubismframework_1.CubismFramework.initialize();
        };
        this.initializeCubism = async () => {
            await this.loadCubismCore().catch(() => null);
            await this.loadFramework().catch(() => null);
            this.cubismLoaded = true;
        };
        this.loadBuffers = async (link) => {
            var _a;
            let fileType;
            let JSZip;
            try {
                fileType = await Promise.resolve().then(() => __importStar(require("magic-bytes.js"))).then((r) => r.default);
                JSZip = await Promise.resolve().then(() => __importStar(require("jszip"))).then((r) => r.default);
            }
            catch (_b) {
                fileType = null;
                JSZip = null;
            }
            let isZip = false;
            let arrayBuffer = link instanceof ArrayBuffer ? link : new ArrayBuffer(0);
            if (typeof link === "string") {
                isZip = path_1.default.extname(link).replace(".", "") === "zip";
                arrayBuffer = await fetch(link).then(r => r.arrayBuffer()).catch(() => new ArrayBuffer(0));
            }
            if (!arrayBuffer.byteLength)
                return Promise.reject(`Failed to load ${link}`);
            if (fileType) {
                const result = ((_a = fileType(new Uint8Array(arrayBuffer))) === null || _a === void 0 ? void 0 : _a[0]) || { mime: "" };
                if (result.mime === "application/zip")
                    isZip = true;
            }
            let files = {};
            let basename = link instanceof ArrayBuffer ? "." : path_1.default.dirname(link);
            if (isZip && JSZip) {
                const zip = await JSZip.loadAsync(arrayBuffer);
                this.size = arrayBuffer.byteLength;
                for (const [relativePath, file] of Object.entries(zip.files)) {
                    if (relativePath.startsWith("__MACOSX") || file.dir)
                        continue;
                    const key = relativePath.split("/").slice(1).join("/");
                    const contents = await file.async("arraybuffer");
                    files[key] = contents;
                    if (!this.settings && key.endsWith("model3.json"))
                        this.settings = new cubismmodelsettingjson_1.CubismModelSettingJson(contents, contents.byteLength);
                    if (!this.vtubeSettings && key.endsWith("vtube.json"))
                        this.vtubeSettings = JSON.parse(await file.async("string"));
                    if (!this.displayInfo && key.endsWith("cdi3.json"))
                        this.displayInfo = JSON.parse(await file.async("string"));
                }
            }
            else {
                this.settings = new cubismmodelsettingjson_1.CubismModelSettingJson(arrayBuffer, arrayBuffer.byteLength);
            }
            const getBuffer = async (filename) => {
                if (isZip) {
                    let name = filename.startsWith(".") ? filename.split("/").slice(2).join("/") : filename;
                    let buffer = null;
                    for (const [key, value] of Object.entries(files)) {
                        if (key.includes(name)) {
                            buffer = value;
                            break;
                        }
                    }
                    if (!(buffer === null || buffer === void 0 ? void 0 : buffer.byteLength))
                        return Promise.reject(`Failed to load ${name}`);
                    return buffer;
                }
                else {
                    const filePath = path_1.default.join(basename, filename);
                    const buffer = await fetch(filePath).then(r => r.arrayBuffer()).catch(() => new ArrayBuffer(0));
                    if (!buffer.byteLength)
                        return Promise.reject(`Failed to load ${filePath}`);
                    return buffer;
                }
            };
            const getBufferOptional = async (getFilenameFn) => {
                try {
                    const filename = getFilenameFn();
                    return filename ? await getBuffer(filename) : null;
                }
                catch (_a) {
                    return null;
                }
            };
            const getBufferArray = async (count, getFilenameFn) => {
                const buffers = [];
                for (let i = 0; i < count; i++) {
                    buffers.push(await getBuffer(getFilenameFn(i)));
                }
                return buffers;
            };
            const modelBuffer = await getBuffer(this.settings.getModelFileName());
            this.size = modelBuffer.byteLength;
            const physicsBuffer = await getBufferOptional(() => this.settings.getPhysicsFileName());
            const poseBuffer = await getBufferOptional(() => this.settings.getPoseFileName());
            const userDataBuffer = await getBufferOptional(() => this.settings.getUserDataFile());
            const expressionBuffers = [];
            if (this.settings.getExpressionCount()) {
                expressionBuffers.push(...await getBufferArray(this.settings.getExpressionCount(), (i) => this.settings.getExpressionFileName(i)));
                this.expressionIds = Array.from({ length: this.settings.getExpressionCount() }).map((_, i) => this.settings.getExpressionFileName(i));
            }
            else if (this.vtubeSettings) {
                this.expressionIds = this.vtubeSettings.Hotkeys.filter((h) => h.Action === "ToggleExpression").map((e) => e.File);
                expressionBuffers.push(...await getBufferArray(this.expressionIds.length, (i) => this.expressionIds[i]));
            }
            const motionGroups = [];
            if (this.settings.getMotionGroupCount()) {
                for (let i = 0; i < this.settings.getMotionGroupCount(); i++) {
                    const group = this.settings.getMotionGroupName(i);
                    const motionBuffers = await getBufferArray(this.settings.getMotionCount(group), (i) => this.settings.getMotionFileName(group, i));
                    const wavBuffer = await getBufferOptional(() => this.settings.getMotionSoundFileName(group, i));
                    motionGroups.push({ group, motionData: { motionBuffers, wavBuffer } });
                    this.motionIds.push(...Array.from({ length: this.settings.getMotionCount(group) }).map((_, i) => `${group}_${i}`));
                }
            }
            else if (this.vtubeSettings) {
                const motions = [this.vtubeSettings.FileReferences.IdleAnimation];
                motions.push(...this.vtubeSettings.Hotkeys.filter((h) => h.Action === "TriggerAnimation").map((e) => e.File));
                for (let i = 0; i < motions.length; i++) {
                    const buffer = await getBuffer(motions[i]);
                    motionGroups.push({ group: motions[i], motionData: { motionBuffers: [buffer], wavBuffer: null } });
                    this.motionIds.push(`${motions[i]}_0`);
                }
            }
            const textureImages = [];
            for (let i = 0; i < this.settings.getTextureCount(); i++) {
                const filename = this.settings.getTextureFileName(i);
                const buffer = await getBuffer(filename);
                const blob = new Blob([buffer]);
                const url = URL.createObjectURL(blob);
                const img = new Image();
                img.src = url;
                await new Promise((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = (err) => reject(err);
                });
                URL.revokeObjectURL(url);
                textureImages.push(img);
            }
            this.buffers = { modelBuffer, expressionBuffers, physicsBuffer, poseBuffer, userDataBuffer, motionGroups, textureImages };
            return this.buffers;
        };
        this.load = async (link) => {
            var _a;
            if (!this.cubismLoaded)
                await this.initializeCubism();
            const { modelBuffer, physicsBuffer, poseBuffer, userDataBuffer } = await this.loadBuffers(link);
            this.touchController.initInteractions();
            this.cameraController.initListeners();
            this.loadModel(modelBuffer, this._mocConsistency);
            this.initialize();
            await this.expressionController.load();
            if (physicsBuffer) {
                this.loadPhysics(physicsBuffer, physicsBuffer.byteLength);
            }
            if (poseBuffer) {
                this.loadPose(poseBuffer, poseBuffer.byteLength);
            }
            if (this.settings.getEyeBlinkParameterCount() > 0) {
                this.eyeBlink = cubismeyeblink_1.CubismEyeBlink.create(this.settings);
            }
            this.breath = cubismbreath_1.CubismBreath.create();
            const breathParameters = new csmvector_1.csmVector();
            const manager = (_a = live2dcubismframework_1.CubismFramework === null || live2dcubismframework_1.CubismFramework === void 0 ? void 0 : live2dcubismframework_1.CubismFramework.getIdManager) === null || _a === void 0 ? void 0 : _a.call(live2dcubismframework_1.CubismFramework);
            const paramAngleX = manager === null || manager === void 0 ? void 0 : manager.getId(cubismdefaultparameterid_1.CubismDefaultParameterId.ParamAngleX);
            const paramAngleY = manager === null || manager === void 0 ? void 0 : manager.getId(cubismdefaultparameterid_1.CubismDefaultParameterId.ParamAngleY);
            const paramAngleZ = manager === null || manager === void 0 ? void 0 : manager.getId(cubismdefaultparameterid_1.CubismDefaultParameterId.ParamAngleZ);
            const paramBodyAngleX = manager === null || manager === void 0 ? void 0 : manager.getId(cubismdefaultparameterid_1.CubismDefaultParameterId.ParamBodyAngleX);
            const paramBreath = manager === null || manager === void 0 ? void 0 : manager.getId(cubismdefaultparameterid_1.CubismDefaultParameterId.ParamBreath);
            if (paramAngleX)
                breathParameters.pushBack(new cubismbreath_1.BreathParameterData(paramAngleX, 0.0, 15.0, 6.5345, 0.5));
            if (paramAngleY)
                breathParameters.pushBack(new cubismbreath_1.BreathParameterData(paramAngleY, 0.0, 8.0, 3.5345, 0.5));
            if (paramAngleZ)
                breathParameters.pushBack(new cubismbreath_1.BreathParameterData(paramAngleZ, 0.0, 10.0, 5.5345, 0.5));
            if (paramBodyAngleX)
                breathParameters.pushBack(new cubismbreath_1.BreathParameterData(paramBodyAngleX, 0.0, 4.0, 15.5345, 0.5));
            if (paramBreath)
                breathParameters.pushBack(new cubismbreath_1.BreathParameterData(paramBreath, 0.5, 0.5, 3.2345, 1));
            this.breath.setParameters(breathParameters);
            if (userDataBuffer) {
                this.loadUserData(userDataBuffer, userDataBuffer.byteLength);
            }
            const eyeBlinkCount = this.settings.getEyeBlinkParameterCount();
            for (let i = 0; i < eyeBlinkCount; ++i) {
                this.eyeBlinkIds.pushBack(this.settings.getEyeBlinkParameterId(i));
            }
            const lipSyncCount = this.settings.getLipSyncParameterCount();
            for (let i = 0; i < lipSyncCount; ++i) {
                this.lipSyncIds.pushBack(this.settings.getLipSyncParameterId(i));
            }
            if (!lipSyncCount) {
                const index = this.parameters.ids.indexOf("ParamMouthOpenY");
                if (index !== -1)
                    this.lipSyncIds.pushBack(this.model.getParameterId(index));
                this.lipsync = Boolean(this.lipSyncIds.getSize());
            }
            const layout = new csmmap_1.csmMap();
            this.settings.getLayoutMap(layout);
            this.modelMatrix.setupFromLayout(layout);
            await this.motionController.load();
            this.createRenderer();
            await this.loadTextures();
            this.loaded = true;
            this.webGLRenderer.start();
            this.resize();
            this.animationLoop();
            this.centerModel();
        };
        this.loadTextures = async () => {
            const { textureImages } = this.buffers;
            for (let i = 0; i < textureImages.length; i++) {
                const img = textureImages[i];
                this.webGLRenderer.loadTexture(i, img);
            }
        };
        this.resize = () => {
            if (this.keepAspect) {
                const ratio = this.width / this.height;
                if (this.canvas.width / this.canvas.height >= ratio) {
                    this.canvas.height = this.canvas.height;
                    this.canvas.width = this.canvas.height * ratio;
                }
                else {
                    this.canvas.width = this.canvas.width;
                    this.canvas.height = this.canvas.width / ratio;
                }
            }
            else {
                this.canvas.width = this.canvas.clientWidth ? this.canvas.clientWidth : this.canvas.width;
                this.canvas.height = this.canvas.clientHeight ? this.canvas.clientHeight : this.canvas.height;
            }
            const aspectRatio = this.canvas.width / this.canvas.height;
            const logicalHeight = 2;
            const logicalWidth = logicalHeight * aspectRatio;
            this.logicalLeft = -logicalWidth / 2;
            this.logicalRight = logicalWidth / 2;
            this.logicalBottom = -logicalHeight / 2;
            this.logicalTop = logicalHeight / 2;
            this.viewMatrix.setScreenRect(this.logicalLeft, this.logicalRight, this.logicalBottom, this.logicalTop);
            this.viewMatrix.scale(1, 1);
            this.deviceToScreen.loadIdentity();
            const screenScale = logicalHeight / this.canvas.height;
            this.deviceToScreen.scaleRelative(screenScale, -screenScale);
            this.deviceToScreen.translateRelative(-this.canvas.width * 0.5, -this.canvas.height * 0.5);
            this.viewMatrix.setMinScale(this.minScale);
            this.viewMatrix.setMaxScale(this.maxScale);
            this.viewMatrix.setMaxScreenRect(this.logicalLeft, this.logicalRight, this.logicalBottom, this.logicalTop);
        };
        this.updateTime = () => {
            this.currentFrame = performance.now();
            this.deltaTime = (this.currentFrame - this.lastFrame) / 1000;
            this.lastFrame = this.currentFrame;
        };
        this.updateCamera = () => {
            const { x, y, scale } = this.cameraController;
            const logicalX = this.logicalLeft + (x / this.canvas.width) * (this.logicalRight - this.logicalLeft);
            const logicalY = this.logicalTop + (y / this.canvas.height) * (this.logicalTop - this.logicalBottom);
            const centerX = (this.logicalLeft + this.logicalRight) / 2;
            this.viewMatrix.scale(scale, scale);
            this.viewMatrix.translate(centerX - logicalX, this.logicalTop - logicalY * (this.scaledYPos ? scale : 1));
        };
        this.updateProjection = () => {
            const { width, height } = this.canvas;
            const projection = new cubismmatrix44_1.CubismMatrix44();
            const canvasAspect = width / height;
            if (this.model.getCanvasWidth() > 1 && width < height) {
                this.modelMatrix.setWidth(2);
                projection.scale(1, canvasAspect);
            }
            else {
                projection.scale(1 / canvasAspect, 1);
            }
            if (this.viewMatrix) {
                projection.multiplyByMatrix(this.viewMatrix);
            }
            this.projection = projection;
        };
        this.update = () => {
            var _a;
            if (!this.model || this.webGLRenderer.contextLost())
                return;
            this.updateTime();
            this.updateCamera();
            this.updateProjection();
            this.webGLRenderer.prepare();
            this.deltaTime *= this.speed;
            if (this.needsResize) {
                this.resize();
                this.needsResize = false;
            }
            this.model.saveParameters();
            let motionUpdated = this.motionController.update(this.deltaTime);
            this.expressionController.update(this.deltaTime);
            if (!this.paused) {
                this.dragManager.update(this.deltaTime);
                this.dragX = this.dragManager.getX();
                this.dragY = this.dragManager.getY();
                if (!motionUpdated) {
                    if (this.eyeBlink !== null && this.enableEyeblink) {
                        this.eyeBlink.updateParameters(this.model, this.deltaTime);
                    }
                }
                if (this.enableMovement) {
                    const manager = (_a = live2dcubismframework_1.CubismFramework.getIdManager) === null || _a === void 0 ? void 0 : _a.call(live2dcubismframework_1.CubismFramework);
                    const paramAngleX = manager === null || manager === void 0 ? void 0 : manager.getId(cubismdefaultparameterid_1.CubismDefaultParameterId.ParamAngleX);
                    const paramAngleY = manager === null || manager === void 0 ? void 0 : manager.getId(cubismdefaultparameterid_1.CubismDefaultParameterId.ParamAngleY);
                    const paramAngleZ = manager === null || manager === void 0 ? void 0 : manager.getId(cubismdefaultparameterid_1.CubismDefaultParameterId.ParamAngleZ);
                    const paramBodyAngleX = manager === null || manager === void 0 ? void 0 : manager.getId(cubismdefaultparameterid_1.CubismDefaultParameterId.ParamBodyAngleX);
                    const paramEyeBallX = manager === null || manager === void 0 ? void 0 : manager.getId(cubismdefaultparameterid_1.CubismDefaultParameterId.ParamEyeBallX);
                    const paramEyeBallY = manager === null || manager === void 0 ? void 0 : manager.getId(cubismdefaultparameterid_1.CubismDefaultParameterId.ParamEyeBallY);
                    if (paramAngleX)
                        this.model.addParameterValueById(paramAngleX, this.dragX * 30);
                    if (paramAngleY)
                        this.model.addParameterValueById(paramAngleY, this.dragY * 30);
                    if (paramAngleZ)
                        this.model.addParameterValueById(paramAngleZ, this.dragX * this._dragY * -30);
                    if (paramBodyAngleX)
                        this.model.addParameterValueById(paramBodyAngleX, this._dragX * 10);
                    if (paramEyeBallX)
                        this.model.addParameterValueById(paramEyeBallX, this.dragX);
                    if (paramEyeBallY)
                        this.model.addParameterValueById(paramEyeBallY, this.dragY);
                }
                if (this.breath !== null && this.enableBreath) {
                    this.breath.updateParameters(this.model, this.deltaTime);
                }
                if (this.physics !== null && this.enablePhysics) {
                    this.physics.evaluate(this.model, this.deltaTime);
                }
                if (this.lipsync && this.enableLipsync) {
                    this.wavController.update(this.deltaTime);
                    let value = this.wavController.getRms();
                    for (let i = 0; i < this.lipSyncIds.getSize(); ++i) {
                        const parameterIndex = this.model.getParameterIndex(this.lipSyncIds.at(i));
                        const minValue = this.model.getParameterMinimumValue(parameterIndex);
                        const maxValue = this.model.getParameterMaximumValue(parameterIndex);
                        const scaledValue = minValue + (maxValue - minValue) * value;
                        this.model.addParameterValueById(this.lipSyncIds.at(i), scaledValue, 0.8);
                    }
                }
                if (this.pose !== null && this.enablePose) {
                    this.pose.updateParameters(this.model, this.deltaTime);
                }
            }
            this.model.update();
            this.model.loadParameters();
            this.webGLRenderer.draw();
        };
        this.animationLoop = () => {
            this.update();
            if (!this.autoAnimate)
                return;
            const loop = async () => {
                this.update();
                id = window.requestAnimationFrame(loop);
            };
            loop();
        };
        this.stopMotions = () => {
            if (!this.loaded)
                return;
            this.motionController.stopMotions();
        };
        this.startMotion = async (group, i, priority, onStartMotion, onEndMotion) => {
            return this.motionController.startMotion(group, i, priority, onStartMotion, onEndMotion);
        };
        this.startRandomMotion = async (group, priority, onStartMotion, onEndMotion) => {
            return this.motionController.startRandomMotion(group, priority, onStartMotion, onEndMotion);
        };
        this.getExpressions = () => {
            return this.expressionIds;
        };
        this.getMotions = () => {
            return this.motionIds;
        };
        this.hasLipsync = () => {
            return this.lipsync;
        };
        this.setExpression = (expression) => {
            return this.expressionController.setExpression(expression);
        };
        this.setRandomExpression = () => {
            return this.expressionController.setRandomExpression();
        };
        this.inputAudio = async (wavBuffer, playAudio = false) => {
            return this.wavController.start(wavBuffer, playAudio);
        };
        this.stopAudio = () => {
            return this.wavController.stop();
        };
        this.hitTest = (areaName, x, y) => {
            if (!this.loaded)
                return;
            if (this.opacity < 1)
                return;
            for (let i = 0; i < this.settings.getHitAreasCount(); i++) {
                if (this.settings.getHitAreaName(i) == areaName) {
                    const drawId = this.settings.getHitAreaId(i);
                    return this.isHit(drawId, x, y);
                }
            }
        };
        this.isMocConsistent = () => {
            const { modelBuffer } = this.buffers;
            return cubismmoc_1.CubismMoc.hasMocConsistency(modelBuffer);
        };
        this.transformX = (pointX) => {
            const screenX = this.deviceToScreen.transformX(pointX);
            return this.viewMatrix.invertTransformX(screenX);
        };
        this.transformY = (pointY) => {
            const screenY = this.deviceToScreen.transformY(pointY);
            return this.viewMatrix.invertTransformY(screenY);
        };
        this.takeScreenshot = async (format = "png", faceCrop = false) => {
            this.centerModel();
            this.update();
            if (faceCrop) {
                const clonedCanvas = document.createElement("canvas");
                const cropSize = this.canvas.width / 4;
                clonedCanvas.width = cropSize;
                clonedCanvas.height = cropSize;
                const ctx = clonedCanvas.getContext("2d");
                const startX = (this.canvas.width - cropSize) / 2;
                ctx.drawImage(this.canvas, startX, 0, cropSize, cropSize, 0, 0, cropSize, cropSize);
                return clonedCanvas.toDataURL(`image/${format}`);
            }
            else {
                return this.canvas.toDataURL(`image/${format}`);
            }
        };
        this.zoomIn = (factor = 0.1) => {
            return this.cameraController.zoomIn(factor);
        };
        this.zoomOut = (factor = 0.1) => {
            return this.cameraController.zoomOut(factor);
        };
        this.centerModel = () => {
            this.x = this.canvas.width / 2;
            this.y = 0;
            this.update();
            const clonedCanvas = document.createElement("canvas");
            clonedCanvas.width = this.canvas.width / this.scale;
            clonedCanvas.height = this.canvas.height / this.scale;
            const ctx = clonedCanvas.getContext("2d");
            ctx.scale(1 / this.scale, 1 / this.scale);
            ctx.drawImage(this.canvas, 0, 0);
            const imageData = ctx.getImageData(0, 0, clonedCanvas.width, clonedCanvas.height).data;
            let firstNonTransparentY = clonedCanvas.height;
            let lastNonTransparentY = 0;
            for (let y = 0; y < clonedCanvas.height; y++) {
                for (let x = 0; x < clonedCanvas.width; x++) {
                    if (imageData[(y * clonedCanvas.width + x) * 4 + 3] !== 0) {
                        firstNonTransparentY = Math.min(firstNonTransparentY, y);
                        lastNonTransparentY = Math.max(lastNonTransparentY, y);
                    }
                }
            }
            const characterHeight = lastNonTransparentY - firstNonTransparentY;
            let marginHeight = this.canvas.height / 15 / this.scale;
            let centerOffset = (characterHeight / 2) * (this.scale - 1) * this.scale;
            let offsetY = (firstNonTransparentY * (1.5 * this.scale ** this.scale) * (this.scale - 1));
            if (this.scaledYPos) {
                this.y = -firstNonTransparentY * 1.1 + marginHeight + this.appendYOffset;
            }
            else {
                if (this.scale === 1) {
                    offsetY = firstNonTransparentY - this.canvas.height / 15;
                    marginHeight = 0;
                }
                this.y = centerOffset - marginHeight - offsetY + this.appendYOffset;
            }
        };
        this.characterPosition = () => {
            const savedX = this.x;
            const savedY = this.y;
            this.x = this.canvas.width / 2;
            this.y = 0;
            this.update();
            const clonedCanvas = document.createElement("canvas");
            clonedCanvas.width = this.canvas.width / this.scale;
            clonedCanvas.height = this.canvas.height / this.scale;
            const ctx = clonedCanvas.getContext("2d");
            ctx.scale(1 / this.scale, 1 / this.scale);
            ctx.drawImage(this.canvas, 0, 0, clonedCanvas.width, clonedCanvas.height);
            this.x = savedX;
            this.y = savedY;
            const imageData = ctx.getImageData(0, 0, clonedCanvas.width, clonedCanvas.height).data;
            let firstNonTransparentY = clonedCanvas.height;
            let lastNonTransparentY = 0;
            for (let y = 0; y < clonedCanvas.height; y++) {
                for (let x = 0; x < clonedCanvas.width; x++) {
                    if (imageData[(y * clonedCanvas.width + x) * 4 + 3] !== 0) {
                        firstNonTransparentY = Math.min(firstNonTransparentY, y);
                        lastNonTransparentY = Math.max(lastNonTransparentY, y);
                    }
                }
            }
            const characterHeight = lastNonTransparentY - firstNonTransparentY;
            let marginHeight = this.canvas.height / 15;
            return { firstNonTransparentY, lastNonTransparentY, characterHeight, marginHeight };
        };
        this.getParameterName = (parameter) => {
            var _a, _b;
            if (!this.displayInfo)
                return parameter;
            return (_b = (_a = this.displayInfo.Parameters.find((p) => p.Id === parameter)) === null || _a === void 0 ? void 0 : _a.Name) !== null && _b !== void 0 ? _b : parameter;
        };
        this.getPartName = (part) => {
            var _a, _b;
            if (!this.displayInfo)
                return part;
            return (_b = (_a = this.displayInfo.Parts.find((p) => p.Id === part)) === null || _a === void 0 ? void 0 : _a.Name) !== null && _b !== void 0 ? _b : part;
        };
        this.getParameterNames = () => {
            return this.parameters.ids.map((id) => this.getParameterName(id));
        };
        this.getPartNames = () => {
            return this.parts.ids.map((id) => this.getPartName(id));
        };
        this.canvas = canvas;
        this.motions = new csmmap_1.csmMap();
        this.expressions = new csmmap_1.csmMap();
        this.expressionIds = [];
        this.motionIds = [];
        this.textures = new csmvector_1.csmVector();
        this.eyeBlinkIds = new csmvector_1.csmVector();
        this.lipSyncIds = new csmvector_1.csmVector();
        this.viewMatrix = new cubismviewmatrix_1.CubismViewMatrix();
        this.projection = new cubismmatrix44_1.CubismMatrix44();
        this.deviceToScreen = new cubismmatrix44_1.CubismMatrix44();
        this.queueManager = new cubismmotionqueuemanager_1.CubismMotionQueueManager();
        this.cubismCorePath = (_a = options.cubismCorePath) !== null && _a !== void 0 ? _a : "/live2dcubismcore.min.js";
        this.mocConsistency = (_b = options.checkMocConsistency) !== null && _b !== void 0 ? _b : true;
        this.premultipliedAlpha = (_c = options.premultipliedAlpha) !== null && _c !== void 0 ? _c : true;
        this.autoAnimate = (_d = options.autoAnimate) !== null && _d !== void 0 ? _d : true;
        this.autoInteraction = (_e = options.autoInteraction) !== null && _e !== void 0 ? _e : true;
        this.tapInteraction = (_f = options.tapInteraction) !== null && _f !== void 0 ? _f : true;
        this.keepAspect = (_g = options.keepAspect) !== null && _g !== void 0 ? _g : false;
        this.randomMotion = (_h = options.randomMotion) !== null && _h !== void 0 ? _h : true;
        this._paused = (_j = options.paused) !== null && _j !== void 0 ? _j : false;
        this.speed = (_k = options.speed) !== null && _k !== void 0 ? _k : 1;
        this.audioContext = (_l = options.audioContext) !== null && _l !== void 0 ? _l : new AudioContext();
        this.scaledYPos = (_m = options.scaledYPos) !== null && _m !== void 0 ? _m : false;
        this.appendYOffset = (_o = options.appendYOffset) !== null && _o !== void 0 ? _o : 0;
        if (options.maxTextureSize)
            this.maxTextureSize = options.maxTextureSize;
        if (options.connectNode)
            this.connectNode = options.connectNode;
        this.wavController = new WavFileController_1.WavFileController(this);
        this.touchController = new TouchController_1.TouchController(this);
        this.motionController = new MotionController_1.MotionController(this);
        this.expressionController = new ExpressionController_1.ExpressionController(this);
        this.cameraController = new CameraController_1.CameraController(this);
        this.webGLRenderer = new WebGLRenderer_1.WebGLRenderer(this);
        this.cameraController.zoomEnabled = (_p = options.zoomEnabled) !== null && _p !== void 0 ? _p : true;
        this.cameraController.enablePan = (_q = options.enablePan) !== null && _q !== void 0 ? _q : true;
        this.cameraController.doubleClickReset = (_r = options.doubleClickReset) !== null && _r !== void 0 ? _r : true;
        this.cameraController.minScale = (_s = options.minScale) !== null && _s !== void 0 ? _s : 0.1;
        this.cameraController.maxScale = (_t = options.maxScale) !== null && _t !== void 0 ? _t : 10;
        this.cameraController.panSpeed = (_u = options.panSpeed) !== null && _u !== void 0 ? _u : 1;
        this.cameraController.zoomStep = (_v = options.zoomStep) !== null && _v !== void 0 ? _v : 0.005;
        this.cameraController.scale = (_w = options.scale) !== null && _w !== void 0 ? _w : 1;
        this.cameraController.x = (_x = options.x) !== null && _x !== void 0 ? _x : this.canvas.width / 2;
        this.cameraController.y = (_y = options.y) !== null && _y !== void 0 ? _y : 0;
        this.wavController.smoothingFactor = (_z = options.lipsyncSmoothing) !== null && _z !== void 0 ? _z : 0.1;
        this.wavController.volumeNode.gain.value = (_0 = options.volume) !== null && _0 !== void 0 ? _0 : 1;
        this.enablePhysics = (_1 = options.enablePhysics) !== null && _1 !== void 0 ? _1 : true;
        this.enableBreath = (_2 = options.enableBreath) !== null && _2 !== void 0 ? _2 : true;
        this.enableEyeblink = (_3 = options.enableEyeblink) !== null && _3 !== void 0 ? _3 : true;
        this.enableLipsync = (_4 = options.enableLipsync) !== null && _4 !== void 0 ? _4 : true;
        this.enableMotion = (_5 = options.enableMotion) !== null && _5 !== void 0 ? _5 : true;
        this.enableExpression = (_6 = options.enableExpression) !== null && _6 !== void 0 ? _6 : true;
        this.enableMovement = (_7 = options.enableMovement) !== null && _7 !== void 0 ? _7 : true;
        this.enablePose = (_8 = options.enablePose) !== null && _8 !== void 0 ? _8 : true;
        this.updateTime();
    }
}
exports.Live2DCubismModel = Live2DCubismModel;
