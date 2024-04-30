import * as THREE from 'three';

export const Y_AXIS = new THREE.Vector3(0, 1, 0);
export const PI = Math.PI;

export const WORLD_SIZE = 50;

export const PLAYER_WIDTH = 0.5;
export const PLAYER_HEIGHT = 2;
export const PLAYER_EYE_HEIGHT = 1.75;

export const THIRD_PERSON_DEPTH = 5;

export const CROUCH_SPEED = 0.0025;
export const CROUCH_MAG = 0.5;
export const CROUCH_ACCEL_MULT = 0.5;

export const GROUND_ACCEL = 0.00003;
export const AIR_ACCEL = 0.00001;
export const FLY_ACCEL = 0.00005;

export const JUMP_IMPULSE = 0.005;
export const GROUND_DRAG_COEF = 0.008;
export const AIR_DRAG_COEF = 0.004;
export const GRAVITY = 0.000015;
