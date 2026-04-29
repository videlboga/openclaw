"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TouchController = void 0;
const types_1 = require("./types");
class TouchController {
    constructor(model) {
        this.touchStart = (posX, posY) => {
            this.startX = this.lastX = posX;
            this.startY = this.lastY = posY;
        };
        this.touchMove = (posX, posY) => {
            this.lastX = posX;
            this.lastY = posY;
        };
        this.getFlickDistance = () => {
            return this.calculateDistance(this.startX, this.startY, this.lastX, this.lastY);
        };
        this.calculateDistance = (x1, y1, x2, y2) => {
            return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
        };
        this.calculateMovingAmount = (x1, x2) => {
            if ((x1 > 0) !== (x2 > 0))
                return 0;
            return Math.sign(x1) * Math.min(Math.abs(x1), Math.abs(x2));
        };
        this.pointerDown = (event) => {
            if (this.model.paused)
                return;
            const rect = this.model.canvas.getBoundingClientRect();
            const posX = event.clientX - rect.left;
            const posY = event.clientY - rect.top;
            this.touchStart(posX, posY);
        };
        this.pointerMove = (event) => {
            if (this.model.paused)
                return;
            const rect = this.model.canvas.getBoundingClientRect();
            const posX = event.clientX - rect.left;
            const posY = event.clientY - rect.top;
            const x = this.model.transformX(this.lastX);
            const y = this.model.transformY(this.lastY);
            this.touchMove(posX, posY);
            this.model.setDragging(x, y);
        };
        this.pointerUp = (event) => {
            if (this.model.paused)
                return;
            const rect = this.model.canvas.getBoundingClientRect();
            const posX = event.clientX - rect.left;
            const posY = event.clientY - rect.top;
            this.model.setDragging(0, 0);
            const x = this.model.transformX(posX);
            const y = this.model.transformY(posY);
            if (this.model.tapInteraction)
                this.tap(x, y);
        };
        this.tap = (x, y) => {
            if (this.model.hitTest("Head", x, y)) {
                this.model.setRandomExpression();
            }
            else if (this.model.hitTest("Body", x, y)) {
                this.model.startRandomMotion("TapBody", types_1.MotionPriority.Normal);
            }
            let hitAreas = [];
            for (let i = 0; i < this.model.settings.getHitAreasCount(); i++) {
                const drawId = this.model.settings.getHitAreaId(i);
                if (this.model.isHit(drawId, x, y)) {
                    hitAreas.push(drawId.getString().s);
                }
            }
            this.model.emit("hit", hitAreas, x, y);
        };
        this.startInteractions = () => {
            if (!this.model.autoInteraction)
                return;
            document.addEventListener("pointerdown", this.pointerDown, { passive: true });
            document.addEventListener("pointermove", this.pointerMove, { passive: true });
            document.addEventListener("pointerup", this.pointerUp, { passive: true });
            document.addEventListener("pointercancel", this.pointerUp, { passive: true });
        };
        this.cancelInteractions = () => {
            document.removeEventListener("pointerdown", this.pointerDown);
            document.removeEventListener("pointermove", this.pointerMove);
            document.removeEventListener("pointerup", this.pointerUp);
            document.removeEventListener("pointercancel", this.pointerUp);
        };
        this.initInteractions = () => {
            this.cancelInteractions();
            this.startInteractions();
        };
        this.model = model;
        this.startX = this.startY = 0;
        this.lastX = this.lastY = 0;
    }
}
exports.TouchController = TouchController;
