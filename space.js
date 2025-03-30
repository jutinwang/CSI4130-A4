import * as THREE from "three";
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { TextureLoader } from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PMREMGenerator } from "three";
import { GUI } from "dat.gui";
import FireParticle from "./fire-particle.js";

/**
 * Global variables
 */
let stars, fire, fire2;
let gui, controls;
const clock = new THREE.Clock();

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
orbit.minDistance = 15;
orbit.maxDistance = 100;

//Setup scene
const scene = new THREE.Scene();

//setup environment map and background texture
setupEnvMap();

// Create starfield
createStarticles(3000);

// load ship
createShip();

//create fire particles for the ships exhaust
createShipExhaust();

//create controls
setupControls();

const light = new THREE.AmbientLight(0xffffff, 2); // Soft white light
scene.add(light);


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

function createShip() {
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

//setup dat.gui controls
function setupControls() {

    controls = new function() {
        this.fireParams = { 
            scale: 0.5,
            length: 15, 
            radius: 1, 
            rate: 15, 
            speed: 5
        };

        this.updateFireScale = () => {
            fire.setScale(this.fireParams.scale);
            fire2.setScale(this.fireParams.scale);
        }

        this.updateFireLength = () => {
            fire.setLength(this.fireParams.length);
            fire2.setLength(this.fireParams.length);
        }
        this.updateFireRadius = () => {
            fire.setRadius(this.fireParams.radius);
            fire2.setRadius(this.fireParams.radius);
        }
        this.updateFireRate = () => {
            fire.setRate(this.fireParams.rate);
            fire2.setRate(this.fireParams.rate);
        }
        this.updateFireSpeed = () => {
            fire.setSpeed(this.fireParams.speed);
            fire2.setSpeed(this.fireParams.speed);
        }
    }
    gui = new GUI();

    //let folder = gui.addFolder('Solar System');
    //add general solar system controls here

    let folder = gui.addFolder('Spaceship Parameters');
    folder.add(controls.fireParams, 'scale', 0.5, 3).onChange(controls.updateFireScale).name('Particle Scale');
    folder.add(controls.fireParams, 'length', 5, 50).onChange(controls.updateFireLength).name('Particle Length');
    folder.add(controls.fireParams, 'radius', 0.5, 5).onChange(controls.updateFireRadius).name('Emitter Radius');
    folder.add(controls.fireParams, 'rate', 1, 50).onChange(controls.updateFireRate).name('Particle Rate');
    folder.add(controls.fireParams, 'speed', 0.5, 25).onChange(controls.updateFireSpeed).name('Particle Speed');
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
