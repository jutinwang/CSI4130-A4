import * as THREE from "three";
import WebGL from 'three/addons/capabilities/WebGL.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
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
