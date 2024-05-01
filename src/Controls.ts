import * as THREE from 'three';
import { PI_2 } from './Constants';

type KeydownHandler = (val: number) => void;

export default class Controls {
    domElement: HTMLElement;

    object = new THREE.Object3D();
    isLocked = false;

    pointerSpeed = 1.0;
    maxAngle = Math.PI;
    minAngle = 0;

    keyHandlers = new Map<String, KeydownHandler>();
    keysDown = new Map<String, number>();

    constructor(domElement: HTMLElement) {
        this.domElement = domElement;
        this.addEventListeners();
    }

    addEventListeners() {
        const { domElement } = this;

        domElement.addEventListener('click',
            () => this.pointerLock(), true
        );

        document.addEventListener('mousemove',
            e => this.handleMouse(e), true
        );

        document.addEventListener('pointerlockchange',
            e => this.handleChange(e), true
        );

        document.addEventListener('keydown',
            e => this.handleKey(e, 1), true
        );

        document.addEventListener('keyup',
            e => this.handleKey(e, 0), true
        );
    }

    pointerLock() {
        const { domElement } = this;
        domElement.requestPointerLock();
    }

    pointerUnlock() {
        const { ownerDocument } = this.domElement;
        ownerDocument.exitPointerLock();
    }

    handleChange(e: Event) {
        this.isLocked =
            document.pointerLockElement == this.domElement;

        if (!this.isLocked) {
            this.keysDown.forEach((_, key) => {
                this.keysDown.set(key, 0);
            });
        }
    }

    handleMouse(event: MouseEvent) {
        const { isLocked, object, pointerSpeed, maxAngle, minAngle } = this;
        const { movementX, movementY } = event;

        if (!isLocked)
            return;

        const e = new THREE.Euler(0, 0, 0, 'YXZ');

        e.setFromQuaternion(object.quaternion);

        e.y -= movementX * 0.002 * pointerSpeed;
        e.x -= movementY * 0.002 * pointerSpeed;

        e.x = Math.max(
            PI_2 - maxAngle,
            Math.min(
                PI_2 - minAngle,
                e.x
            )
        );

        object.quaternion.setFromEuler(e);
    }

    handleKey(e: KeyboardEvent, val: number) {
        const { isLocked, keysDown } = this;

        if (!isLocked)
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