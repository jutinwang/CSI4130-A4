import * as THREE from "three";
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { TextureLoader } from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PMREMGenerator } from "three";
import { GUI } from "dat.gui";

/**
 * Global variables
 */
let stars;

/**
 * Loaders
 */ 
const cubeTextureLoader = new THREE.CubeTextureLoader();
const rgbeLoader = new RGBELoader();
const objLoader = new OBJLoader();
const textureLoader = new TextureLoader();


/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 500;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({antialias: false});
renderer.setSize(window.innerWidth, window.innerHeight);

//used to optimize framerate
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

const canvas = renderer.domElement
document.body.appendChild(canvas);

//used to optimize the texture mipmapping
const pmremGenerator = new PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();


/**
 * Controls
 */
const orbit = new OrbitControls( camera, canvas );
orbit.enableDamping = true;
orbit.dampingFactor = 0.1;
orbit.minDistance = 350;
orbit.maxDistance = 500;

//Setup scene
const scene = new THREE.Scene();

//setup environment map and background texture
setupEnvMap();

// Create starfield
createStarticles(3000);

const light = new THREE.AmbientLight(0xffffff, 2); // Soft white light
scene.add(light);

// load ship
objLoader.load(

	// resource URL
	'./static/models/ship/Ship.obj',
	// called when resource is loaded
	function ( ship ) {
        const shipTexture = textureLoader.load("./static/models/ship/textures/Albedo_Ship.png");
        const engineTexture = textureLoader.load("./static/models/ship/textures/Albedo_Engine.png");
        ship.traverse((child) => {
            console.log(child.name); // Check names in console
            if (child.isMesh) {
                // Assign materials based on object name
                if (child.name.includes("Engine")) {
                    child.material = new THREE.MeshStandardMaterial({ map: engineTexture });
                } else if (child.name.includes("Vehicle")) {
                    child.material = new THREE.MeshStandardMaterial({ map: shipTexture });
                } else {
                    child.material = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Default material
                }
            }
    
        });

		scene.add( ship );
        ship.position.set(-250, 0,0);
        ship.scale.set(30,30,30);
        ship.rotateY(Math.PI/2);
	},
	// called when loading is in progress
	function ( xhr ) {
		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	// called when loading has errors
	function ( error ) {
		console.log( 'An error happened' );
	}
);

//create the planet
var faceMaterial_planet = new THREE.MeshBasicMaterial({ map: textureLoader.load("./static/models/planet/textures/planet_continental_Base_Color.jpg") });
var sphereGeometry_planet = new THREE.SphereGeometry(150, 32, 32);
var planet = new THREE.Mesh(sphereGeometry_planet, faceMaterial_planet);
planet.position.set(250, -100, 0);
scene.add(planet);

function createStarticles(starsCount) {
    const starsGeometry = new THREE.BufferGeometry();

    const positions = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 2000; // Spread stars across space
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1, sizeAttenuation: true });
    stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

function setupEnvMap() {
    // load the HDRI texture and use it as the environment map to get ambient lighting
    rgbeLoader.load('./static/envMaps/2k_stars_milky_way.hdr', texture => {

        //since we have a spherical map, we need to enable the correct mapping
        texture.mapping = THREE.EquirectangularReflectionMapping;

        //optimize mipmapping of hdri texture
        let envMap = pmremGenerator.fromEquirectangular(texture).texture;

        scene.environment = envMap;

        //free memory
        texture.dispose();
    });

    //load a higher quality jpg texture for the background
    textureLoader.load('./static/envMaps/4k_stars_milky_way.jpg', texture => {

        //the reflection mapping messes up the colorspace so it needs to be adjusted
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.mapping = THREE.EquirectangularReflectionMapping;

        scene.background = texture;

        //free memory
        texture.dispose();
    });

}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Slight rotation for a twinkling effect
    stars.rotation.y += 0.0005;

    //update the orbit controls in animation loop to improve framerate
    orbit.update();

    render();
}

animate();

/**
 * Event Listeners
 */

// Handle window resizing
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

//orbit.addEventListener( 'change', render );

function render() {

    renderer.render( scene, camera );

}
