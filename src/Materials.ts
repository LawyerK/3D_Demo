import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import * as THREE from 'three';
import { WORLD_SIZE } from './Constants';

export const BRICK_MATERIAL = new THREE.MeshStandardMaterial({ side: THREE.FrontSide });
export const METAL_MATERIAL = new THREE.MeshStandardMaterial({ side: THREE.FrontSide });

export async function load() {
    await loadBrickMaterial();
    await loadMetalMaterial();
}

/* Folder structure and naming convention for textures
 * is assumed */
function loadMaterial(assetPath: string) {

}

const texLoader = new THREE.TextureLoader();
const exrLoader = new EXRLoader();

async function loadBrickMaterial() {
    const material = BRICK_MATERIAL;

    await (async () => {
        const applyRepeat = (tex: THREE.Texture) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(WORLD_SIZE / 5, WORLD_SIZE / 5);
        }

        const diffuseMap = await texLoader.loadAsync(
            './assets/brick/color.jpg'
        );
        material.map = diffuseMap;
        applyRepeat(diffuseMap);

        // const displMap = await texLoader.loadAsync(
        //     './assets/brick/t_brick_floor_002_displacement_1k.png'
        // )
        // material.displacementMap = displMap;
        // applyRepeat(displMap);

        const normMap = await exrLoader.loadAsync(
            './assets/brick/normal.exr'
        );
        material.normalMap = normMap;
        applyRepeat(normMap);

        const roughMap = await texLoader.loadAsync(
            './assets/brick/roughness.jpg'
        );
        material.roughnessMap = roughMap;
        applyRepeat(roughMap);

        /* Force an update of the material
         * so it renders with the new tex's */
        material.needsUpdate = true;
    })().catch(error => {
        alert('Error loading floor textures: ' + error);
        console.trace(error);
    });
}

async function loadMetalMaterial() {
    const material = METAL_MATERIAL;

    await (async () => {
        const applyRepeat = (tex: THREE.Texture) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(5, 5);
        }

        const aoMap = await texLoader.loadAsync(
            './assets/metal/ao.jpg'
        );
        material.aoMap = aoMap;
        applyRepeat(aoMap);

        const colorMap = await texLoader.loadAsync(
            './assets/metal/color.jpg'
        );
        material.map = colorMap;
        applyRepeat(colorMap);

        // const heightMap = await texLoader.loadAsync(
        //     './assets/metal/Metal_006_height.png'
        // )
        // material.displacementMap = heightMap;

        const metalnessMap = await texLoader.loadAsync(
            './assets/metal/metalness.jpg'
        );
        material.metalnessMap = metalnessMap;
        material.metalness = 0.4;
        applyRepeat(metalnessMap);

        const normMap = await texLoader.loadAsync(
            './assets/metal/normal.jpg'
        );
        material.normalMap = normMap;
        applyRepeat(normMap);

        const roughnessMap = await texLoader.loadAsync(
            './assets/metal/roughness.jpg'
        );
        material.roughnessMap = roughnessMap;
        material.roughness = 1;
        applyRepeat(roughnessMap);

        /* Force an update of the material
         * so it renders with the new tex's */
        material.needsUpdate = true;
    })().catch(error => {
        alert('Error loading cube textures: ' + error);
        console.trace(error);
    });
}
