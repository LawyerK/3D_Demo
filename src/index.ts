import { Sky } from 'three/addons/objects/Sky.js';
import * as THREE from 'three';
import Player from './Player';
import Box3D from './Box3D';
import Controls from './Controls';

interface SkyParams {
    turbidity: number;
    rayleigh: number;
    mieCoefficient: number;
    mieDirectionalG: number;
    exposure: number;
}

class Main {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    camera = new THREE.PerspectiveCamera(70, 0.1, 1, 1000);
    scene = new THREE.Scene();

    // Collision objects
    objects: Array<Box3D> = [];

    controls = new Controls(this.camera, this.renderer.domElement);
    player = new Player(this.camera, this.controls, this.objects);

    // Initialized by initScene()
    light: THREE.DirectionalLight;
    sky: Sky;

    constructor() {
        // Must add the player object to scene
        this.scene.add(this.player.object);

        this.configureRenderer();
        this.addEventListeners();
        this.initScene();

        // Append renderer canvas element to document body
        document.body.appendChild(this.renderer.domElement);

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
    }

    handleResize() {
        const { camera, renderer } = this;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    initScene() {
        const { scene, renderer } = this;

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

        const params: SkyParams = {
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
        cube.position.z -= 5;
        cube.castShadow = true;
        scene.add(cube);

        const cubeCol = new Box3D(cube.position, new THREE.Vector3(1, 1, 1));
        this.objects.push(cubeCol);

        const helper = new THREE.CameraHelper(light.shadow.camera);
        scene.add(helper);
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
        light.position.setFromSphericalCoords(100, phi, theta);
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

        // Update all player related things
        this.player.update(delta);

        // Simulate daylight cycle. 1 degree per second.
        this.updateSunPosition(now * 0.001, 125);

        // Render the scene!
        this.renderer.render(scene, camera);
    }

}

const main = new Main();

// DEBUG CODE
(window as any).THREE = THREE;
(window as any).main = main;
