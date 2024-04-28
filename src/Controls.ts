import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import * as THREE from 'three';

export default class Controls {
    controls: PointerLockControls;

    // 1-1 correspondence between these arrays
    keys = ['W', 'A', 'S', 'D', 'SHIFT', ' ', 'F'];
    keysDown = [0, 0, 0, 0, 0, 0, 0];

    constructor(camera: THREE.Camera, renderElem: HTMLElement) {
        this.controls = new PointerLockControls(camera, renderElem);
        this.addEventListeners(renderElem);
    }

    addEventListeners(renderElem: HTMLElement) {
        // Handle pointer lock
        renderElem.addEventListener('click', () => {
            this.controls.lock();
        });

        this.controls.addEventListener('unlock', () => {
            this.keysDown.fill(0);
        });

        // Handle movement keys
        document.body.addEventListener('keydown', e => this.handleKey(e, 1), true);
        document.body.addEventListener('keyup', e => this.handleKey(e, 0), true);
    }

    handleKey(e: KeyboardEvent, val: number) {
        const { controls, keys, keysDown } = this;

        if (!controls.isLocked)
            return;

        const index = keys.indexOf(e.key.toUpperCase());
        if (index != -1)
            keysDown[index] = val;

        e.stopPropagation();
        e.preventDefault();
    }
}