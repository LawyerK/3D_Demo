import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import * as THREE from 'three';

// Constants
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const PI = Math.PI;

const PLAYER_HEIGHT = 2;
const ACCEL_SPEED = 0.00005;
const GRAVITY = -0.005;
const DRAG_COEF = 0.008;
const MAX_SPEED = 25;

// Move direction mapped by unique combination of forward/backward/left/right keys.
const dirs = [PI / 4, PI / 2, 3 * PI / 4, 0, 0, PI, -PI / 4, -PI / 2, -3 * PI / 4];

class Demo3D {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderElem = this.renderer.domElement;
    camera = new THREE.PerspectiveCamera(70, 0.1, 1, 1000);
    controls = new PointerLockControls(this.camera, this.renderElem);
    scene = new THREE.Scene();

    // Collision objects
    objects = [];

    // 1-1 correspondence between these arrays
    keys = ['W', 'A', 'S', 'D', 'SHIFT', ' '];
    keysDown = [0, 0, 0, 0, 0, 0];

    // Initialized by initScene()
    light = null;
    sky = null;

    // Player object
    player = new THREE.Object3D();

    // Current velocity of player
    velocity = new THREE.Vector3();
    // Current position of player
    position = new THREE.Vector3();

    constructor() {
        this.configureRenderer();
        this.addEventListeners();
        this.initPlayer();
        this.initScene();

        // Append renderer canvas to document body
        document.body.appendChild(this.renderElem);

        // Begin render loop
        this.render();
    }

