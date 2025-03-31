import * as THREE from "three";
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { TextureLoader } from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PMREMGenerator } from "three";
import { GUI } from "dat.gui";
import { mx_bilerp_0 } from "three/src/nodes/materialx/lib/mx_noise.js";
import FireParticle from "./fire-particle.js";
import Perlin from './perlin.js';

/**
 * Global variables
 */

let stars, fire, fire2, asteroidGroup, scrollFire;
let asteroid = new THREE.Object3D;
let gui, controls;
const clock = new THREE.Clock();
const pi = Math.PI;
let animated = true;
let jumpSpeed = 0.05; // Adjust for faster/slower jumps
let angle = 0;
let bones = {};
let hasExploded = false; // Track explosion state

const scrollStartPos = new THREE.Vector3(7,14,0);
let mvmtAmt = 0.8;
let arrowKeys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};
document.addEventListener("keydown", (event) => {
    if (event.key in arrowKeys) {
        arrowKeys[event.key] = true;
    }
});

document.addEventListener("keyup", (event) => {
    if (event.key in arrowKeys) {
        arrowKeys[event.key] = false;
    }
});

/**
 * Loaders
 */ 
const rgbeLoader = new RGBELoader();
const objLoader = new OBJLoader();
const mtlLoader = new MTLLoader();
const textureLoader = new TextureLoader();
const floader = new FontLoader();

/**
 * Model Loaders
 */
let home = new THREE.Object3D();
let sign = new THREE.Object3D();
let scroll = new THREE.Object3D();
let charlie_brown = new THREE.Object3D();


/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.x = -290;
camera.position.y = 15;
camera.position.z = 25;

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

//for defining the path of the scroll
class StraightLineCurve extends THREE.Curve {
    constructor(start = new THREE.Vector3(0, 0, 0), end = new THREE.Vector3(10, 5, 0)) {
        super();
        this.start = start;
        this.end = end;
        this.direction = end.clone().sub(start).normalize(); // Compute constant direction
    }

    getPoint(t) {
        return this.start.clone().lerp(this.end, t);
    }

    getTangent(t) {
        this.direction = this.end.clone().sub(this.start).normalize(); // Compute constant direction
        return this.direction.clone(); // Constant tangent along the line
    }

    moveStart(x,y) {
        this.start.add(new THREE.Vector3(0,y,x));
    }

    setStart(start) {
        this.start = start;
    }
}

/**
 * Controls
 */
const orbit = new OrbitControls( camera, canvas );
orbit.enableDamping = true;
orbit.dampingFactor = 0.1;
orbit.minDistance = 15;
orbit.maxDistance = 120;

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
generateAsteroids(200, 150, 15, 5, 10);

//create fire particles for the ships exhaust
createShipExhaust();

//create controls
setupControls();


const light = new THREE.AmbientLight(0xffffff, 2); // Soft white light
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

        // load turret onto ship
        // Load the materials
        mtlLoader.load('./static/models/turret/source/turret.mtl', (materials) => {
            materials.preload(); // Preload the materials
            
            // Load the object
            objLoader.setMaterials(materials); // Apply the materials to the object
            objLoader.load('./static/models/turret/source/turret.obj', (turret) => {
                console.log("Turret loaded:", turret);
                ship.add(turret);
                turret.scale.set(0.0029, 0.0029, 0.0029);
                turret.position.set(0, 2, -1);
                turret.rotateY(Math.PI/2);
            });
        });

        //create fire particles for the ships exhaust
        

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

        // Adding text to sign
        floader.load('./static/models/fonts/helvetiker_bold.typeface.json',function(font){
            var geometry = new TextGeometry( 'M A I L   T I M E   !   !', {
                font: font,
                size: 0.75,
                depth:0.025,
                curveSegments: 12,
                bevelEnabled: false,
                bevelThickness: 0.05,
                bevelSize: 0.1,
                bevelSegments: 0.1
            } );
            var txt_mat = new THREE.MeshPhongMaterial({color:0xe33020});
            var txt_mesh = new THREE.Mesh(geometry, txt_mat);
            txt_mesh.scale.set(0.1,0.1);
            txt_mesh.position.set(-0.48, 0.37 ,0.1);
            sign.add(txt_mesh);
        } );
        
        // Adding text to sign
        floader.load('./static/models/fonts/helvetiker_regular.typeface.json',function(font){
            var geometry = new TextGeometry('Charlie Brown wants his mail!', {
                font: font,
                size: 0.35,
                depth:0.025,
                curveSegments: 12,
                bevelEnabled: false,
                bevelThickness: 0.05,
                bevelSize: 0.1,
                bevelSegments: 0.1
            } );
            var txt_mat = new THREE.MeshPhongMaterial({color:0x000000});
            var txt_mesh = new THREE.Mesh(geometry, txt_mat);
            txt_mesh.scale.set(0.1,0.1);
            txt_mesh.position.set(-0.32, 0.27 ,0.1);
            sign.add(txt_mesh);

            var geometry = new TextGeometry('Justin Wang, Tom Latimer, Timothy Mao', {
                font: font,
                size: 0.35,
                depth:0.025,
                curveSegments: 12,
                bevelEnabled: false,
                bevelThickness: 0.05,
                bevelSize: 0.1,
                bevelSegments: 0.1
            } );
            var txt_mat = new THREE.MeshPhongMaterial({color:0x000000});
            var txt_mesh = new THREE.Mesh(geometry, txt_mat);
            txt_mesh.scale.set(0.1,0.1);
            txt_mesh.position.set(-0.42, 0.17 ,0.1);
            sign.add(txt_mesh);
            
        } );

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

