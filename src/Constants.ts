import * as THREE from 'three';

export const Y_AXIS = new THREE.Vector3(0, 1, 0);

export const { PI, SQRT2, E } = Math;
export const SQRT3 = Math.sqrt(3);
export const PI_2 = PI / 2;
export const TAU = 2 * PI;

export const WORLD_SIZE = 50;

export const PLAYER_WIDTH = 0.6;
export const PLAYER_HEIGHT = 2;
export const PLAYER_EYE_OFFSET = 0.25;

export const THIRD_PERSON_DEPTH = 5;

export const CROUCH_SPEED = 0.0025;
export const CROUCH_MAG = 0.5;
export const CROUCH_MOVE_MULT = 0.5;
export const CROUCH_JUMP_MULT = 0.9;

export const MAX_SLOPE = 0.2;

/* Physics constants */

export const GRAVITY = new THREE.Vector3(0, -1.5 / 1e5, 0);
export const PLAYER_MASS = 1;

export const GROUND_MOVE = 3 / 1e5;
export const AIR_MOVE = 1 / 1e5;
export const FLY_MOVE = 5 / 1e5;

export const AIR_DRAG = 400 / 1e5;

export const JUMP_IMPULSE = 500 / 1e5;

/* Floting point imprecision has to be dealth with */
export function IS_VECTOR_ZERO(vec: THREE.Vector3, epsilon = 0.000001) {
    return Math.abs(vec.x) <= epsilon &&
        Math.abs(vec.y) <= epsilon &&
        Math.abs(vec.z) <= epsilon;
}

/* Returns a new vector holding the orthogonal projection
 * of A onto B. */
export function ORTHOGONAL_PROJECT(a: THREE.Vector3, b: THREE.Vector3) {
    return b.clone().multiplyScalar(a.dot(b) / b.dot(b));
}

export function FIX_IMPRECISION(vec: THREE.Vector3, epsilon = 1e-8) {
    if (Math.abs(vec.x) < epsilon)
        vec.x = 0;
    if (Math.abs(vec.y) < epsilon)
        vec.y = 0;
    if (Math.abs(vec.z) < epsilon)
        vec.z = 0;
    return vec;
}