    configureRenderer() {
        const { renderer } = this;

        renderer.setPixelRatio(window.devicePixelRatio);

        renderer.toneMapping = THREE.LinearToneMapping;
        renderer.toneMappingExposure = 0.5;

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    addEventListeners() {
        // Handle window resize
        window.addEventListener('resize', this.handleResize.bind(this));
        this.handleResize();

        // Handle pointer lock
        this.renderElem.addEventListener('click', () => {
            this.controls.lock();
        });

        this.controls.addEventListener('unlock', () => {
            this.keysDown.fill(0);
        });

        // Handle movement keys
        document.body.addEventListener('keydown', e => this.handleKey(e, 1), true);
        document.body.addEventListener('keyup', e => this.handleKey(e, 0), true);
    }

    handleResize() {
        const { camera, renderer } = this;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    handleKey(e, val) {
        const { controls, keys, keysDown } = this;

        if (!controls.isLocked)
            return;

        const index = keys.indexOf(e.key.toUpperCase());
        if (index != -1)
            keysDown[index] = val;

        e.stopPropagation();
        e.preventDefault();
        return true;
    }

    initPlayer() {
        const { camera, player, scene } = this;
        camera.position.y = PLAYER_HEIGHT;
        player.add(camera);
        scene.add(player);
    }

    initScene() {
        const { player, camera, scene, position, renderer } = this;

        // Add directional light
        const light = this.light = new THREE.DirectionalLight(0xffffff);
        scene.add(light);

        // Set up shadow properties for the light
        light.castShadow = true;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500;

        // Note: Sun/light position is set
        // every frame in the render loop

        // Add ambient light
        scene.add(new THREE.AmbientLight(0x888888));

        // Add sky
        const sky = this.sky = new Sky();
        sky.scale.setScalar(450000);
        scene.add(sky);

        const params = {
            turbidity: 0.1,
            rayleigh: 1,
            mieCoefficient: 0.005,
            mieDirectionalG: 0.8,
            exposure: renderer.toneMappingExposure
        };

        this.updateSkyParams(params);

        // Add plane to represent floor
        const planeMater = new THREE.MeshPhongMaterial({ side: THREE.FrontSide });
        const planeGeom = new THREE.PlaneGeometry(1000, 1000, 100, 100);
        const plane = new THREE.Mesh(planeGeom, planeMater);
        plane.rotateX(-Math.PI / 2);
        plane.receiveShadow = true;
        scene.add(plane);

        // Add cube
        const cubeMater = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        const cubeGeom = new THREE.BoxGeometry(1, 1, 1);
        const cube = new THREE.Mesh(cubeGeom, cubeMater);
        cube.position.y += 0.5;
        cube.castShadow = true;
        scene.add(cube);

        const helper = new THREE.CameraHelper(light.shadow.camera);
        scene.add(helper);

        // Look at cube
        position.copy(new THREE.Vector3(5, 0, 0));
        player.position.copy(position);
        camera.lookAt(cube.position);
    }

    updateSkyParams(params) {
        const { sky, renderer } = this;
        const { uniforms } = sky.material;

        uniforms.turbidity.value = params.turbidity;
        uniforms.rayleigh.value = params.rayleigh;
        uniforms.mieCoefficient.value = params.mieCoefficient;
        uniforms.mieDirectionalG.value = params.mieDirectionalG;

        renderer.toneMappingExposure = params.exposure;
    }

    updateSunPosition(elevation, azimuth) {
        const { sky, light } = this;
        const { uniforms } = sky.material;

        const phi = THREE.MathUtils.degToRad(90 - elevation);
        const theta = THREE.MathUtils.degToRad(azimuth);

        uniforms.sunPosition.value.setFromSphericalCoords(1, phi, theta);
        light.position.setFromSphericalCoords(100, phi, theta);
    }

    getAcceleration() {
        const { keysDown, camera } = this;

        const moveDir = new THREE.Vector3();

        const forward_backward = keysDown[2] - keysDown[0]; // BACK - FORWARD
        const left_right = keysDown[3] - keysDown[1]; // RIGHT - LEFT
        const up_down = keysDown[5] - keysDown[4]; // UP - DOWN

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

        // Account for up/down acceleration
        moveDir.y = up_down;

        // Now we have a vector pointing in the direction
        // we wish to move in. Set its length to ACCEL_SPEED
        // and this now represents our acceleration vector.
        const acceleration = moveDir.setLength(ACCEL_SPEED);

        return acceleration;
    }

    // Apply drag force proportional to velocity at current time
    // Mass of player is currently implicitly assumed to be 1.
    // F=MA => A=F/M M=1 thus A=F
    applyFriction(velocity, acceleration) {
        // Account for drag/friction TODO: separate ground/air friction.
        const dragForce = velocity.clone().negate().multiplyScalar(DRAG_COEF);
        acceleration.add(dragForce);
    }

    updatePlayerPosition(delta) {
        const { player, position, velocity } = this;

        // Get acceleration. This is only a function of 
        // the movement keys pressed during this frame. 
        const acceleration = this.getAcceleration();

        // Apply friction/drag
        this.applyFriction(velocity, acceleration);

        // TODO: maybe add gravity/jump mechanic 
        // instead of currently flight mechanic
        // acceleration.y += GRAVITY;

        // Apply acceleration to velocity
        // via the formula v(t) = v0 + a*t
        velocity.add(
            acceleration.clone()
                .multiplyScalar(delta)
        );

        // Cap velocity to MAX_SPEED
        if (velocity.lengthSq() > MAX_SPEED ** 2)
            velocity.setLength(MAX_SPEED);

        // Calculate final position via
        // x(t) = x0 + v*t + 0.5*a*t^2
        const deltaPos = velocity.clone()
            .multiplyScalar(delta)
            .add(
                acceleration.clone()
                    .multiplyScalar(0.5 * delta ** 2)
            );
        position.add(deltaPos);

        // Simulate floor
        if (position.y <= 0)
            position.y = 0;

        // Set player to the new position.
        player.position.copy(position);
    }

    lastTime = Date.now()

    render() {
        const { camera, scene } = this;

        // Go ahead and queue the next frame
        // JavaScript is single-threaded/synchronous
        requestAnimationFrame(this.render.bind(this));

        // Very important - calculate time between frames
        const now = Date.now();
        const delta = now - this.lastTime;
        this.lastTime = now;

        this.updatePlayerPosition(delta);

        // Simulate daylight cycle. 1 degree per second.
        this.updateSunPosition(now * 0.001, 125);

        // Render the scene!
        this.renderer.render(scene, camera);
    }

}

const demo = new Demo3D();

window.THREE = THREE;
window.demo = demo;
