import * as THREE from "three";
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TextureLoader } from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PMREMGenerator } from "three";
import { GUI } from "dat.gui";
import FireParticle from "./fire-particle.js";
import Perlin from './perlin.js';

/**
 * Global variables
 */
let stars, fire, fire2, asteroidGroup;
let asteroid = new THREE.Object3D;
const clock = new THREE.Clock();

/**
 * Loaders
 */ 
const gltfLoader = new GLTFLoader();
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
orbit.minDistance = 15;
orbit.maxDistance = 100;

//Setup scene
const scene = new THREE.Scene();

//setup environment map and background texture
setupEnvMap();

// Create starfield
createStarticles(3000);

//create fire effect
createShipExhaust();

//create the sun
const perlin = new Perlin();

let textureSize = 1024;
let noiseScale = 10;

//make the texture size **3 times 3 for vec3's
let textureData = new Uint8Array(textureSize * textureSize * 4);
let texture = new THREE.DataTexture(textureData, textureSize, textureSize, THREE.RGBAFormat);
texture.needsUpdate = true;

let sunShade = new THREE.Color(0xde3009);
let sunShade2 = new THREE.Color(0xfae04b);

let sunGeometry = new THREE.SphereGeometry(200, 64, 64);
let sunMaterial = new THREE.MeshStandardMaterial({ 
    map: texture
});
let sun = new THREE.Mesh(sunGeometry, sunMaterial);

sun.position.set(500, 100, -500);
scene.add(sun);

//generate the asteroid belt
generateAsteroids(200, 100, 15, 5, 10);

const light = new THREE.AmbientLight(0xffffff, 0.1); // Soft white light
scene.add(light);

const sunLight = new THREE.DirectionalLight(0xffffff, 20); 
sunLight.position.set(500, 100, -500);  
sunLight.target.position.set(0, 0, 0);
scene.add(sunLight);

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

        //create fire particles for the ships exhaust
        

        ship.add(fire.getMesh());
        ship.add(fire2.getMesh());
        ship.position.set(-50, 0,0);
        //ship.scale.set(30,30,30);
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
var sphereGeometry_planet = new THREE.SphereGeometry(25, 32, 32);
var planet = new THREE.Mesh(sphereGeometry_planet, faceMaterial_planet);
planet.position.set(0, 0, 0);
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

function createShipExhaust() {
    fire = new FireParticle({
        source: new THREE.Vector3(-1.5, 0, -1.7),
        direction: new THREE.Vector3(0, 0, -1).normalize(), 
        scale: new THREE.Vector3(0.5, 0.5, 0.5),
        length: 15, 
        radius: 1, 
        rate: 15, 
        speed: 5
    });
    
    fire2 = new FireParticle({
        source: new THREE.Vector3(1.5, 0, -1.7),
        direction: new THREE.Vector3(0, 0, -1).normalize(), 
        scale: new THREE.Vector3(0.5, 0.5, 0.5),
        length: 15, 
        radius: 1, 
        rate: 15, 
        speed: 5
    });
    
    // let fire3 = new FireParticle({
    //     source: new THREE.Vector3(0, 0, 0),
    //     direction: new THREE.Vector3(0, 1, 0).normalize(), 
    //     scale: new THREE.Vector3(1, 1, 1),
    //     length: 50, 
    //     radius: 2.5, 
    //     rate: 70, 
    //     speed: 15
    // });
    // scene.add(fire3.getMesh());
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

function updateSunTexture(elapsedTime) {
    for (let y = 0; y < textureSize; y++) {
        for (let x = 0; x < textureSize; x++) {

            
            let t = perlin.generateNoise((x / noiseScale) + (elapsedTime * 0.5), (y / noiseScale) + (elapsedTime * 0.5));

            //normalize to the range 0,1
            t = (t + 1) / 2;

            // interpolate between the sun colours
            let interpColour = new THREE.Color().lerpColors(sunShade, sunShade2, t);

            let index = (y * textureSize + x) * 4;
            textureData[index] = interpColour.r * 255;
            textureData[index + 1] = interpColour.g * 255;
            textureData[index + 2] = interpColour.b * 255;
            texture[index + 3] = 255;
        }
    }

    texture.needsUpdate = true;
}

function generateAsteroids(numAsteroids, radius, variationX, variationY, variationZ) {

    gltfLoader.load('./static/models/asteroid/scene.gltf', function ( gltf ) {
        const asteroidTexture = textureLoader.load("./static/models/asteroid/textures/material_0_baseColor.png");
        const asteroidTexture2 = textureLoader.load("./static/models/asteroid/textures/material_0_metallicRoughness.png");
        const asteroidTexture3 = textureLoader.load("./static/models/asteroid/textures/material_0_normal.png");

        asteroidTexture.flipY = false;
        
        asteroidTexture2.flipY = false;
        
        asteroidTexture3.flipY = false;
        asteroid = gltf.scene;
        asteroid.traverse((child) => {
            if (child.isMesh) {
                console.log(child.name);
                
                //apply materials to the mesh
                let material = new THREE.MeshStandardMaterial({
                    map: asteroidTexture,             
                    metalnessMap: asteroidTexture2,   
                    normalMap: asteroidTexture3,      
                    //roughness: 0.5,                   
                    //metalness: 0.5,                   
                });
    
                //assign material to child mesh
                child.material = material;
            }
    
        });

        asteroidGroup = new THREE.Group();
        scene.add(asteroidGroup);
        for (let i = 0; i < numAsteroids; i++) {

            //random angle in the circle
            const angle = Math.random() * Math.PI * 2;
    
            //get random perlin noise values for the x, y, z coordinates
            const noiseX = perlin.generateNoise(i / 10, 0) * variationX;
            const noiseY = perlin.generateNoise(i / 10, 1) * variationY;
            const noiseZ = perlin.generateNoise(i / 10, 2) * variationZ;
            
            //convert polar coordinates to Cartesian
            const x = (radius + noiseX) * Math.cos(angle);
            const y = noiseY;
            const z = (radius + noiseZ) * Math.sin(angle);

            let newAst = asteroid.clone();
            newAst.position.set(x, y, z);
            asteroidGroup.add(newAst);

        }

	},
	// called while loading is progressing
	function ( xhr ) {
		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	// called when loading has errors
	function ( error ) {
		console.log( error);
	});

    
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    let delta = clock.getDelta();

    //update the particle emitters with elapsed time
    fire.update(delta);
    fire2.update(delta);
    //fire3.update(delta);
    updateSunTexture(delta);
    
    // Slight rotation for a twinkling effect
    stars.rotation.y += 0.0005;

    //rotate asteroids
    asteroidGroup.rotation.y = (asteroidGroup.rotation.y + (Math.pow(2, -5) * delta)) % (Math.PI * 2)

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
