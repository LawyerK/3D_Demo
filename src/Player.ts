import * as THREE from 'three';
import SettingsManager from './Settings';
import Controls from './Controls';
import Collidable from './Collidable';
import {
    PI,
    PLAYER_HEIGHT,
    Y_AXIS,
    GRAVITY,
    JUMP_IMPULSE,
    AIR_MOVE,
    AIR_DRAG,
    CROUCH_MAG,
    CROUCH_SPEED,
    FLY_MOVE,
    CROUCH_MOVE_MULT,
    THIRD_PERSON_DEPTH,
    WORLD_SIZE,
    CROUCH_JUMP_MULT,
    ORTHOGONAL_PROJECT,
    MAX_SLOPE,
    PLAYER_MASS,
    PLAYER_WIDTH,
    PLAYER_EYE_OFFSET,
    GROUND_MOVE,
    FIX_IMPRECISION
} from './Constants';

/* Move direction mapped by unique combination of forward/backward/left/right keys. */
const dirs = [PI / 4, PI / 2, 3 * PI / 4, 0, 0, PI, -PI / 4, -PI / 2, -3 * PI / 4];

const FIRST_PERSON = 0;
// const THIRD_PERSON_FRONT = 1;
const THIRD_PERSON_BACK = 1; //2;

export default class Player {
    camera: THREE.PerspectiveCamera;
    controls: Controls;
    settings: SettingsManager;
    objects: Array<Collidable>;

    material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    geometry = new THREE.BoxGeometry(
        PLAYER_WIDTH,
        PLAYER_HEIGHT,
        PLAYER_WIDTH
    );
    mesh = new THREE.Mesh(this.geometry, this.material);
    object = new THREE.Object3D();

    lastAcceleration = new THREE.Vector3();
    contactForces = new THREE.Vector3();
    velocity = new THREE.Vector3();
    position = new THREE.Vector3();

    size = new THREE.Vector3(PLAYER_WIDTH / 2, PLAYER_HEIGHT / 2, PLAYER_WIDTH / 2);
    collider = new Collidable(this.position, this.size);

    perspective: number = 0;
    crouchVal: number = 0;

    /* Toggleable - manually controlled */
    IS_FLYING = false;
    /* True if feet are in contact with
     * a collidable, false otherwise */
    ON_GROUND = true;
    /* True if ON_GROUND and surface 
     * is not too steep. */
    CAN_JUMP = true;

    arrowHelpers = [
        new THREE.ArrowHelper(undefined, undefined, undefined, 0xff0000),
        new THREE.ArrowHelper(undefined, undefined, undefined, 0x00ff00)
    ];

    constructor(camera: THREE.PerspectiveCamera, controls: Controls, settings: SettingsManager, objects: Array<Collidable>) {
        this.camera = camera;
        this.controls = controls;
        this.settings = settings;
        this.objects = objects;

        controls.registerKeyHandler('G', this.changePerspective.bind(this));
        controls.registerKeyHandler('F', this.toggleFly.bind(this));

        this.initPlayerObject();
    }

    initPlayerObject() {
        const { position, object, controls, camera, material, mesh } = this;
        const controlsObject = controls.getObject();

        position.set(0, PLAYER_HEIGHT / 2, 0);

        material.colorWrite = false;
        material.depthWrite = false;
        mesh.castShadow = true;

        controlsObject.add(camera);
        object.add(controlsObject);
        object.add(mesh);

        for (const ah of this.arrowHelpers) {
            object.add(ah);
        }
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
    }

    getMoveForceMagnitude() {
        const { controls, settings, IS_FLYING, ON_GROUND } = this;
        const keybinds = settings.getKeybinds();

        let magnitude = AIR_MOVE;

        if (IS_FLYING) {
            magnitude = FLY_MOVE;
        } else if (ON_GROUND) {
            magnitude = GROUND_MOVE;
        }

        if (!IS_FLYING) {
            const isCrouching = controls.isKeyDown(keybinds.CROUCH);
            if (isCrouching) {
                magnitude *= CROUCH_MOVE_MULT;
            }
        }

        return magnitude;
    }

    getMoveForce() {
        const { camera, controls, settings, IS_FLYING } = this;
        const keybinds = settings.getKeybinds();

        const forward_backward =
            controls.isKeyDown(keybinds.MOVE_BACKWARD) -
            controls.isKeyDown(keybinds.MOVE_FORWARD);
        const left_right =
            controls.isKeyDown(keybinds.MOVE_RIGHT) -
            controls.isKeyDown(keybinds.MOVE_LEFT);

        const moveForce = new THREE.Vector3();

        if (forward_backward || left_right) {
            /* First re-map from range [-1, 1] to range [0, 2]
             * Then scale the 2nd quantity so there's no overlap
             * Result is a distinct number in range [0, 8]
             * This number represenst one of 8 distinct
             * move directions stored in an array. */
            const index = (forward_backward + 1) + 3 * (left_right + 1);
            const wishDir = dirs[index];

            /* Get camera's direction vector */
            camera.getWorldDirection(moveForce);

            /* We do not want y-component to affect movement */
            moveForce.y = 0;

            /* Rotate moveDir vector moveDir degrees around 
             * the y-axis to get final movement direction  */
            moveForce.applyAxisAngle(Y_AXIS, wishDir);
        }

        if (IS_FLYING) {
            const up_down =
                controls.isKeyDown(keybinds.JUMP) -
                controls.isKeyDown(keybinds.CROUCH);
            moveForce.y = up_down;
        }

        /* Now we have a vector pointing in the direction
         * we wish to move in. Set its length. */
        const magnitude = this.getMoveForceMagnitude();
        moveForce.setLength(magnitude);

        return moveForce;
    }

