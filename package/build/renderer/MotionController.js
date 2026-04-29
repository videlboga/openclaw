"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MotionController = void 0;
const cubismmotionqueuemanager_1 = require("../framework/src/motion/cubismmotionqueuemanager");
const acubismmotion_1 = require("../framework/src/motion/acubismmotion");
const types_1 = require("./types");
class MotionController {
    constructor(model) {
        this.load = async () => {
            const { motionGroups } = this.model.buffers;
            for (let i = 0; i < motionGroups.length; i++) {
                const group = motionGroups[i].group;
                const motionBuffers = motionGroups[i].motionData.motionBuffers;
                const name = `${group}_${i}`;
                for (let i = 0; i < motionBuffers.length; i++) {
                    const motionBuffer = motionBuffers[i];
                    const motion = this.model.loadMotion(motionBuffer, motionBuffer.byteLength, name, null, null, this.model.settings, group, i);
                    if (motion !== null) {
                        motion.setEffectIds(this.model.eyeBlinkIds, this.model.lipSyncIds);
                        if (this.model.motions.getValue(name) !== null) {
                            acubismmotion_1.ACubismMotion.delete(this.model.motions.getValue(name));
                        }
                        this.model.motions.setValue(name, motion);
                    }
                    else {
                        this.model.totalMotionCount--;
                    }
                }
            }
            this.model.motionManager.stopAllMotions();
        };
        this.update = (deltaTime) => {
            let motionUpdated = false;
            this.model.model.loadParameters();
            if (this.model.motionManager.isFinished()) {
                if (!this.model.paused && this.model.enableMotion) {
                    if (this.model.randomMotion) {
                        this.startRandomMotion(null, types_1.MotionPriority.Idle);
                    }
                    else {
                        this.startMotion("Idle", 1, types_1.MotionPriority.Idle);
                    }
                }
            }
            else {
                motionUpdated = this.model.motionManager.updateMotion(this.model.model, deltaTime);
            }
            this.model.model.saveParameters();
            return motionUpdated;
        };
        this.stopMotions = () => {
            this.model.motionManager.stopAllMotions();
        };
        this.startMotion = async (group, i, priority, onStartMotion, onEndMotion) => {
            if (priority === types_1.MotionPriority.Force) {
                this.model.motionManager.setReservePriority(priority);
            }
            else if (!this.model.motionManager.reserveMotion(priority)) {
                return cubismmotionqueuemanager_1.InvalidMotionQueueEntryHandleValue;
            }
            const { motionGroups } = this.model.buffers;
            const motionGroup = motionGroups.find((motion) => motion.group === group);
            if (!motionGroup)
                return;
            const { motionBuffers, wavBuffer } = motionGroup.motionData;
            const name = `${group}_${i}`;
            let motion = this.model.motions.getValue(name);
            let autoDelete = false;
            if (motion === null) {
                const motionBuffer = motionBuffers[i];
                motion = this.model.loadMotion(motionBuffer, motionBuffer.byteLength, null, onEndMotion, onStartMotion, this.model.settings, group, i);
                if (!motion)
                    return;
                motion.setEffectIds(this.model.eyeBlinkIds, this.model.lipSyncIds);
                autoDelete = true;
            }
            else {
                motion.setBeganMotionHandler(onStartMotion);
                motion.setFinishedMotionHandler(onEndMotion);
            }
            if (wavBuffer) {
                this.model.wavController.start(wavBuffer);
            }
            return this.model.motionManager.startMotionPriority(motion, autoDelete, priority);
        };
        this.startRandomMotion = async (group, priority, onStartMotion, onEndMotion) => {
            var _a, _b;
            if (!this.model.loaded)
                return;
            const { motionGroups } = this.model.buffers;
            if (!group) {
                const randGroup = Math.floor(Math.random() * motionGroups.length);
                group = (_a = motionGroups[randGroup]) === null || _a === void 0 ? void 0 : _a.group;
            }
            let motionCount = (_b = motionGroups.find((g) => g.group === group)) === null || _b === void 0 ? void 0 : _b.motionData.motionBuffers.length;
            if (!motionCount)
                return;
            const rand = Math.floor(Math.random() * motionCount);
            return this.startMotion(group, rand, priority, onStartMotion, onEndMotion);
        };
        this.model = model;
    }
}
exports.MotionController = MotionController;
