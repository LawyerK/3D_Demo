import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import * as THREE from 'three';

type KeydownHandler = (val: number) => void;

export default class Controls {
    controls: PointerLockControls;

    keyHandlers = new Map<String, KeydownHandler>();
    keysDown = new Map<String, number>();

    constructor(camera: THREE.Camera, renderElem: HTMLElement) {
        this.controls = new PointerLockControls(camera, renderElem);
        this.addEventListeners(renderElem);
    }

    addEventListeners(renderElem: HTMLElement) {
        renderElem.addEventListener('click', () => {
            this.controls.lock();
        });

        this.controls.addEventListener('unlock', () => {
            this.keysDown.forEach((_, key) => {
                this.keysDown.set(key, 0);
            });
        });

        document.body.addEventListener('keydown', e => this.handleKey(e, 1), true);
        document.body.addEventListener('keyup', e => this.handleKey(e, 0), true);
    }

    handleKey(e: KeyboardEvent, val: number) {
        const { controls, keysDown } = this;

        if (!controls.isLocked)
            return;

        const key = e.key.toUpperCase();

        const keyHandler = this.keyHandlers.get(key);
        if (keyHandler)
            keyHandler(val);

        keysDown.set(key, val);

        e.stopPropagation();
        e.preventDefault();
    }

    registerKeyHandler(key: string, handler: KeydownHandler) {
        this.keyHandlers.set(key, handler);
    }

    isKeyDown(key: String) {
        return this.keysDown.get(key) || 0;
    }
}