"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpressionController = void 0;
const acubismmotion_1 = require("../framework/src/motion/acubismmotion");
class ExpressionController {
    constructor(model) {
        this.load = async () => {
            const { expressionBuffers } = this.model.buffers;
            for (let i = 0; i < expressionBuffers.length; i++) {
                const name = this.model.expressionIds[i];
                const expressionBuffer = expressionBuffers[i];
                const motion = this.model.loadExpression(expressionBuffer, expressionBuffer.byteLength, name);
                if (this.model.expressions.getValue(name) !== null) {
                    acubismmotion_1.ACubismMotion.delete(this.model.expressions.getValue(name));
                    this.model.expressions.setValue(name, null);
                }
                this.model.expressions.setValue(name, motion);
            }
        };
        this.update = (deltaTime) => {
            if (this.model.expressionManager != null && this.model.enableExpression) {
                this.model.expressionManager.updateMotion(this.model.model, deltaTime);
            }
        };
        this.setExpression = (expression) => {
            const motion = this.model.expressions.getValue(expression);
            if (motion !== null)
                this.model.expressionManager.startMotion(motion, false);
        };
        this.setRandomExpression = () => {
            if (!this.model.expressions.getSize())
                return;
            const rand = Math.floor(Math.random() * this.model.expressions.getSize());
            const name = this.model.expressions._keyValues[rand].first;
            this.setExpression(name);
        };
        this.model = model;
    }
}
exports.ExpressionController = ExpressionController;
