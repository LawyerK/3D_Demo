import { Sky } from 'three/addons/objects/Sky.js';
import * as THREE from 'three';
import Player from './Player';
import Controls from './Controls';
import SettingsManager from './Settings';
import { PLAYER_HALF_WIDTH, SQRT2, SQRT3, WORLD_SIZE } from './Constants';
import MapObject from './MapObject';
import * as Materials from './Materials';

interface SkyParams {
    turbidity: number;
    rayleigh: number;
    mieCoefficient: number;
    mieDirectionalG: number;
    exposure: number;
}

class Main {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    camera = new THREE.PerspectiveCamera(70, 0, 0.1, 1000);
    scene = new THREE.Scene();

    objects: Array<MapObject> = [];

    controls = new Controls(this.renderer.domElement);
    settings = new SettingsManager();
    player = new Player(this.camera, this.controls, this.settings, this.objects);

    /* Possibly temporary */
    runDaylightCycle = true;

    /* Initialized by initScene() */
    light: THREE.DirectionalLight;
    sky: Sky;

    constructor() {
        const { scene, controls, player } = this;

        // Must add the player object to scene
        scene.add(player.object);

        controls.registerKeyHandler('T', this.toggleDaylightCycle.bind(this));

        this.configureRenderer();
        this.addEventListeners();
        this.initScene();
        this.begin();

        // this.debug_runPhysicsTests();
    }

    async begin() {
        const { renderer } = this;

        /* Load in all textures/materials */
        await Materials.load();

        /* Append renderer canvas element to document body */
        document.body.appendChild(renderer.domElement);
        /* Begin render loop */
        this.render();
    }

    /* Physics simulation should be independent of the number
     * of discrete timesteps used. This tests that this
     * is at least *mostly* the case. Proper solutions
     * of the DE including drag force are complicated.
     * It turns out that for anything beyond 2 discrete
     * timesteps per second (2FPS) the way things are
     * done now is actually a pretty decent approximation
     * Between [5, 100] FPS the difference in position 
     * is only 0.3 units! */
    debug_runPhysicsTests() {
        const { player, controls, settings } = this;
        const keybinds = settings.getKeybinds();

        controls.keysDown.set(keybinds.MOVE_FORWARD, 1);

        // number of steps
        for (let i = 1; i < 100; i++) {
            player.position.set(0, 0, WORLD_SIZE / 2 - PLAYER_HALF_WIDTH);
            player.velocity.set(0, 0, 0);

            const dt = 1000 / i;

            console.log(`---- ${i} discrete steps where dt=${dt}`);

            for (let j = 0; j < i; j++) {
                player.update(dt);
            }

            console.log(player.position.z);
        }
    }

    toggleDaylightCycle(isKeydown: number) {
        if (!isKeydown)
            return;

        this.runDaylightCycle = !this.runDaylightCycle;
        this.updateSunPosition(10, 45);
    }

