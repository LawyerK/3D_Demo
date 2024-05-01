import * as THREE from 'three';

export default class AABB {
    position: THREE.Vector3;
    size: THREE.Vector3;

    constructor(position: THREE.Vector3, size: THREE.Vector3) {
        this.position = position;
        this.size = size;
    }
}