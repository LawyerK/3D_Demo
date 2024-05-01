import * as THREE from 'three';
import SettingsManager from './Settings';
import Controls from './Controls';
import {
    PI, GROUND_ACCEL, GROUND_DRAG_COEF, PLAYER_HEIGHT,
    Y_AXIS, GRAVITY, JUMP_IMPULSE, AIR_ACCEL,
    AIR_DRAG_COEF, CROUCH_MAG, CROUCH_SPEED, FLY_ACCEL,
    CROUCH_ACCEL_MULT, PLAYER_EYE_HEIGHT, THIRD_PERSON_DEPTH,
    WORLD_SIZE, PLAYER_HALF_WIDTH,
    CROUCH_JUMP_MULT
} from './Constants';
import MapObject from './MapObject';

/* Move direction mapped by unique combination of forward/backward/left/right keys. */
const dirs = [PI / 4, PI / 2, 3 * PI / 4, 0, 0, PI, -PI / 4, -PI / 2, -3 * PI / 4];

const FIRST_PERSON = 0;
// const THIRD_PERSON_FRONT = 1;
const THIRD_PERSON_BACK = 1; //2;

export default class Player {
    camera: THREE.PerspectiveCamera;
    controls: Controls;
    settings: SettingsManager;
    objects: Array<MapObject>;

    material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    geometry = new THREE.BoxGeometry(
        2 * PLAYER_HALF_WIDTH,
        PLAYER_HEIGHT,
        2 * PLAYER_HALF_WIDTH
    );
    mesh = new THREE.Mesh(this.geometry, this.material);
    object = new THREE.Object3D();

    velocity = new THREE.Vector3();
    position = new THREE.Vector3();

    size = new THREE.Vector3(PLAYER_HALF_WIDTH, PLAYER_HEIGHT / 2, PLAYER_HALF_WIDTH);
    aabb = new MapObject(this.position, this.size);

    perspective: number = 0;
    crouchVal: number = 0;

    IS_FLYING = false;
    ON_GROUND = true;

    constructor(camera: THREE.PerspectiveCamera, controls: Controls, settings: SettingsManager, objects: Array<MapObject>) {
        this.camera = camera;
        this.controls = controls;
        this.settings = settings;
        this.objects = objects;

        controls.registerKeyHandler('G', this.changePerspective.bind(this));
        controls.registerKeyHandler('F', this.toggleFly.bind(this));

        this.initPlayerObject();
    }

    initPlayerObject() {
        const { object, controls, camera, geometry, material, mesh } = this;
        const { object: controlsObject } = controls;

        geometry.translate(0, PLAYER_HEIGHT / 2, 0);
        geometry.computeBoundingSphere();
        material.colorWrite = false;
        material.depthWrite = false;
        mesh.castShadow = true;

        controlsObject.add(camera);
        object.add(controlsObject);
        object.add(mesh);
    }

    changePerspective(isKeyDown: number) {
        const { camera, material } = this;

        if (!isKeyDown)
            return;

        this.perspective = (this.perspective + 1) % 2; // 3;

        switch (this.perspective) {
            case FIRST_PERSON:
                camera.position.z = 0;
                camera.rotation.y = 0;
                material.colorWrite = false;
                material.depthWrite = false;
                break;

            // case THIRD_PERSON_FRONT:
            //     camera.position.z = -THIRD_PERSON_DEPTH;
            //     camera.rotation.y = Math.PI;
            //     material.colorWrite = true;
            //     material.depthWrite = true;
            //     break;

            case THIRD_PERSON_BACK:
                camera.position.z = THIRD_PERSON_DEPTH;
                camera.rotation.y = 0;
                material.colorWrite = true;
                material.depthWrite = true;
                break;
        }
    }

    toggleFly(isKeyDown: number) {
        if (!isKeyDown)
            return;

        this.IS_FLYING = !this.IS_FLYING;
        this.ON_GROUND = false;
    }

