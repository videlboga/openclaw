"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CameraController = void 0;
class CameraController {
    constructor(model) {
        this.zoomIn = (factor = 0.1) => {
            if (!this.zoomEnabled)
                return;
            const zoomFactor = 1 + factor;
            const newScale = Math.min(this.scale * zoomFactor, this.maxScale);
            const worldX = (this.x - this.model.canvas.width / 2) / this.scale;
            const worldY = this.y / this.scale;
            this.scale = newScale;
            this.x = this.model.canvas.width / 2 + worldX * this.scale;
            this.y = worldY * this.scale;
        };
        this.zoomOut = (factor = 0.1) => {
            if (!this.zoomEnabled)
                return;
            const zoomFactor = 1 - factor;
            const newScale = Math.max(this.scale * zoomFactor, this.minScale);
            const worldX = (this.x - this.model.canvas.width / 2) / this.scale;
            const worldY = this.y / this.scale;
            this.scale = newScale;
            this.x = this.model.canvas.width / 2 + worldX * this.scale;
            this.y = worldY * this.scale;
        };
        this.handleMouseDown = (event) => {
            if (!this.enablePan)
                return;
            this.isPanning = true;
            this.lastPosition = { x: event.clientX, y: event.clientY };
        };
        this.handleMouseMove = (event) => {
            if (!this.enablePan)
                return;
            if (this.isPanning) {
                const dx = event.clientX - this.lastPosition.x;
                const dy = event.clientY - this.lastPosition.y;
                this.x -= dx * this.panSpeed;
                this.y += dy * this.panSpeed;
                this.lastPosition = { x: event.clientX, y: event.clientY };
            }
        };
        this.handleMouseUp = () => {
            if (!this.enablePan)
                return;
            this.isPanning = false;
        };
        this.handleWheel = (event) => {
            if (!this.zoomEnabled)
                return;
            event.preventDefault();
            const delta = event.deltaY;
            const scaleFactor = Math.pow(2, -delta * this.zoomStep);
            const newScale = Math.max(this.minScale, Math.min(this.scale * scaleFactor, this.maxScale));
            const bounds = this.model.canvas.getBoundingClientRect();
            const mouseX = bounds.width - (event.clientX - bounds.left);
            const mouseY = (event.clientY - bounds.top) - (bounds.height / 2);
            const worldX = (mouseX - this.x) / this.scale;
            const worldY = (mouseY - this.y) / this.scale;
            this.scale = newScale;
            this.x = mouseX - worldX * newScale;
            this.y = mouseY - worldY * newScale;
        };
        this.handleDoubleClick = () => {
            if (this.doubleClickReset) {
                this.x = this.model.canvas.width / 2;
                this.y = 0;
                this.isPanning = false;
                this.lastPosition = { x: 0, y: 0 };
                this.scale = 1;
                this.model.centerModel();
            }
        };
        this.addListeners = () => {
            this.model.canvas.addEventListener("wheel", this.handleWheel);
            this.model.canvas.addEventListener("mousedown", this.handleMouseDown);
            window.addEventListener("mousemove", this.handleMouseMove);
            window.addEventListener("mouseup", this.handleMouseUp);
            this.model.canvas.addEventListener("dblclick", this.handleDoubleClick);
            this.model.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
        };
        this.removeListeners = () => {
            this.model.canvas.removeEventListener("wheel", this.handleWheel);
            this.model.canvas.removeEventListener("mousedown", this.handleMouseDown);
            window.removeEventListener("mousemove", this.handleMouseMove);
            window.removeEventListener("mouseup", this.handleMouseUp);
            this.model.canvas.removeEventListener("dblclick", this.handleDoubleClick);
            this.model.canvas.removeEventListener("contextmenu", (event) => event.preventDefault());
        };
        this.initListeners = () => {
            this.removeListeners();
            this.addListeners();
        };
        this.model = model;
        this.x = model.canvas.width / 2;
        this.y = 0;
        this.scale = 1;
        this.minScale = 0.1;
        this.maxScale = 10;
        this.isPanning = false;
        this.lastPosition = { x: 0, y: 0 };
        this.zoomStep = 0.005;
        this.panSpeed = 1;
    }
}
exports.CameraController = CameraController;
