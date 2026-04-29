"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Live2DCubismUserModel = void 0;
const cubismusermodel_1 = require("../framework/src/model/cubismusermodel");
class Live2DCubismUserModel extends cubismusermodel_1.CubismUserModel {
    constructor() {
        super();
        this.getParameterValue = (parameter) => {
            const index = this.parameters.ids.indexOf(parameter);
            return this.model.getParameterValueByIndex(index);
        };
        this.setParameter = (parameter, value) => {
            const index = this.parameters.ids.indexOf(parameter);
            this.model.setParameterValueByIndex(index, value);
            this.model.update();
        };
        this.resetParameters = () => {
            for (let i = 0; i < this.parameters.defaultValues.length; i++) {
                this.model.setParameterValueByIndex(i, this.parameters.defaultValues[i]);
            }
            this.model.update();
        };
        this.getPartOpacity = (part) => {
            const index = this.parts.ids.indexOf(part);
            return this.model.getPartOpacityByIndex(index);
        };
        this.setPartOpacity = (part, opacity) => {
            const index = this.parts.ids.indexOf(part);
            this.model.setPartOpacityByIndex(index, opacity);
            this.model.update();
        };
        this.resetPartOpacities = () => {
            for (let i = 0; i < this.defaultPartOpacities.length; i++) {
                this.model.setPartOpacityByIndex(i, this.defaultPartOpacities[i]);
            }
            this.model.update();
        };
    }
    initialize() {
        this.model.initialize();
        // @ts-ignore
        this.defaultPartOpacities = structuredClone(this.parts.opacities);
    }
    get accelerationX() {
        return this._accelerationX;
    }
    set accelerationX(accelerationX) {
        this._accelerationX = accelerationX;
    }
    get accelerationY() {
        return this._accelerationY;
    }
    set accelerationY(accelerationY) {
        this._accelerationY = accelerationY;
    }
    get accelerationZ() {
        return this._accelerationZ;
    }
    set accelerationZ(accelerationZ) {
        this._accelerationZ = accelerationZ;
    }
    get breath() {
        return this._breath;
    }
    set breath(breath) {
        this._breath = breath;
    }
    get dragManager() {
        return this._dragManager;
    }
    set dragManager(dragManager) {
        this._dragManager = dragManager;
    }
    get dragX() {
        return this._dragX;
    }
    set dragX(dragX) {
        this._dragX = dragX;
    }
    get dragY() {
        return this._dragY;
    }
    set dragY(dragY) {
        this._dragY = dragY;
    }
    get expressionManager() {
        return this._expressionManager;
    }
    set expressionManager(expressionManager) {
        this._expressionManager = expressionManager;
    }
    get eyeBlink() {
        return this._eyeBlink;
    }
    set eyeBlink(eyeBlink) {
        this._eyeBlink = eyeBlink;
    }
    get initialized() {
        return this._initialized;
    }
    set initialized(initialized) {
        this._initialized = initialized;
    }
    get lastLipSyncValue() {
        return this._lastLipSyncValue;
    }
    set lastLipSyncValue(lastLipSyncValue) {
        this._lastLipSyncValue = lastLipSyncValue;
    }
    get lipsync() {
        return this._lipsync;
    }
    set lipsync(lipsync) {
        this._lipsync = lipsync;
    }
    get moc() {
        return this.moc;
    }
    set moc(moc) {
        this._moc = moc;
    }
    get mocConsistency() {
        return this._mocConsistency;
    }
    set mocConsistency(mocConsistency) {
        this._mocConsistency = mocConsistency;
    }
    get modelMatrix() {
        return this._modelMatrix;
    }
    set modelMatrix(modelMatrix) {
        this._modelMatrix = modelMatrix;
    }
    get modelUserData() {
        return this._modelUserData;
    }
    set modelUserData(modelUserData) {
        this._modelUserData = modelUserData;
    }
    get model() {
        return this._model;
    }
    set model(model) {
        this._model = model;
    }
    get motionManager() {
        return this._motionManager;
    }
    set motionManager(motionManager) {
        this._motionManager = motionManager;
    }
    get opacity() {
        return this._opacity;
    }
    set opacity(opacity) {
        this._opacity = opacity;
    }
    get pose() {
        return this._pose;
    }
    set pose(pose) {
        this._pose = pose;
    }
    get physics() {
        return this._physics;
    }
    set physics(physics) {
        this._physics = physics;
    }
    get updating() {
        return this._updating;
    }
    set updating(updating) {
        this._updating = updating;
    }
    get parameters() {
        const model = this.model;
        return model._model.parameters;
    }
    get parts() {
        const model = this.model;
        return model._model.parts;
    }
    get drawables() {
        const model = this.model;
        return model._model.drawables;
    }
    get width() {
        const model = this.model;
        return model._model.canvasinfo.CanvasWidth;
    }
    get height() {
        const model = this.model;
        return model._model.canvasinfo.CanvasHeight;
    }
    get originX() {
        const model = this.model;
        return model._model.canvasinfo.CanvasOriginX;
    }
    get originY() {
        const model = this.model;
        return model._model.canvasinfo.CanvasOriginY;
    }
    get pixelsPerUnit() {
        const model = this.model;
        return model._model.canvasinfo.PixelsPerUnit;
    }
}
exports.Live2DCubismUserModel = Live2DCubismUserModel;
