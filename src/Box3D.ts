import * as THREE from 'three';

function isFirstOctant(vec: THREE.Vector3) {
    return vec.x < 0 && vec.y < 0 && vec.z < 0;
}

export default class Box3D {
    position: THREE.Vector3;
    size: THREE.Vector3;

    constructor(position: THREE.Vector3, size: THREE.Vector3) {
        this.position = position;
        this.size = size;
    }

    collides(object: Box3D) {
        const their_min = object.position.clone().sub(object.size);
        const their_max = object.position.clone().add(object.size);
        const our_min = this.position.clone().sub(this.size);
        const our_max = this.position.clone().add(this.size);

        const test1 = their_min.sub(our_max);
        const test2 = our_min.sub(their_max);

        return isFirstOctant(test1) && isFirstOctant(test2);
    }
}