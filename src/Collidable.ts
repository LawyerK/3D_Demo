import * as THREE from 'three';
import { IS_VECTOR_ZERO } from './Constants';

interface CollidableProps {
    static: boolean,
    restitution: number;
    μs: number;
    μk: number;
};

const DEFAULT_PROPERTIES: CollidableProps = {
    static: true,
    restitution: 1,
    μs: 0.8,
    μk: 0.4,
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
export default class Collidable {
    private vertices: Array<THREE.Vector3> = [];
    private normals: Array<THREE.Vector3> = [];

    private position: THREE.Vector3;
    private scale: THREE.Vector3;
    private properties: CollidableProps;
    private sleeping: boolean = false;

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

    getProperties() {
        return this.properties;
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

    /* Returns the min/max vertices after projection
     * onto `axis`. */
    getProjectedBounds(axis: THREE.Vector3) {
        const { vertices, scale, position } = this;

        const worldVertex = new THREE.Vector3();
        let max = -Infinity,
            min = Infinity;

        for (const vertex of vertices) {
            worldVertex.copy(vertex)
                .multiply(scale)
                .add(position);

            /* Orthogonal projection of worldVertex onto axis.
             * Specifically the constant. */
            const c = worldVertex.dot(axis) / axis.dot(axis);

            /* Get max/min bounds along this
             * axis/line in R3 */
            max = Math.max(max, c);
            min = Math.min(min, c);
        }

        return [max, min];
    }

    /* Returns whether `vector` is parallel to 
     * any of our normals.
     * Optionally skips testing one of our normals. */
    parallel(vector: THREE.Vector3, skipIndex = -1) {
        for (let i = 0, l = this.normals.length; i < l; i++) {
            if (i === skipIndex) {
                continue;
            }

            const crossProduct = new THREE.Vector3()
                .crossVectors(
                    this.normals[i],
                    vector
                );

            if (IS_VECTOR_ZERO(crossProduct)) {
                return true;
            }
        }

        return false;
    }

    /* Returns the set of cross products 
     * between our normals and `vector`
     * that must be tested for the S.A.T. */
    getCrossProducts(vector: THREE.Vector3) {
        const crossProducts = [];
        let i = 0;

        for (const normal of this.normals) {
            const crossProduct = new THREE.Vector3()
                .crossVectors(
                    normal,
                    vector
                );

            if (
                !IS_VECTOR_ZERO(crossProduct) &&
                !this.parallel(crossProduct, i)
            ) {
                crossProducts.push(
                    crossProduct
                );
            }

            i++;
        }

        return crossProducts;
    }

    /* Perform the Separating Axis Theorem. */
    SAT(their: Collidable): SATResult {
        const axes: Array<THREE.Vector3> = [];

        /* First push our normals to be tested
         * These are guaranteed to be linearly 
         * independent for obvious reasons. */
        for (const ourNormal of this.normals) {
            axes.push(ourNormal);
        }

        /* Now we have to consider their normals
         * and all 9 cross products. We only
         * need to test linearly independent
         * axes. */
        for (const theirNormal of their.normals) {
            const crossProducts = this.getCrossProducts(theirNormal);

            if (crossProducts.length === this.normals.length) {
                axes.push(theirNormal);
            }

            axes.push(...crossProducts);
        }

        /* Perform the tests! 15 axes to test
         * in the worst-case. */

        let offsetVec = new THREE.Vector3();
        let leastOverlap = Infinity;

        for (const axis of axes) {
            const [theirMax, theirMin] = their.getProjectedBounds(axis);
            const [ourMax, ourMin] = this.getProjectedBounds(axis);

            const candidates = [ourMax - theirMin, theirMax - ourMin];

            for (let i = 0; i < candidates.length; i++) {
                const overlap = candidates[i];

                /* Early exit if any axis shows separation. */
                if (overlap < 0) {
                    return SAT_NO_COLLISION;
                }

                /* The axis with the smallest overlap
                 * tells us the direction and amount */
                if (overlap < leastOverlap) {
                    leastOverlap = overlap;
                    offsetVec.copy(axis)
                        .multiplyScalar(
                            overlap * (i * 2 - 1)
                        );
                }
            }
        }

        /* Floating point imprecision? */
        if (leastOverlap === 0)
            return SAT_NO_COLLISION;

        return [true, offsetVec];
    }
}