    getAccelConst() {
        const { controls, settings, IS_FLYING, ON_GROUND } = this;
        const keybinds = settings.getKeybinds();

        let accel = AIR_ACCEL;

        if (IS_FLYING) {
            accel = FLY_ACCEL;
        } else if (ON_GROUND) {
            accel = GROUND_ACCEL;
        }

        const isCrouching = controls.isKeyDown(keybinds.CROUCH);
        if (isCrouching && !IS_FLYING) {
            accel *= CROUCH_ACCEL_MULT;
        }

        return accel;
    }

    getAcceleration() {
        const { camera, controls, settings, IS_FLYING } = this;
        const keybinds = settings.getKeybinds();

        const moveDir = new THREE.Vector3();

        const forward_backward =
            controls.isKeyDown(keybinds.MOVE_BACKWARD) -
            controls.isKeyDown(keybinds.MOVE_FORWARD);
        const left_right =
            controls.isKeyDown(keybinds.MOVE_RIGHT) -
            controls.isKeyDown(keybinds.MOVE_LEFT);

        if (forward_backward || left_right) {
            /* First re-map from range [-1, 1] to range [0, 2]
             * Then scale the 2nd quantity so there's no overlap
             * Result is a distinct number in range [0, 8]
             * This number represenst one of 8 distinct
             * move directions stored in an array. */
            const index = (forward_backward + 1) + 3 * (left_right + 1);
            const wishDir = dirs[index];

            /* Get camera's direction vector */
            camera.getWorldDirection(moveDir);

            /* We do not want y-component to affect movement */
            moveDir.y = 0;

            /* Rotate moveDir vector moveDir degrees around 
             * the y-axis to get final movement direction  */
            moveDir.applyAxisAngle(Y_AXIS, wishDir);
        }

        if (IS_FLYING) {
            const up_down =
                controls.isKeyDown(keybinds.JUMP) -
                controls.isKeyDown(keybinds.CROUCH);
            moveDir.y = up_down;
        }

        /* Now we have a vector pointing in the direction
         * we wish to move in. Set its length to */
        const accelMagnitude = this.getAccelConst();
        const acceleration = moveDir
            .setLength(accelMagnitude);

        return acceleration;
    }

    getDragCoefficient() {
        const { ON_GROUND } = this;

        let dragCoef = AIR_DRAG_COEF;

        if (ON_GROUND) {
            /* TODO: Once proper collision is added, 
             * have ground drag be a property of the
             * material the player is standing on. */
            dragCoef = GROUND_DRAG_COEF;
        }

        return dragCoef;
    }

    /* Apply drag force proportional to velocity at current time
     * Mass of player is currently implicitly assumed to be 1.
     * F=MA => A=F/M M=1 thus A=F */
    applyFriction(acceleration: THREE.Vector3, velocity: THREE.Vector3) {
        const dragCoef = this.getDragCoefficient();
        const dragForce = velocity.clone()
            .negate()
            .multiplyScalar(dragCoef);

        if (!this.IS_FLYING)
            dragForce.y = 0;

        acceleration.add(dragForce);
    }

    /* These kinematics equations are technically not valid
     * due to the application of a drag force proportional
     * to velocity.
     * TODO: Experiment with how wrong they are. 
     * Consider switching to some basic exponential
     * decay on velocity. */
    updatePosition(delta: number) {
        const { object, position, velocity, controls, settings, ON_GROUND, IS_FLYING } = this;
        const keybinds = settings.getKeybinds();

        /* Get acceleration. This is only a function of 
         * the movement keys pressed during this frame. */
        const acceleration = this.getAcceleration();
        this.applyFriction(acceleration, velocity);

        /* Don't want gravity if flying. */
        if (!IS_FLYING)
            acceleration.y -= GRAVITY;

        const crouchDown = controls.isKeyDown(keybinds.CROUCH);
        const jumpDown = controls.isKeyDown(keybinds.JUMP);

        if (!IS_FLYING && ON_GROUND && jumpDown) {
            const jumpMult = crouchDown ? CROUCH_JUMP_MULT : 1;
            this.velocity.y = JUMP_IMPULSE * jumpMult;
            this.ON_GROUND = false;
        }

        /* Calculate final position via
         * x(t) = x0 + v*t + 0.5*a*t^2 */
        const deltaPos = velocity.clone()
            .multiplyScalar(delta)
            .add(
                acceleration.clone()
                    .multiplyScalar(0.5 * delta ** 2)
            );
        position.add(deltaPos);

        /* Update velocity via the
         * formula v(t) = v0 + a*t */
        velocity.add(
            acceleration.clone()
                .multiplyScalar(delta)
        );

        /* Keep player inside world borders
         * Center of player is at feet level! */
        const boundX = WORLD_SIZE / 2 - PLAYER_HALF_WIDTH;
        const boundY = WORLD_SIZE / 2 - PLAYER_HEIGHT;
        const MAX_POS = new THREE.Vector3(boundX, boundY, boundX);
        const MIN_POS = new THREE.Vector3(-boundX, -0.001, -boundX);
        this.position = position.clamp(MIN_POS, MAX_POS);
    }