    getDragForce() {
        const { velocity, IS_FLYING } = this;

        const dragForce = velocity.clone()
            .negate()
            .multiplyScalar(AIR_DRAG);

        if (!IS_FLYING)
            dragForce.y = 0;

        return dragForce;
    }

    handleJump() {
        const { controls, settings, IS_FLYING, CAN_JUMP, velocity } = this;
        const keybinds = settings.getKeybinds();

        const crouchDown = controls.isKeyDown(keybinds.CROUCH);
        const jumpDown = controls.isKeyDown(keybinds.JUMP);

        if (!IS_FLYING && CAN_JUMP && jumpDown) {
            const jumpMult = crouchDown ? CROUCH_JUMP_MULT : 1;
            velocity.y = JUMP_IMPULSE * jumpMult;
        }
    }

    getNetForce(includeDrag = true) {
        const { contactForces, IS_FLYING } = this;

        const moveForce = this.getMoveForce();
        const dragForce = this.getDragForce();
        const netForce = new THREE.Vector3()
            .add(contactForces)
            .add(moveForce);

        if (includeDrag) {
            netForce.add(dragForce);
        }

        if (!IS_FLYING) {
            netForce.add(GRAVITY)
        }

        // FIX_IMPRECISION(netForce, 1e-8);

        return netForce;
    }

    updatePosition(dt: number) {
        const { position, velocity, lastAcceleration } = this;

        // const acceleration = this.getNetForce()
        //     .divideScalar(PLAYER_MASS);

        /* use last position, velocity, and acceleration
         * to calculate new position. */
        position.add(
            velocity.clone()
                .multiplyScalar(dt)
                .add(
                    lastAcceleration.clone()
                        .multiplyScalar(0.5 * dt ** 2)
                )
        );
    }

    doThingThing(normal: THREE.Vector3) {
        const netForce = this.getNetForce();

        /* Projection of netForce onto surface normal */
        const normalMag = -netForce.dot(normal);
        const normalForce = normal.clone()
            .multiplyScalar(
                normalMag
            );
        /* Orthogonal component of netForce */
        const ortho = netForce.clone()
            .add(normalForce);

        console.log(ortho);
    }

    handleCollision(object: Collidable, normal: THREE.Vector3) {
        const { velocity, contactForces } = this;
        const { μs, μk } = object.properties;

        const netForce = this.getNetForce(false);

        /* Projection of netForce onto surface normal */
        const normalMag = -netForce.dot(normal);
        const normalForce = normal.clone()
            .multiplyScalar(
                normalMag
            );
        /* Orthogonal component of netForce */
        const ortho = netForce.clone()
            .add(normalForce);

        // contactForces.add(normalForce);

        const fsMax = μs * normalMag;
        const fk = μk * normalMag;

        /* Check if static friction holds. */
        if (ortho.length() <= fsMax) {
            contactForces.sub(
                ortho
            );
            // this.doThingThing(normal);
        } else {
            contactForces.sub(
                velocity.clone()
                    .normalize()
                    .setLength(
                        fk
                    )
            );
        }

        /* Tells us that our feet are colliding 
         * with an object. */
        if (normal.y > 0) {
            if (!this.CAN_JUMP) {
                const slope = 1 - normal.dot(Y_AXIS);
                this.CAN_JUMP = slope < MAX_SLOPE;
            }
            this.ON_GROUND = true;
        }
    }

    handleCollisions() {
        const { objects, collider, position, velocity } = this;

        /* We are not on the ground and cannot 
         * jump UNLESS our feet are colliding  
         * with an object in the y-dir. */
        this.contactForces.set(0, 0, 0);
        this.ON_GROUND = false;
        this.CAN_JUMP = false;

        for (const object of objects) {
            const [collides, offset] = collider.SAT(object);

            if (!collides)
                continue;

            position.add(offset);
            velocity.sub(
                ORTHOGONAL_PROJECT(
                    velocity,
                    offset
                )
            );

            const normal = offset.normalize();
            this.handleCollision(
                object,
                normal
            );
        }
    }

    updateVelocity(dt: number) {
        const { lastAcceleration, velocity } = this;

        const acceleration = this.getNetForce()
            .divideScalar(PLAYER_MASS);

        velocity.add(
            lastAcceleration.add(
                acceleration
            ).multiplyScalar(
                0.5 * dt
            )
        );

        lastAcceleration.copy(acceleration);
    }

    enforceWorldBounds() {
        const boundX = (WORLD_SIZE - PLAYER_WIDTH) / 2;
        const boundY = (WORLD_SIZE - PLAYER_HEIGHT) / 2;
        const MAX_POS = new THREE.Vector3(boundX, boundY, boundX);
        const MIN_POS = new THREE.Vector3(-boundX, -0.1, -boundX);
        this.position = this.position.clamp(MIN_POS, MAX_POS);
    }

    updateCrouchVal(dt: number) {
        const { controls, settings, IS_FLYING, mesh, size } = this;
        const controlsObject = controls.getObject();
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

        controlsObject.position.y = (PLAYER_HEIGHT - PLAYER_EYE_OFFSET - this.crouchVal) / 2;
        mesh.scale.y = (1 - this.crouchVal / PLAYER_HEIGHT);
        size.y = (PLAYER_HEIGHT - this.crouchVal) / 2;
    }

    update(dt: number) {
        const { position, object } = this;

        this.updateCrouchVal(dt);
        this.handleJump();
        this.updatePosition(dt);
        this.handleCollisions();
        this.updateVelocity(dt);
        this.enforceWorldBounds();

        this.arrowHelpers[0].setDirection(this.getNetForce().normalize());
        this.arrowHelpers[1].setDirection(this.velocity.clone().normalize());
        this.arrowHelpers[1].setLength(this.velocity.length() * 100);

        object.position.copy(position);
    }
}