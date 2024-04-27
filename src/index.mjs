import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import * as THREE from 'three';


const renderer = new THREE.WebGLRenderer({ antialias: true });
const renderElem = renderer.domElement;
const camera = new THREE.PerspectiveCamera(40, 1, 1, 1000);
const controls = new PointerLockControls(camera, renderElem);
const scene = new THREE.Scene();

renderer.setPixelRatio(window.devicePixelRatio);

// Handle resize
function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', handleResize);
handleResize();

// Handle pointer lock
renderElem.addEventListener('click', () => {
    controls.lock();
});

// Handle movement keys
const keys = ['W', 'A', 'S', 'D', 'SHIFT', ' '];
const keysDown = [0, 0, 0, 0, 0, 0];

function keyHandler(e, val) {
    console.log(e.key);

    if (!controls.isLocked)
        return;

    const index = keys.indexOf(e.key.toUpperCase());
    if (index != -1)
        keysDown[index] = val;

    e.stopPropagation();
    e.preventDefault();
    return true;
}

document.body.addEventListener('keydown', e => keyHandler(e, 1), true);
document.body.addEventListener('keyup', e => keyHandler(e, 0), true);

// Add lights
scene.add(new THREE.AmbientLight(0x404040));
const light = new THREE.DirectionalLight(0xffffff);
light.position.set(0, 1, 0);
scene.add(light);

// Add sky
const sky = new Sky();
sky.scale.setScalar(450000);
scene.add(sky);

const skyParams = {
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    elevation: 2,
    azimuth: 180,
    exposure: renderer.toneMappingExposure
};

function updateSkyParams(params) {
    const uniforms = sky.material.uniforms;

    uniforms.turbidity.value = params.turbidity;
    uniforms.rayleigh.value = params.rayleigh;
    uniforms.mieCoefficient.value = params.mieCoefficient;
    uniforms.mieDirectionalG.value = params.mieDirectionalG;

    const phi = THREE.MathUtils.degToRad(90 - params.elevation);
    const theta = THREE.MathUtils.degToRad(params.azimuth);

    uniforms.sunPosition.value.setFromSphericalCoords(1, phi, theta);

    renderer.toneMappingExposure = params.exposure;
}

updateSkyParams(skyParams);

// Add plane
const planeMater = new THREE.MeshLambertMaterial({ color: 0x1111ff, side: THREE.DoubleSide });
const planeGeom = new THREE.PlaneGeometry(1000, 1000);
const plane = new THREE.Mesh(planeGeom, planeMater);

plane.rotateX(Math.PI / 2);
plane.translateY(-100);

scene.add(plane);

window.plane = plane;

// Add cube
const cubeMater = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
const cubeGeom = new THREE.BoxGeometry(1, 1, 1);
const cube = new THREE.Mesh(cubeGeom, cubeMater);
scene.add(cube);

// Debug code
window.controls = controls;
window.camera = camera;
window.cube = cube;

// Look at cube
camera.position.x = 5
camera.position.y = 0;
camera.position.z = 0;
camera.lookAt(cube.position);

// Constants
const yAxis = new THREE.Vector3(0, 1, 0);
const moveSpeed = 0.005;

// Render loop
let lastTime = Date.now();

const { PI } = Math;

// Move direction mapped by unique combination of forward/backward/left/right keys.
const dirs = [PI / 4, PI / 2, 3 * PI / 4, 0, 0, PI, -PI / 4, -PI / 2, -3 * PI / 4];

function render() {
    const now = Date.now();
    const delta = now - lastTime;
    lastTime = now;

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

        // Get camera's direction vector and store in 
        // a vector called moveDir
        const moveDir = new THREE.Vector3();
        camera.getWorldDirection(moveDir);

        // We do not want y-component to affect movement
        moveDir.y = 0;

        // Normalize after changing y
        moveDir.normalize();

        // Rotate moveDir vector moveDir degrees around 
        // the y-axis to get final movement direction 
        moveDir.applyAxisAngle(yAxis, wishDir);

        // moveSpeed represents speed in "units per second"
        // we need this to be in "units per frame"
        // 60 FPS means delta = time between frames = 1/60
        // thus each of of the 60 frames we move 
        // delta * moveSpeed = moveSpeed / 60 amount.
        moveDir.multiplyScalar(delta * moveSpeed);

        // Move in this direction by `delta*moveSpeed`
        // amount during this frame.
        camera.position.add(moveDir);
    }

    if (up_down)
        camera.position.y += up_down * delta * moveSpeed;

    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

// Append canvas to document body
document.body.appendChild(renderer.domElement);

// Begin render loop
render();