    configureRenderer() {
        const { renderer } = this;

        renderer.setPixelRatio(window.devicePixelRatio);

        renderer.toneMapping = THREE.CineonToneMapping;

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    addEventListeners() {
        /* Handle window resize */
        window.addEventListener('resize', this.handleResize.bind(this));
        this.handleResize();
    }

    handleResize() {
        const { camera, renderer } = this;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    addLights() {
        const { scene } = this;

        /* Add directional light */
        const dirLight = this.light = new THREE.DirectionalLight(0xffffff);
        this.configureShadowCasting(dirLight);
        scene.add(dirLight);

        const ambLight = new THREE.AmbientLight(0x888888);
        scene.add(ambLight);
    }

    configureShadowCasting(dirLight: THREE.DirectionalLight) {
        // const { scene } = this;

        /* Set up shadow properties for the light */
        dirLight.castShadow = true;

        dirLight.shadow.mapSize.width = 4096;
        dirLight.shadow.mapSize.height = 4096;

        const FAR = WORLD_SIZE * SQRT3;

        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = FAR;

        const AABB = WORLD_SIZE * SQRT2;

        dirLight.shadow.camera.left = -AABB / 2;
        dirLight.shadow.camera.right = AABB / 2;
        dirLight.shadow.camera.bottom = -AABB / 2;
        dirLight.shadow.camera.top = AABB / 2;

        // const helper = new THREE.CameraHelper(dirLight.shadow.camera);
        // scene.add(helper);
    }

    addCube() {
        const { scene, objects } = this;

        const geometry = new THREE.BoxGeometry(10, 10, 10);
        geometry.computeBoundingSphere();

        const cube = new THREE.Mesh(geometry, Materials.METAL_MATERIAL);
        cube.rotateX(Math.PI / 4);
        cube.rotateY(Math.PI / 8);
        cube.position.z -= 12;
        cube.position.y -= 2;
        cube.castShadow = true;
        scene.add(cube);

        const size = new THREE.Vector3(5, 5, 5);
        const obj = new MapObject(cube.position, size, cube.quaternion);
        objects.push(obj);
    }

    addFloor() {
        const { scene, objects } = this;

        const geometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 1, 1);
        const plane = new THREE.Mesh(geometry, Materials.BRICK_MATERIAL);

        plane.rotateX(-Math.PI / 2);
        plane.receiveShadow = true;
        scene.add(plane);

        const size = new THREE.Vector3(WORLD_SIZE / 2, 0, WORLD_SIZE / 2);
        const aabb = new MapObject(plane.position, size);
        objects.push(aabb);
    }

    addSky() {
        const { scene, renderer } = this;

        const sky = this.sky = new Sky();
        sky.scale.setScalar(WORLD_SIZE);
        scene.add(sky);

        const params: SkyParams = {
            turbidity: 0.1,
            rayleigh: 1,
            mieCoefficient: 0.005,
            mieDirectionalG: 0.8,
            exposure: renderer.toneMappingExposure
        };

        this.updateSkyParams(params);
    }

    initScene() {
        /* Note: Sun/light position is set
         * every frame in the render loop */

        this.addLights();
        this.addSky();
        this.addFloor();
        this.addCube();
    }

    updateSkyParams(params: SkyParams) {
        const { sky, renderer } = this;
        const { uniforms } = sky.material;

        uniforms.turbidity.value = params.turbidity;
        uniforms.rayleigh.value = params.rayleigh;
        uniforms.mieCoefficient.value = params.mieCoefficient;
        uniforms.mieDirectionalG.value = params.mieDirectionalG;

        renderer.toneMappingExposure = params.exposure;
    }

    updateSunPosition(elevation: number, azimuth: number) {
        const { sky, light } = this;
        const { uniforms } = sky.material;

        const phi = THREE.MathUtils.degToRad(90 - elevation);
        const theta = THREE.MathUtils.degToRad(azimuth);

        uniforms.sunPosition.value.setFromSphericalCoords(1, phi, theta);
        light.position.setFromSphericalCoords(
            SQRT3 * WORLD_SIZE / 2,
            phi, theta
        );
    }

    lastTime = Date.now()

    render() {
        const { renderer, scene, camera, runDaylightCycle } = this;

        /* Go ahead and queue the next frame
         * JavaScript is single-threaded/synchronous */
        requestAnimationFrame(this.render.bind(this));

        /* Very important - calculate time between frames */
        const now = Date.now();
        const dt = Math.max(
            /* Don't allow a timestep for anything lower than 5FPS.
             * And don't allow negative timesteps. */
            Math.min(
                now - this.lastTime,
                1000 / 5
            ), 0
        );
        this.lastTime = now;

        /* Update all player related things */
        this.player.update(dt);

        /* Simulate daylight cycle. 1 degree per second. */
        if (runDaylightCycle) {
            this.updateSunPosition(now * 0.001, 45);
        }

        /* Render the scene! */
        renderer.render(scene, camera);
    }
}

const main = new Main();

// DEBUG CODE
(window as any).THREE = THREE;
(window as any).main = main;
