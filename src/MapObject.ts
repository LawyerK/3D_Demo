import * as THREE from 'three';
import { DEFAULT_ACCEL, DEFAULT_DRAG } from './Constants';

interface MapObjProps {
    accelCoef: number;
    dragCoef: number;
};

const DEFAULT_PROPERTIES: MapObjProps = {
    accelCoef: DEFAULT_ACCEL,
    dragCoef: DEFAULT_DRAG
};

/* Normals of a cube are unit vectors I, J and K */
const UNIT_VECTORS = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1)
];

const CUBE_VERTICES = [
    new THREE.Vector3(1, 1, 1),
    new THREE.Vector3(1, 1, -1),
    new THREE.Vector3(1, -1, 1),
    new THREE.Vector3(1, -1, -1),
    new THREE.Vector3(-1, 1, 1),
    new THREE.Vector3(-1, 1, -1),
    new THREE.Vector3(-1, -1, 1),
    new THREE.Vector3(-1, -1, -1),
];

export type SATResult = [collides: boolean, offset: THREE.Vector3];

const SAT_NO_COLLISION: SATResult = [false, new THREE.Vector3()];

/* Map objects represent a collidable object in the world.
 * Only cubes/OBB are supported as of now. */
export default class MapObject {
    vertices: Array<THREE.Vector3> = [];
    normals: Array<THREE.Vector3> = [];

    position: THREE.Vector3;
    scale: THREE.Vector3;
    properties: MapObjProps;

    constructor(position: THREE.Vector3, scale: THREE.Vector3, rotation = new THREE.Quaternion(), properties = DEFAULT_PROPERTIES) {
        this.position = position;
        this.scale = scale;
        this.properties = properties;

        /* Initialize the arrays */
        for (let i = 0; i < CUBE_VERTICES.length; i++) {
            this.vertices[i] = new THREE.Vector3();
        }

        for (let i = 0; i < UNIT_VECTORS.length; i++) {
            this.normals[i] = new THREE.Vector3();
        }

        /* Set their values */
        this.update(rotation);
    }

    update(rotation: THREE.Quaternion) {
        const { vertices, normals } = this;

        for (let i = 0; i < CUBE_VERTICES.length; i++) {
            vertices[i]
                .copy(CUBE_VERTICES[i])
                .applyQuaternion(rotation);
        }

        for (let i = 0; i < UNIT_VECTORS.length; i++) {
            normals[i]
                .copy(UNIT_VECTORS[i])
                .applyQuaternion(rotation);
        }
    }

    getProjectedBounds(vertices: Array<THREE.Vector3>, position: THREE.Vector3, scale: THREE.Vector3, axis: THREE.Vector3) {
        const worldVertex = new THREE.Vector3();
        let max = -Infinity,
            min = Infinity;

        for (const vertex of vertices) {
            worldVertex.copy(vertex)
                .multiply(scale)
                .add(position);

            /* Vector projection of worldVertex onto axis.
             * Specifically the constant portion. */
            const c = worldVertex.dot(axis) / axis.dot(axis);

            /* Get max/min bounds along this
             * axis/line in R3 */
            max = Math.max(max, c);
            min = Math.min(min, c);
        }

        return [max, min];
    }

    SAT(their: MapObject): SATResult {
        const axes: Array<THREE.Vector3> = [];

        for (const normal of this.normals) {
            axes.push(normal);
        }

        for (const normal of their.normals) {
            axes.push(normal);
        }

        for (const theirNormal of this.normals) {
            for (const ourNormal of their.normals) {
                axes.push(
                    new THREE.Vector3()
                        .crossVectors(
                            ourNormal,
                            theirNormal
                        )
                );
            }
        }

        /* Perform the tests! 15 axes to test
         * (in the worst-case)
         * TODO: Optimization. Don't test
         * parallel axes. */

        let offsetVec = new THREE.Vector3();
        let leastOverlap = Infinity;

        for (const axis of axes) {
            const [theirMax, theirMin] = this.getProjectedBounds(
                their.vertices, their.position,
                their.scale, axis
            );
            const [ourMax, ourMin] = this.getProjectedBounds(
                this.vertices, this.position,
                this.scale, axis
            );

            const smallerMax = theirMax < ourMax ? theirMax : ourMax;
            const largerMin = theirMin > ourMin ? theirMin : ourMin;
            const sign = theirMax > ourMax ? -1 : 1;
            const overlap = smallerMax - largerMin;

            /* Early exit if any axis shows separation */
            if (overlap < 0) {
                return SAT_NO_COLLISION;
            }

            /* The axis with the smallest overlap
             * tells us what direction and amount
             * the position must be adjusted by
             * to resolve the collision. */
            if (overlap < leastOverlap) {
                leastOverlap = overlap;
                offsetVec.copy(axis)
                    .multiplyScalar(
                        overlap * sign
                    );
            }
        }

        /* Floating point imprecision? */
        if (leastOverlap == 0)
            return SAT_NO_COLLISION;

        return [true, offsetVec];
    }
}
