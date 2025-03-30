import * as THREE from "three";
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { TextureLoader } from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PMREMGenerator } from "three";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from "dat.gui";
import FireParticle from "./fire-particle.js";

/**
 * Global variables
 */
let stars, fire, fire2;
const clock = new THREE.Clock();
const pi = Math.PI;
let animated = true;

/**
 * Loaders
 */ 
const cubeTextureLoader = new THREE.CubeTextureLoader();
const rgbeLoader = new RGBELoader();
const objLoader = new OBJLoader();
const textureLoader = new TextureLoader();
const gltfLoader = new GLTFLoader();

/**
 * Model Loaders
 */
let home = new THREE.Object3D();
let sign = new THREE.Object3D();
let scroll = new THREE.Object3D();


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

class SinwaveCurve extends THREE.Curve { // From the lab
    constructor(aSpeed = 3, bSpeed = 2, delta = pi / 2, scale = 3) {
        super();
        this.aSpeed = aSpeed; // Lissajous frequency in x
        this.bSpeed = bSpeed; // Lissajous frequency in y
        this.delta = delta; // Phase shift
        this.scale = scale; // Overall scale of movement
    }

    getPoint(t) {
        let x = t * this.aSpeed * 10;  // Moves forward in X direction
        let y = this.scale * Math.sin(t * Math.PI * this.bSpeed + this.delta); // Sine wave in Y
        let z = this.scale * Math.cos(t * Math.PI * this.bSpeed + this.delta);  // Keep Z fixed
        return new THREE.Vector3(x, y, z).multiplyScalar(this.scale);
    }
}
let sinWavePath = new SinwaveCurve();

let movementTime = 0;
let movementSpeed = 0.0010; // control swim speed

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

        //create fire particles for the ships exhaust
        createShipExhaust();

        ship.add(fire.getMesh());
        ship.add(fire2.getMesh());
        ship.position.set(-100, 0,0);
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
var sphereGeometry_planet = new THREE.SphereGeometry(35, 32, 32);
var planet = new THREE.Mesh(sphereGeometry_planet, faceMaterial_planet);
planet.position.set(0, -35, 0);
scene.add(planet);


// Load home
gltfLoader.load('./static/models/home/source/home.glb', function ( gltf ) {
        const homeTexture = textureLoader.load("./static/models/home/textures/gltf_embedded_0.png");
        const extraHomeTexture = textureLoader.load("./static/models/home/textures/gltf_embedded_1.png");
        home = gltf.scene;
        home.traverse((child) => {
            if (child.isMesh) {
                // Assign materials based on object name
                if (child.name.includes("")) {
                    child.material = new THREE.MeshStandardMaterial({ map: homeTexture });
                } else if (child.name.includes("node_id115")) {
                    child.material = new THREE.MeshStandardMaterial({ map: extraHomeTexture });
                } else {
                    child.material = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Default material
                }
            }
    
        });
        home.scale.set(25, 25, 25);
        home.position.set(9, 3.5, 5); // x, y, z (x = left right, y = up down, z = diagonal)
        home.rotateY(-Math.PI/1.55)
        scene.add(home);

	},
	// called while loading is progressing
	function ( xhr ) {
		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	// called when loading has errors
	function ( error ) {
		console.log( error);
	}
);

// Wooden Sign
gltfLoader.load('./static/models/wooden_sign/scene.gltf', function ( gltf ) {
        const signTexture = textureLoader.load("./static/models/wooden_sign/textures/lambert1_baseColor.jpeg");
        sign = gltf.scene;
        sign.traverse((child) => {
            if (child.isMesh) {
                // Assign materials based on object name
                if (child.name.includes("")) {
                    child.material = new THREE.MeshStandardMaterial({ map: signTexture });
                    
                } else {
                    child.material = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Default material
                }
            }
        });
        sign.scale.set(25, 25, 25);
        sign.position.set(9, 3.5, 5); // x, y, z (x = left right, y = up down, z = diagonal)
        sign.rotateY(-Math.PI/1.55)
        scene.add(sign);

	},
	// called while loading is progressing
	function ( xhr ) {
		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	// called when loading has errors
	function ( error ) {
		console.log( error);
	}
);

// Scroll / Newspaper loader
gltfLoader.load('./static/models/stylized_note/scene.gltf', function ( gltf ) {
    scroll = gltf.scene;
    
    scroll.scale.set(3, 3, 3);
    scroll.rotateY(-Math.PI/1.55)
    scene.add(scroll);

    animateScroll();

},
// called while loading is progressing
function ( xhr ) {
    console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
},
// called when loading has errors
function ( error ) {
    console.log( error);
}
);

// Create the starfield
function createStarticles(starsCount) {
    const starsGeometry = new THREE.BufferGeometry();

    const positions = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 2000; // Spread stars across space
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, sizeAttenuation: true });
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

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    let delta = clock.getDelta();

    //update the particle emitters with elapsed time
    fire.update(delta);
    fire2.update(delta);
    //fire3.update(delta);
    
    // Slight rotation for a twinkling effect
    stars.rotation.y += 0.0005;

    //update the orbit controls in animation loop to improve framerate
    orbit.update();

    render();
}
animate();

