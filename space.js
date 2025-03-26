import * as THREE from "three";
import WebGL from 'three/addons/capabilities/WebGL.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { TextureLoader } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from "dat.gui";

// Setup scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create starfield
const starsGeometry = new THREE.BufferGeometry();
const starsCount = 5000;
const positions = new Float32Array(starsCount * 3);

for (let i = 0; i < starsCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 2000; // Spread stars across space
}

starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1, sizeAttenuation: true });
const stars = new THREE.Points(starsGeometry, starsMaterial);
scene.add(stars);

const light = new THREE.AmbientLight(0xffffff, 2); // Soft white light
scene.add(light);

// instantiate loaders
const loader = new OBJLoader();
const textureLoader = new TextureLoader();
// load ship
loader.load(

	// resource URL
	'ship/Ship.obj',
	// called when resource is loaded
	function ( ship ) {
        const shipTexture = textureLoader.load("ship/textures/Albedo_Ship.png");
        const engineTexture = textureLoader.load("ship/textures/Albedo_Engine.png");
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

var faceMaterial_planet = new THREE.MeshBasicMaterial({ map: textureLoader.load("planet_continental_Base_Color.jpg") });
    var sphereGeometry_planet = new THREE.SphereGeometry(150, 32, 32);
    var planet = new THREE.Mesh(sphereGeometry_planet, faceMaterial_planet);
    planet.position.set(250, -100, 0);
    scene.add(planet);

camera.position.z = 500;

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Slight rotation for a twinkling effect
    stars.rotation.y += 0.0005;
    renderer.render(scene, camera);
}

animate();

// Handle window resizing
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

const orbit = new OrbitControls( camera, renderer.domElement );
    orbit.minDistance = 350;
    orbit.maxDistance = 500;
    orbit.addEventListener( 'change', render );

function render() {

    renderer.render( scene, camera );

}
