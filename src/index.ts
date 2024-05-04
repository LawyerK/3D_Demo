import { Sky } from 'three/addons/objects/Sky.js';
import * as THREE from 'three';
import Player from './Player';
import Controls from './Controls';
import SettingsManager from './Settings';
import { PLAYER_HEIGHT, PLAYER_WIDTH, SQRT2, SQRT3, WORLD_SIZE } from './Constants';
import Collidable from './Collidable';
import * as Materials from './Materials';

interface SkyParams {
    turbidity: number;
    rayleigh: number;
    mieCoefficient: number;
    mieDirectionalG: number;
    exposure: number;
}

class Main {
    private renderer = new THREE.WebGLRenderer({ antialias: true });
    private camera = new THREE.PerspectiveCamera(70, 0, 0.1, 1000);
    private scene = new THREE.Scene();

    private objects: Array<Collidable> = [];

    private controls = new Controls(this.renderer.domElement);
    private settings = new SettingsManager();
    private player = new Player(this.camera, this.controls, this.settings, this.objects);

    /* Possibly temporary */
    private runDaylightCycle = true;
    private paused = false;
    private doStep = false;

    private timeOfDay = 0;

    /* Initialized by initScene() */
    private light: THREE.DirectionalLight;
    private sky: Sky;

    constructor() {
        const { scene, controls, player } = this;

        // Must add the player object to scene
        scene.add(player.getObject());

        controls.registerKeyDownHandler('T', this.toggleDaylightCycle.bind(this));
        controls.registerKeyDownHandler('P', this.pause.bind(this));
        controls.registerKeyDownHandler('L', this.step.bind(this));

        this.configureRenderer();
        this.addEventListeners();
        this.initScene();
        this.begin();

        this.toggleDaylightCycle();
    }

    pause() {
        this.paused = !this.paused;
    }

    step() {
        this.doStep = true;
    }

    toggleDaylightCycle() {
        this.runDaylightCycle = !this.runDaylightCycle;

        if (!this.runDaylightCycle) {
            this.updateSunPosition(10, 45);
        }
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

    configureRenderer() {
        const { renderer } = this;

        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.toneMapping = THREE.CineonToneMapping;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    addEventListeners() {
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

        const dirLight = this.light = new THREE.DirectionalLight(0xffffff);
        this.configureShadowCasting(dirLight);
        scene.add(dirLight);

        const ambLight = new THREE.AmbientLight(0x888888);
        scene.add(ambLight);
    }

    configureShadowCasting(dirLight: THREE.DirectionalLight) {
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
    }

    addStaticCube() {
        const { scene, objects } = this;

        const geometry = new THREE.BoxGeometry(10, 10, 10);

        const cube = new THREE.Mesh(geometry, Materials.METAL_MATERIAL);
        cube.rotateX(Math.PI / 8);
        cube.rotateY(Math.PI / 8);
        cube.position.z -= 12;
        cube.position.y -= 2;
        cube.receiveShadow = true;
        cube.castShadow = true;
        scene.add(cube);

        const scale = new THREE.Vector3(5, 5, 5);
        const obj = new Collidable(cube.position, scale, cube.quaternion);
        objects.push(obj);
    }

    addCube() {
        const { scene, objects } = this;

        const geometry = new THREE.BoxGeometry(1, 1, 1);

        const cube = new THREE.Mesh(geometry, Materials.METAL_MATERIAL);
        cube.position.z -= 12;
        cube.position.y += 10;
        cube.receiveShadow = true;
        cube.castShadow = true;
        scene.add(cube);

        const scale = new THREE.Vector3(0.5, 0.5, 0.5);
        const obj = new Collidable(cube.position, scale, cube.quaternion);
        objects.push(obj);
    }

    addFloor() {
        const { scene, objects } = this;

        const geometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 1, 1);
        const plane = new THREE.Mesh(geometry, Materials.BRICK_MATERIAL);

        plane.rotateX(-Math.PI / 2);
        plane.receiveShadow = true;
        scene.add(plane);

        const scale = new THREE.Vector3(WORLD_SIZE / 2, WORLD_SIZE / 2, WORLD_SIZE / 2);
        const position = plane.position.clone()
            .sub(
                new THREE.Vector3(0, WORLD_SIZE / 2, 0)
            );
        const obj = new Collidable(position, scale);
        objects.push(obj);
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
        this.addStaticCube();
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
        const { renderer, scene, camera, doStep, paused, timeOfDay, runDaylightCycle } = this;

        /* Go ahead and queue the next frame
         * JavaScript is single-threaded/synchronous */
        requestAnimationFrame(this.render.bind(this));

        /* Very important - calculate time between frames */
        const now = Date.now();
        const dt = Math.max(
            /* Don't allow a timestep for anything lower than 5FPS.
             * Don't allow negative timesteps. */
            Math.min(
                now - this.lastTime,
                1000 / 5
            ), 0
        ) / 1000;
        this.lastTime = now;

        /* Update all player related things */
        if (doStep || !paused) {
            this.player.update(dt);
            this.doStep = false;
        }

        /* Simulate daylight cycle. 1 degree per second. */
        if (runDaylightCycle) {
            this.updateSunPosition(timeOfDay * 15, 45);
            this.timeOfDay += dt / 15;
        }

        /* Render the scene! */
        renderer.render(scene, camera);
    }
}

const main = new Main();

// DEBUG CODE
(window as any).THREE = THREE;
(window as any).main = main;