// function createExplosion(position) {
//     const particleCount = 100;
//     const particlesGeometry = new THREE.BufferGeometry();
//     const positions = new Float32Array(particleCount * 3);
//     const velocities = [];

//     for (let i = 0; i < particleCount; i++) {
//         positions[i * 3] = position.x;
//         positions[i * 3 + 1] = position.y;
//         positions[i * 3 + 2] = position.z;

//         // Random velocity for explosion effect
//         velocities.push(
//             (Math.random() - 0.5) * 5, // X velocity
//             (Math.random() - 0.5) * 5, // Y velocity
//             (Math.random() - 0.5) * 5  // Z velocity
//         );
//     }

//     particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
//     const particlesMaterial = new THREE.PointsMaterial({
//         color: 0xffd700, // Gold color for explosion
//         size: 2,
//         transparent: true,
//         opacity: 1,
//     });

//     const explosionParticles = new THREE.Points(particlesGeometry, particlesMaterial);
//     scene.add(explosionParticles);

//     // Animate explosion (particles spreading out)
//     let explosionTime = 0;
//     function animateExplosion() {
//         if (explosionTime > 1) {
//             scene.remove(explosionParticles); // Remove explosion after effect
//             return;
//         }

//         explosionTime += 0.02;

//         const positionsArray = particlesGeometry.attributes.position.array;
//         for (let i = 0; i < particleCount; i++) {
//             positionsArray[i * 3] += velocities[i * 3] * 0.5;
//             positionsArray[i * 3 + 1] += velocities[i * 3 + 1] * 0.5;
//             positionsArray[i * 3 + 2] += velocities[i * 3 + 2] * 0.5;
//         }
//         particlesGeometry.attributes.position.needsUpdate = true;

//         requestAnimationFrame(animateExplosion);
//     }
//     animateExplosion();
// }

function animateScroll() {
    requestAnimationFrame(animateScroll);

    if (animated) { // for animation toggle
        movementTime += movementSpeed; // Increase movement along the curve
        let time = movementTime % 1; // Keep time between 0 and 1
        let position = sinWavePath.getPoint(time);
        let tangent = sinWavePath.getTangent(time).normalize();

        if (scroll) {
            // Offset the curve's position to start at (-50, 0, 0)
            scroll.position.set(-100 + position.x, -10 + position.y, 0 + position.z); // controls starting position of scroll
    
            let quater = new THREE.Quaternion();
            let flip = new THREE.Quaternion();

            quater.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tangent);
            flip.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
            scroll.quaternion.multiplyQuaternions(quater, flip);

            // if (movementTime % 1 == 0) {
            //     createExplosion(scroll.position); // Explosion at final position
            // }
        }
    }
    render();
}

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
