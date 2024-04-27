import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import * as THREE from 'three';


// Constants
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const ZERO_VECTOR = new THREE.Vector3();
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

    // 1-1 correspondence between these arrays
    keys = ['W', 'A', 'S', 'D', 'SHIFT', ' '];
    keysDown = [0, 0, 0, 0, 0, 0];

    // Initialized by initScene()
    light = null;
    sky = null;

    // Instantaneous acceleration at time now
    acceleration = new THREE.Vector3();
    // Cumulative velocity of camera
    velocity = new THREE.Vector3();
    // Current position of camera
    position = new THREE.Vector3();

    constructor() {
        this.configureRenderer();
        this.addEventListeners();
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

    initScene() {
        const { camera, scene, position, renderer } = this;

        // Add directional light
        const light = this.light = new THREE.DirectionalLight(0xffffff);
        scene.add(light);

        // Set up shadow properties for the light
        light.castShadow = true;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500;

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

        // Sets direction light position
        // as well
        this.updateSunPosition(0, 180);

        // Add plane to represent floor
        const planeMater = new THREE.MeshPhongMaterial({ side: THREE.FrontSide });
        const planeGeom = new THREE.PlaneGeometry(1000, 1000, 100, 100);
        const plane = new THREE.Mesh(planeGeom, planeMater);
        plane.rotateX(-Math.PI / 2);
        plane.position.y = -10;
        plane.receiveShadow = true;
        scene.add(plane);

        // Add cube
        const cubeMater = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        const cubeGeom = new THREE.BoxGeometry(1, 1, 1);
        const cube = new THREE.Mesh(cubeGeom, cubeMater);
        cube.castShadow = true;
        scene.add(cube);

        const helper = new THREE.CameraHelper(light.shadow.camera);
        scene.add(helper);

        // Look at cube
        position.addVectors(position, new THREE.Vector3(5, 0, 0));
        camera.position.copy(position);
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

    lastTime = Date.now()

    render() {
        const { camera, scene, position,
            velocity, acceleration, keysDown } = this;

        const now = Date.now();
        const delta = now - this.lastTime;
        this.lastTime = now;

        const forward_backward = keysDown[2] - keysDown[0]; // BACK - FORWARD
        const left_right = keysDown[3] - keysDown[1]; // RIGHT - LEFT
        const up_down = keysDown[5] - keysDown[4]; // UP - DOWN

        acceleration.copy(ZERO_VECTOR);

        if (forward_backward || left_right) {
            // First re-map from range [-1, 1] to range [0, 2]
            // Then scale the 2nd quantity so there's no overlap
            // Result is a distinct number in range [0, 8]
            // This number represenst one of 8 distinct
            // move directions stored in an array.
            const index = (forward_backward + 1) + 3 * (left_right + 1);
            const wishDir = dirs[index];

            // Get camera's direction vector and store in 
            // a vector called moveDir
            const moveDir = new THREE.Vector3();
            camera.getWorldDirection(moveDir);

            // We do not want y-component to affect movement
            moveDir.y = 0;

            // Rotate moveDir vector moveDir degrees around 
            // the y-axis to get final movement direction 
            moveDir.applyAxisAngle(Y_AXIS, wishDir);

            // setLength first normalizes then multiplies each component by X.
            moveDir.setLength(ACCEL_SPEED);

            // This now represents our acceleration vector
            acceleration.copy(moveDir);
        }

        // Account for up/down acceleration
        if (up_down)
            acceleration.y += up_down * ACCEL_SPEED;

        // Account for drag/friction TODO: separate ground/air friction.
        const drag = velocity.clone().negate().multiplyScalar(DRAG_COEF);
        acceleration.add(drag);

        // acceleration.y += delta * GRAVITY;

        // v(t) = v0 + a*t
        velocity.add(acceleration.clone().multiplyScalar(delta));

        // Cap velocity
        if (velocity.lengthSq() > MAX_SPEED ** 2)
            velocity.setLength(MAX_SPEED);

        // x(t) = x0 + v*t + 0.5*a*t^2
        const deltaPos = velocity.clone()
            .multiplyScalar(delta)
            .add(
                acceleration.clone()
                    .multiplyScalar(0.5 * delta ** 2)
            );
        position.add(deltaPos);

        // "Floor"
        if (position.y <= -10 + PLAYER_HEIGHT)
            position.y = -10 + PLAYER_HEIGHT;

        // Set camera to the new position.
        camera.position.copy(position);

        // Simulate daylight cycle
        this.updateSunPosition(now * 0.001, 180);

        this.renderer.render(scene, camera);

        requestAnimationFrame(this.render.bind(this));
    }

}

const demo = new Demo3D();

window.THREE = THREE;
window.demo = demo;

