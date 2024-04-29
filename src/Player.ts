import * as THREE from 'three';
import Box3D from './Box3D';

import { PI, GROUND_ACCEL, GROUND_DRAG_COEF, MAX_SPEED, PLAYER_HEIGHT, PLAYER_WIDTH, Y_AXIS, GRAVITY, JUMP_IMPULSE, AIR_ACCEL, AIR_DRAG_COEF } from './Constants';
import Controls from './Controls';

// Move direction mapped by unique combination of forward/backward/left/right keys.
const dirs = [PI / 4, PI / 2, 3 * PI / 4, 0, 0, PI, -PI / 4, -PI / 2, -3 * PI / 4];

export default class Player {
    camera: THREE.PerspectiveCamera;
    collisionObj: Box3D;
    controls: Controls;
    objects: Array<Box3D>;

    object = new THREE.Object3D();
    velocity = new THREE.Vector3();
    position = new THREE.Vector3();

    ON_GROUND = true;

    get IS_FLYING() {
        return this.controls.keysDown[6];
    }

    constructor(camera: THREE.PerspectiveCamera, controls: Controls, objects: Array<Box3D>) {
        this.camera = camera;
        this.controls = controls;
        this.objects = objects;

        const scale = new THREE.Vector3(PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_WIDTH);
        this.collisionObj = new Box3D(this.position, scale);

        camera.position.y = PLAYER_HEIGHT;
        this.object.add(camera);
    }

    getAcceleration() {
        const { camera, controls, IS_FLYING, ON_GROUND } = this;
        const { keysDown } = controls;

        const moveDir = new THREE.Vector3();

        const forward_backward = keysDown[2] - keysDown[0]; // BACK - FORWARD
        const left_right = keysDown[3] - keysDown[1]; // RIGHT - LEFT

        if (forward_backward || left_right) {
            // First re-map from range [-1, 1] to range [0, 2]
            // Then scale the 2nd quantity so there's no overlap
            // Result is a distinct number in range [0, 8]
            // This number represenst one of 8 distinct
            // move directions stored in an array.
            const index = (forward_backward + 1) + 3 * (left_right + 1);
            const wishDir = dirs[index];

            // Get camera's direction vector
            camera.getWorldDirection(moveDir);

            // We do not want y-component to affect movement
            moveDir.y = 0;

            // Rotate moveDir vector moveDir degrees around 
            // the y-axis to get final movement direction 
            moveDir.applyAxisAngle(Y_AXIS, wishDir);
        }

        if (IS_FLYING) {
            const up_down = keysDown[5] - keysDown[4]; // UP - DOWN
            moveDir.y = up_down;
        }

        // Now we have a vector pointing in the direction
        // we wish to move in. Set its length to GROUND_ACCEL
        // and this now represents our acceleration vector.
        const accel = ON_GROUND ? GROUND_ACCEL : AIR_ACCEL;
        const acceleration = moveDir.setLength(accel);

        return acceleration;
    }

    // Apply drag force proportional to velocity at current time
    // Mass of player is currently implicitly assumed to be 1.
    // F=MA => A=F/M M=1 thus A=F
    applyFriction(velocity: THREE.Vector3, acceleration: THREE.Vector3) {
        // TODO: Once proper collision is added, have ground drag be a property
        // of the material the player is standing on.
        const dragCoef = this.ON_GROUND ? GROUND_DRAG_COEF : AIR_DRAG_COEF;
        const dragForce = velocity.clone()
            .negate()
            .multiplyScalar(dragCoef);

        if (!this.IS_FLYING)
            dragForce.y = 0;

        acceleration.add(dragForce);
    }

    // These kinematics equations are technically not valid
    // due to the application of a drag force proportional
    // to velocity.
    updatePosition(delta: number) {
        const { object, position, velocity, ON_GROUND, IS_FLYING } = this;
        const { keysDown } = this.controls;

        // Get acceleration. This is only a function of 
        // the movement keys pressed during this frame. 
        const acceleration = this.getAcceleration();

        // Apply friction/drag
        this.applyFriction(velocity, acceleration);

        // If not on ground and not flying, 
        // appply gravity.
        if (!ON_GROUND && !IS_FLYING)
            acceleration.y -= GRAVITY;

        // If not flying, on ground, and jump key pressed
        // then apply upward "jump" impulse
        if (!IS_FLYING && ON_GROUND && keysDown[5]) {
            this.velocity.y = JUMP_IMPULSE;
            this.ON_GROUND = false;
        }

        // Calculate final position via
        // x(t) = x0 + v*t + 0.5*a*t^2
        const deltaPos = velocity.clone()
            .multiplyScalar(delta)
            .add(
                acceleration.clone()
                    .multiplyScalar(0.5 * delta ** 2)
            );
        position.add(deltaPos);

        // Update velocity via the
        // formula v(t) = v0 + a*t
        velocity.add(
            acceleration.clone()
                .multiplyScalar(delta)
        );

        // Simulate floor
        if (position.y < 0) {
            this.ON_GROUND = true;
            position.y = 0;
        }

        // Set player to the new position.
        object.position.copy(position);
    }

    checkCollisions() {
        // TODO: Use separating axis theorem. 
        // Will add support for OBB and allow
        // for actual collision resolution.
        for (const object of this.objects) {
            const collides = object.collides(this.collisionObj);
            if (collides) console.log('COLLIDES.');
        }
    }

    update(delta: number) {
        this.updatePosition(delta);
        this.checkCollisions();
    }
}