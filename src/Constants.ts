import * as THREE from 'three';

export const Y_AXIS = new THREE.Vector3(0, 1, 0);

export const { PI, SQRT2, E } = Math;
export const SQRT3 = Math.sqrt(3);
export const PI_2 = PI / 2;
export const TAU = 2 * PI;

export const WORLD_SIZE = 50;

export const PLAYER_HALF_WIDTH = 0.3;
export const PLAYER_HEIGHT = 2;
export const PLAYER_EYE_HEIGHT = 1.75;

export const THIRD_PERSON_DEPTH = 5;

export const CROUCH_SPEED = 0.0025;
export const CROUCH_MAG = 0.5;
export const CROUCH_ACCEL_MULT = 0.5;
export const CROUCH_JUMP_MULT = 0.9;

export const DEFAULT_ACCEL = 0.00003;
export const DEFAULT_DRAG = 0.008;

export const AIR_ACCEL = 0.00001;
export const FLY_ACCEL = 0.00005;

export const JUMP_IMPULSE = 0.005;
export const AIR_DRAG = 0.004;
export const GRAVITY = 0.000015;

export function IS_VECTOR_ZERO(vec: THREE.Vector3) {
    return vec.x == 0 && vec.y == 0 && vec.z == 0;
}

/* Returns a new vector holding the orthogonal projection
 * of A onto B. */
export function ORTHOGONAL_PROJECT(a: THREE.Vector3, b: THREE.Vector3) {
    return b.clone().multiplyScalar(a.dot(b) / b.dot(b));
}