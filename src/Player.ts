import * as THREE from 'three';
import Box3D from './Box3D';
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

// Move direction mapped by unique combination of forward/backward/left/right keys.
const dirs = [PI / 4, PI / 2, 3 * PI / 4, 0, 0, PI, -PI / 4, -PI / 2, -3 * PI / 4];

const FIRST_PERSON = 0;
// const THIRD_PERSON_FRONT = 1;
const THIRD_PERSON_BACK = 1; //2;

export default class Player {
    camera: THREE.PerspectiveCamera;
    controls: Controls;
    settings: SettingsManager;
    objects: Array<Box3D>;
    material: THREE.MeshBasicMaterial;
    mesh: THREE.Mesh;
    collisionObj: Box3D;

    object = new THREE.Object3D();
    velocity = new THREE.Vector3();
    position = new THREE.Vector3();

    perspective: number = 0;
    crouchVal: number = 0;

    IS_FLYING = false;
    ON_GROUND = true;

    constructor(camera: THREE.PerspectiveCamera, controls: Controls, settings: SettingsManager, objects: Array<Box3D>) {
        this.camera = camera;
        this.controls = controls;
        this.settings = settings;
        this.objects = objects;

        const scale = new THREE.Vector3(PLAYER_HALF_WIDTH, PLAYER_HEIGHT / 2, PLAYER_HALF_WIDTH);
        this.collisionObj = new Box3D(this.position, scale);

        controls.registerKeyHandler('G', this.changePerspective.bind(this));
        controls.registerKeyHandler('F', this.toggleFly.bind(this));

        this.initPlayerObject();
    }

    initPlayerObject() {
        const { object, controls, camera } = this;
        const { object: controlsObject } = controls;

        const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
        const geometry = new THREE.BoxGeometry(
            2 * PLAYER_HALF_WIDTH,
            PLAYER_HEIGHT,
            2 * PLAYER_HALF_WIDTH
        );
        const mesh = new THREE.Mesh(geometry, material);

        geometry.translate(0, PLAYER_HEIGHT / 2, 0);
        material.colorWrite = false;
        material.depthWrite = false;
        mesh.castShadow = true;

        controlsObject.add(camera);
        object.add(controlsObject);
        object.add(mesh);

        this.material = material;
        this.mesh = mesh;
    }

    changePerspective(isKeyDown: number) {
        const { camera, material } = this;

        if (!isKeyDown)
            return;

        this.perspective = (this.perspective + 1) % 2; //3;

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
            const up_down =
                controls.isKeyDown(keybinds.JUMP) -
                controls.isKeyDown(keybinds.CROUCH);
            moveDir.y = up_down;
        }

        // Now we have a vector pointing in the direction
        // we wish to move in. Set its length to 
        const accelMagnitude = this.getAccelConst();
        const acceleration = moveDir
            .setLength(accelMagnitude);

        return acceleration;
    }

    getDragCoefficient() {
        const { ON_GROUND } = this;

        let dragCoef = AIR_DRAG_COEF;

        if (ON_GROUND) {
            // TODO: Once proper collision is added, 
            // have ground drag be a property of the
            // material the player is standing on.
            dragCoef = GROUND_DRAG_COEF;
        }

        return dragCoef;
    }

    // Apply drag force proportional to velocity at current time
    // Mass of player is currently implicitly assumed to be 1.
    // F=MA => A=F/M M=1 thus A=F
    applyFriction(acceleration: THREE.Vector3, velocity: THREE.Vector3) {
        const dragCoef = this.getDragCoefficient();
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
        const { object, position, velocity, controls, settings, ON_GROUND, IS_FLYING } = this;
        const keybinds = settings.getKeybinds();

        // Get acceleration. This is only a function of 
        // the movement keys pressed during this frame. 
        const acceleration = this.getAcceleration();
        this.applyFriction(acceleration, velocity);

        // Don't want gravity if we're on ground 
        // (it cancels) or flying.
        if (!ON_GROUND && !IS_FLYING)
            acceleration.y -= GRAVITY;

        const crouchDown = controls.isKeyDown(keybinds.CROUCH);
        const jumpDown = controls.isKeyDown(keybinds.JUMP);

        if (!IS_FLYING && ON_GROUND && jumpDown) {
            const jumpMult = crouchDown ? CROUCH_JUMP_MULT : 1;
            this.velocity.y = JUMP_IMPULSE * jumpMult;
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
            if (!IS_FLYING) {
                this.ON_GROUND = true;
            }
            position.y = 0;
        }

        // Keep player inside world borders
        // Center of player is at feet level!
        const boundX = WORLD_SIZE / 2 - PLAYER_HALF_WIDTH;
        const boundY = WORLD_SIZE / 2 - PLAYER_HEIGHT;
        const MAX_POS = new THREE.Vector3(boundX, boundY, boundX);
        const MIN_POS = new THREE.Vector3(-boundX, 0, -boundX);
        this.position = position.clamp(MIN_POS, MAX_POS);

        // Set player to the new position.
        object.position.copy(position);
    }

    checkCollisions() {
        // TODO: Use separating axis theorem. 
        // Will add support for OBB and allow
        // for actual collision resolution.

        // for (const object of this.objects) {
        // const collides = object.collides(this.collisionObj);
        // }
    }

    update(dt: number) {
        const { settings, controls, mesh, IS_FLYING } = this;
        const { object: controlsObject } = controls;
        const keybinds = settings.getKeybinds();

        const isCrouching = +!IS_FLYING && controls.isKeyDown(keybinds.CROUCH);

        if (isCrouching) {
            this.crouchVal = Math.min(this.crouchVal + CROUCH_SPEED * dt, CROUCH_MAG);
        } else {
            this.crouchVal = Math.max(this.crouchVal - CROUCH_SPEED * dt, 0);
        }

        controlsObject.position.y = PLAYER_EYE_HEIGHT - this.crouchVal;
        mesh.scale.y = (1 - this.crouchVal / PLAYER_HEIGHT);

        this.updatePosition(dt);
        this.checkCollisions();
    }
}