    handleCollisions() {
        const { objects, position, velocity, size } = this;

        const test = (vec: THREE.Vector3) =>
            vec.x > 0 && vec.y > 0 && vec.z > 0;

        const theirMax = new THREE.Vector3(),
            ourMax = new THREE.Vector3(),
            theirMin = new THREE.Vector3(),
            ourMin = new THREE.Vector3(),
            test1 = new THREE.Vector3(),
            test2 = new THREE.Vector3();

        /* Player positition is at feet level.
         * We want this at our center point
         * for collision resolution. */
        const ourPosition = position.clone()
            .add(new THREE.Vector3(0, size.y, 0));

        for (const object of objects) {
            theirMin.copy(object.position).sub(object.size);
            theirMax.copy(object.position).add(object.size);
            ourMax.copy(ourPosition).add(size);
            ourMin.copy(ourPosition).sub(size);

            test1.copy(ourMax).sub(theirMin);
            test2.copy(theirMax).sub(ourMin);

            /* We can only be considered colliding if
             * ALL tests show that we are colliding.
             * This is the "separating axis theorem." */
            const collides = test(test1) && test(test2);

            if (collides) {
                /* Resolving the collision is as simple as
                 * finding which yielded the smallest distance */
                const vals = [
                    test1.x, test1.y, test1.z,
                    test2.x, test2.y, test2.z
                ];
                const signs = [-1, -1, -1, 1, 1, 1];
                const keys = [0, 1, 2, 0, 1, 2];

                let smallestIndex = 0;
                let smallestVal = Infinity;

                for (let i = 0; i < 6; i++) {
                    if (vals[i] < smallestVal) {
                        smallestVal = vals[i];
                        smallestIndex = i;
                    }
                }

                const sign = signs[smallestIndex];
                const key = keys[smallestIndex];

                if (smallestIndex == 1 || smallestIndex == 4) {
                    this.ON_GROUND = true;
                }

                position.setComponent(key,
                    position.getComponent(key) + sign * smallestVal
                );

                velocity.setComponent(key, 0);
            }
        }
    }

    update(dt: number) {
        const { settings, controls, object, mesh, position, size, IS_FLYING } = this;
        const { object: controlsObject } = controls;
        const keybinds = settings.getKeybinds();

        const isCrouching =
            +!IS_FLYING && controls.isKeyDown(keybinds.CROUCH);

        if (isCrouching) {
            this.crouchVal = Math.min(
                this.crouchVal + CROUCH_SPEED * dt,
                CROUCH_MAG
            );
        } else {
            this.crouchVal = Math.max(
                this.crouchVal - CROUCH_SPEED * dt,
                0
            );
        }

        controlsObject.position.y = PLAYER_EYE_HEIGHT - this.crouchVal;
        mesh.scale.y = (1 - this.crouchVal / PLAYER_HEIGHT);
        size.y = (PLAYER_HEIGHT - this.crouchVal) / 2;

        this.updatePosition(dt);
        this.handleCollisions();

        /* Set player to the new position. */
        object.position.copy(position);
    }
}