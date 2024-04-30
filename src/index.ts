import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import * as THREE from 'three';
import Player from './Player';
import Box3D from './Box3D';
import Controls from './Controls';
import SettingsManager from './Settings';
import { WORLD_SIZE } from './Constants';

interface SkyParams {
    turbidity: number;
    rayleigh: number;
    mieCoefficient: number;
    mieDirectionalG: number;
    exposure: number;
}

class Main {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    camera = new THREE.PerspectiveCamera(70, 0.01, 1, 1000);
    scene = new THREE.Scene();

    // Collision objects
    objects: Array<Box3D> = [];

    controls = new Controls(this.camera, this.renderer.domElement);
    settings = new SettingsManager();
    player = new Player(this.camera, this.controls, this.settings, this.objects);

    // Initialized by initScene()
    light: THREE.DirectionalLight;
    sky: Sky;

    // Possibly temporary
    runDaylightCycle = true;

    constructor() {
        // Must add the player object to scene
        this.scene.add(this.player.object);

        this.configureRenderer();
        this.addEventListeners();
        this.initScene();

        // Append renderer canvas element to document body
        document.body.appendChild(this.renderer.domElement);

        this.controls.registerKeyHandler('T', this.toggleDaylightCycle.bind(this));

        // Begin render loop
        this.render();
    }

    toggleDaylightCycle(isKeydown: number) {
        if (!isKeydown)
            return;

        this.runDaylightCycle = !this.runDaylightCycle;
        this.updateSunPosition(60, 125);
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
    }

    handleResize() {
        const { camera, renderer } = this;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    addLights() {
        const { scene } = this;

        // Add directional light
        const dirLight = this.light = new THREE.DirectionalLight(0xffffff);
        this.configureShadowCasting(dirLight);
        scene.add(dirLight);

        const ambLight = new THREE.AmbientLight(0x888888);
        scene.add(ambLight);
    }

    configureShadowCasting(dirLight: THREE.DirectionalLight) {
        const { scene } = this;

        const HALF_WORLD_SIZE = WORLD_SIZE / 2;

        // Set up shadow properties for the light
        dirLight.castShadow = true;

        dirLight.shadow.mapSize.width = 4096;
        dirLight.shadow.mapSize.height = 4096;

        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 2 * WORLD_SIZE;

        dirLight.shadow.camera.left = -HALF_WORLD_SIZE;
        dirLight.shadow.camera.right = HALF_WORLD_SIZE;
        dirLight.shadow.camera.top = HALF_WORLD_SIZE;
        dirLight.shadow.camera.bottom = -HALF_WORLD_SIZE;

        const helper = new THREE.CameraHelper(dirLight.shadow.camera);
        scene.add(helper);
    }

    addCube() {
        const { scene } = this;

        const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide });
        const geometry = new THREE.BoxGeometry(1, 1, 1);

        const cube = new THREE.Mesh(geometry, material);
        cube.position.y += 0.5;
        cube.position.z -= 5;
        cube.castShadow = true;
        scene.add(cube);

        const texLoader = new THREE.TextureLoader();

        (async () => {
            const aoMap = await texLoader.loadAsync(
                './assets/metal/Metal_006_ambientOcclusion.jpg'
            );
            material.aoMap = aoMap;

            const diffuseMap = await texLoader.loadAsync(
                './assets/metal/Metal_006_basecolor.jpg'
            );
            material.map = diffuseMap;

            // const heightMap = await texLoader.loadAsync(
            //     './assets/metal/Metal_006_height.png'
            // )
            // material.displacementMap = heightMap;

            const metalMap = await texLoader.loadAsync(
                './assets/metal/Metal_006_normal.jpg'
            );
            material.metalnessMap = metalMap;
            material.metalness = 0.4;

            const normMap = await texLoader.loadAsync(
                './assets/metal/Metal_006_normal.jpg'
            );
            material.normalMap = normMap;

            const roughMap = await texLoader.loadAsync(
                './assets/metal/Metal_006_roughness.jpg'
            );
            material.roughnessMap = roughMap;
            material.roughness = 1;

            // Force an update of the material
            // so it renders with the new tex's
            material.needsUpdate = true;
        })().catch(error => {
            alert('Error loading cube textures: ' + error);
            console.trace(error);
        });

        const cubeCol = new Box3D(cube.position, new THREE.Vector3(1, 1, 1));
        this.objects.push(cubeCol);
    }

    addFloor() {
        const { scene } = this;

        const material = new THREE.MeshLambertMaterial({ side: THREE.FrontSide });
        const geometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 1, 1);
        const plane = new THREE.Mesh(geometry, material);

        plane.rotateX(-Math.PI / 2);
        plane.receiveShadow = true;
        scene.add(plane);

        // Asynchronously load in textures
        // It is fine to continue along with
        // other stuff while these load in.

        const texLoader = new THREE.TextureLoader();
        const exrLoader = new EXRLoader();

        (async () => {
            const applyRepeat = (tex: THREE.Texture) => {
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(WORLD_SIZE / 5, WORLD_SIZE / 5);
            }

            const diffuseMap = await texLoader.loadAsync(
                './assets/brick/t_brick_floor_002_diffuse_1k.jpg'
            );
            material.map = diffuseMap;
            applyRepeat(diffuseMap);

            const displMap = await texLoader.loadAsync(
                './assets/brick/t_brick_floor_002_displacement_1k.png'
            )
            material.displacementMap = displMap;
            applyRepeat(displMap);

            const roughMap = await texLoader.loadAsync(
                './assets/brick/t_brick_floor_002_rough_1k.jpg'
            );
            material.bumpMap = roughMap;
            applyRepeat(roughMap);

            const normMap = await exrLoader.loadAsync(
                './assets/brick/t_brick_floor_002_nor_gl_1k.exr'
            );
            material.normalMap = normMap;
            applyRepeat(normMap);

            // Force an update of the material
            // so it renders with the new tex's
            material.needsUpdate = true;

            // The displacement map seems to be centered at 0.5
            // with +/- 0.5 which is unfortunate. This line
            // compensates for it with code.
            plane.position.y = -0.5;
        })().catch(error => {
            alert('Error loading floor textures: ' + error);
            console.trace(error);
        });
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
        // Note: Sun/light position is set
        // every frame in the render loop

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
        light.position.setFromSphericalCoords(WORLD_SIZE, phi, theta);
    }

    lastTime = Date.now()

    render() {
        const { camera, scene, runDaylightCycle } = this;

        // Go ahead and queue the next frame
        // JavaScript is single-threaded/synchronous
        requestAnimationFrame(this.render.bind(this));

        // Very important - calculate time between frames
        const now = Date.now();
        const dt = now - this.lastTime;
        this.lastTime = now;

        // Update all player related things
        this.player.update(dt);

        // Simulate daylight cycle. 1 degree per second.
        if (runDaylightCycle)
            this.updateSunPosition(now * 0.001, 125);

        // Render the scene!
        this.renderer.render(scene, camera);
    }
}

const main = new Main();

// DEBUG CODE
(window as any).THREE = THREE;
(window as any).main = main;