// Charlie Brown
gltfLoader.load('./static/models/charlie_brown/scene.gltf', function ( gltf ) {
    const brownTexture = textureLoader.load("./static/models/charlie_brown/textures/01_-_Default_baseColor.png");
  // Enable texture wrapping to prevent stretching
  brownTexture.wrapS = THREE.RepeatWrapping;
  brownTexture.wrapT = THREE.RepeatWrapping;
  brownTexture.flipY = false; // Sometimes GLTF models require this fix

  charlie_brown = gltf.scene;

  charlie_brown.traverse((child) => {
      if (child.isMesh || child.isSkinnedMesh) {          
          // Ensure child has a material
          if (child.material) {
              // If the mesh has multiple materials, apply texture to all
              if (Array.isArray(child.material)) {
                  child.material.forEach((mat) => {
                      mat.map = brownTexture;
                      mat.needsUpdate = true;
                  });
              } else {
                  // Single material case
                  child.material.map = brownTexture;
                  child.material.needsUpdate = true;
              }
          }
      }

      if (child.isBone) {
          bones[child.name] = child;
      }
  });

    // Adjust model positioning
    charlie_brown.scale.set(25, 25, 25);
    charlie_brown.position.set(-6, 0, -5);
    charlie_brown.rotateY(-Math.PI / 1.75);
    scene.add(charlie_brown);

    animateJump();
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
let linePath = new StraightLineCurve(scrollStartPos, new THREE.Vector3(90,11.5,0));

let movementTime = 0;
let movementSpeed = 0.01; // control swim speed

// Scroll / Newspaper loader
gltfLoader.load('./static/models/stylized_note/scene.gltf', function ( gltf ) {
    scroll = gltf.scene;
    
    scroll.scale.set(3, 3, 3);
    scroll.rotateY(-Math.PI/1.55)
    scene.add(scroll);
    
    scrollFire = new FireParticle({
        source: new THREE.Vector3(-1.8, 0.25, 0),
        direction: new THREE.Vector3(-1, 0, 0).normalize(), 
        scale: new THREE.Vector3(0.25, 0.25, 0.25),
        length: 7, 
        radius: 2.5, 
        rate: 70, 
        speed: 15
    });
    scroll.add(scrollFire.getMesh());

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

    if ( scrollFire != undefined) {
        scrollFire.update(delta);
    }
    
    updateSunTexture(delta);
    
    // Slight rotation for a twinkling effect
    stars.rotation.y += 0.0005;

    //rotate asteroids
    if (asteroidGroup != undefined) {
        asteroidGroup.rotation.y = (asteroidGroup.rotation.y + (Math.pow(2, -5) * delta)) % (Math.PI * 2)
    }

    //update the orbit controls in animation loop to improve framerate
    orbit.update();

    render();
}
animate();

function createExplosion(position) {
    const particleCount = 100;
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = position.x;
        positions[i * 3 + 1] = position.y;
        positions[i * 3 + 2] = position.z;

        // Random velocity for explosion effect
        velocities.push(
            (Math.random() - 0.5) * 5, // X velocity
            (Math.random() - 0.5) * 5, // Y velocity
            (Math.random() - 0.5) * 5  // Z velocity
        );
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMaterial = new THREE.PointsMaterial({
        color: 0xffd700, // Gold color for explosion
        size: 2,
        transparent: true,
        opacity: 1,
    });

    const explosionParticles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(explosionParticles);

    // Animate explosion (particles spreading out)
    let explosionTime = 0;
    function animateExplosion() {
        if (explosionTime > 1) {
            scene.remove(explosionParticles); // Remove explosion after effect
            return;
        }

        explosionTime += 0.02;

        const positionsArray = particlesGeometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
            positionsArray[i * 3] += velocities[i * 3] * 0.5;
            positionsArray[i * 3 + 1] += velocities[i * 3 + 1] * 0.5;
            positionsArray[i * 3 + 2] += velocities[i * 3 + 2] * 0.5;
        }
        particlesGeometry.attributes.position.needsUpdate = true;

        requestAnimationFrame(animateExplosion);
    }
    animateExplosion();
}

function animateScroll() {
    requestAnimationFrame(animateScroll);

    if (animated) { // for animation toggle

        movementTime += movementSpeed; // Increase movement along the curve
        let time = movementTime % 1; // Keep time between 0 and 1
        let position = linePath.getPoint(time);
        let tangent = linePath.getTangent(time).normalize();
        if (scroll) {
            if (arrowKeys.ArrowUp) {
                //console.log("up key press")
                linePath.moveStart(0, mvmtAmt);
                tangent = linePath.getTangent(time).normalize();
            }
            if (arrowKeys.ArrowDown) {
                //console.log("down key press")
                linePath.moveStart(0, -mvmtAmt);
                tangent = linePath.getTangent(time).normalize();
            }
            if (arrowKeys.ArrowLeft) {
                //console.log("left key press")
                linePath.moveStart(-mvmtAmt, 0);
                tangent = linePath.getTangent(time).normalize();
            }
            if (arrowKeys.ArrowRight) {
                //console.log("right key press")
                linePath.moveStart(mvmtAmt, 0);
                tangent = linePath.getTangent(time).normalize();
            }
            scroll.position.set(-100 + position.x, -10 + position.y, 0 + position.z);
          
            scroll.rotateOnAxis(linePath, Math.PI/4)
          
            let quaternion = new THREE.Quaternion();
            quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tangent); // Align scroll forward to tangent
            scroll.quaternion.copy(quaternion);
            
            // Trigger explosion **only once** when reaching the end
            if (time > 0.99 && !hasExploded) { 
                linePath.setStart(new THREE.Vector3(7,14,0));
                let explosionPosition = scroll.position.clone(); // Capture position BEFORE reset
                createExplosion(explosionPosition); // Use captured position
                hasExploded = true; // Mark explosion as triggered
            }

            // Reset explosion flag when movement starts over
            if (time < movementSpeed) {
                hasExploded = false;
            }
        }
    }
    render();
}


function animateJump() {
    requestAnimationFrame(animateJump);

    angle += jumpSpeed;
    
    if (!bones || !charlie_brown) {
        console.error("Bones not loaded yet!");
        return;
    }

    // **Jump Height Calculation**
    let jumpHeight = Math.sin(angle) * 3; // Moves up/down smoothly
    charlie_brown.position.y = 1.95 + jumpHeight;

    // **Arms Transition (0 when down, 1 when up)**
    let peakFactor = (Math.sin(angle) + 1) / 2; // Maps -1 to 1 → 0 to 1

    let armRaise = peakFactor * 1;  // Arms fully raised at 1
    let legSpread = peakFactor * 1; // Legs fully apart at 1

    // **Apply animation to limbs**
    if (bones.joint_KneeLT_01_076 && bones.joint_KneeRT_01_081) {
        bones.joint_KneeLT_01_076.rotation.x = legSpread;
        bones.joint_KneeRT_01_081.rotation.x = legSpread;
    }

    if (bones.joint_ShoulderLT_01_048 && bones.joint_ShoulderRT_01_062) {
        bones.joint_ShoulderLT_01_048.rotation.x = armRaise;
        bones.joint_ShoulderRT_01_062.rotation.x = armRaise;
    }

    renderer.render(scene, camera);
}

/**
 * Set up controls
 */
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
