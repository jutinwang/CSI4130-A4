import * as THREE from "three";

export default class FireParticle {

    particleRateBuffer = 0.0

    colourStops = [
        {t: 0.0, colour: new THREE.Color(0xFFFEBA)},
        {t: 0.25, colour: new THREE.Color(0xFFED59)},
        {t: 0.5, colour: new THREE.Color(0xF88200)},
        {t: 0.75, colour: new THREE.Color(0x706E6E)}
    ];

    sizeStops = [
        {t: 0.0, size: 0.8},
        {t: 0.55, size: 1.8},
        {t: 0.7, size: 2.0},
        {t: 0.75, size: 1.2},
        {t: 1.0, size: 0.9}
    ];

    constructor({
        source = new THREE.Vector3(0, 0, 0), 
        direction = new THREE.Vector3(1, 0, 0),
        scale = new THREE.Vector3(1, 1, 1),
        length = 5,
        radius = 2.5,
        rate = 5,
        speed = 5
    }) {

        //this.source = source;
        this.direction = direction;
        this.length = length;
        this.radius = radius;
        this.rate = rate;
        this.speed = speed;
        this.maxParticles = this.getMaxParticles();

        let end = this.getSplineEndpoint(source, this.direction, this.length);
        this.path = this.getSpline(source, end);

        this.particles = [];
        this.mesh = this.setupMesh(this.maxParticles, source, scale);
    }

    //getters and setters
    setDirection(newDir) {
        this.direction = newDir.normalize();
    }

    getMesh() {
        return this.mesh;
    }
    
    //gets a 3D line curve given two points
    getSpline(v1, v2) {
        return new THREE.LineCurve3(v1, v2);
    }

    //gets the endpoint of a linear spline given a starting vector, direction vector and length
    getSplineEndpoint(start, dir, len) {
        return start.clone().addScaledVector(dir, len);
    }

    getColourAtT(t) {
        for (let i = 0; i < this.colourStops.length - 1; i++) {
            let c1 = this.colourStops[i];
            let c2 = this.colourStops[i + 1];

            //linearly interpolate between two colour stops if appropriate t
            if (c1.t <= t && t <= c2.t) {
                let normT = this.normalizeValue(c1.t, c2.t, t);
                return new THREE.Color().lerpColors(c1.colour, c2.colour, normT);
            }
        }

        //default colour
        return this.colourStops[this.colourStops.length - 1].colour;
    }

    getSizeAtT(t) {
        for (let i = 0; i < this.sizeStops.length - 1; i++) {
            let s1 = this.sizeStops[i];
            let s2 = this.sizeStops[i + 1];

            //linearly interpolate between two colour stops if appropriate t
            if (s1.t <= t && t <= s2.t) {
                let normT = this.normalizeValue(s1.t, s2.t, t);
                let n = THREE.MathUtils.lerp(s1.size, s2.size, normT);
                return n;
            }
        }

        //default colour
        return this.sizeStops[this.sizeStops.length - 1].size;
    }

    normalizeValue(min, max, value) {
        return (value - min) / (max - min)
    }

    //gets the maximum particles for instanced drawing
    getMaxParticles() {
        //get the time it would take for 1 particle to traverse the length
        let maxTime = this.length / this.speed;

        //set max particles as area of emitter circle x number of particles at given time
        return Math.PI * Math.pow(this.radius, 2) * this.rate * maxTime;
    }

    //gets a random point in a circular plane around a point and orthogonal to the direction
    getRandomPointInDisk(center, direction, radius) {
        let normal = direction.clone().sub(center).normalize();

        //need to generate two vectors to form the plane
        let u = new THREE.Vector3();

        if (normal.x == 0 && normal.y == 0) {
            u.addVectors(center, new THREE.Vector3(0, normal.z, -normal.y));
        } else {
            u.addVectors(center, new THREE.Vector3(normal.y, -normal.x, 0));
        }

        //make sure the u vector is normal
        u.normalize();

        let v = new THREE.Vector3().crossVectors(normal, u).normalize();

        //get components for polar coordinates
        let theta = Math.random() * 2 * Math.PI;
        let r = Math.sqrt(Math.random()) * radius;

        //use polar coordinates to get new point in uv
        let offset = u.multiplyScalar(r * Math.cos(theta))
            .add(v.multiplyScalar(r * Math.sin(theta)));

        // Compute the final point
        return center.clone().add(offset);
    }

    getRandomQuaternion() {
        let randVec = new THREE.Vector3(
            Math.random() * 2 - 1, 
            Math.random() * 2 - 1, 
            Math.random() * 2 - 1
        ).normalize();

        let randAngle = Math.random() * Math.PI * 2;

        return new THREE.Quaternion().setFromAxisAngle(randVec, randAngle);
    }

    //sets up the instance mesh with max count particles
    setupMesh(count, position, scale) {

        //set up material
        const material = new THREE.MeshBasicMaterial();

        //set up geometry
        const geometry = new THREE.IcosahedronGeometry(1);

        //set up instanced mesh
        const mesh = new THREE.InstancedMesh(geometry, material, count);

        mesh.position.set(position.x, position.y, position.z);
        mesh.scale.set(scale.x, scale.y, scale.z);

        //the mesh will be drawn every frame
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        //create the instanceColor array to hold enough space for instance colours
        mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);

        return mesh;
    }

    generateParticles(timeElapsed) {
        
        //get the initial scale for all particles from the mesh
        let scale = this.mesh.scale;

        //rotate the direction vector by the mesh's rotation
        //allows the use of Three.js parent-child transformation hierarchy
        let rotDirection = this.direction.clone().applyQuaternion(this.mesh.quaternion);

        //need to get the number of particles to generat at this point
        //smooths the particle rate to accomodate multiple successive calls
        this.particleRateBuffer += timeElapsed;
        let pIter = Math.floor(this.particleRateBuffer * this.rate)
        this.particleRateBuffer -= pIter / this.rate;

        for (let i = 0; i < pIter; i++) {

            //calculate life of a particle
            //must be at least 75% of the max length with some randomness
            let life = ((Math.random() * 0.25) + 0.75) * this.length;

            //get random position of particle at source point
            
            let randPos = this.getRandomPointInDisk(this.mesh.position, rotDirection, this.radius);

            let randRot = this.getRandomQuaternion();

            //add particle to array for later processing
            this.particles.push({
                position: randPos,
                quaternion: randRot,
                scale: scale,
                altScale: scale,
                colour: new THREE.Color(),
                life: life,
                speed: this.speed,
                direction: rotDirection
            });
        }

        
    }

    //updates the mesh geometry with instance data
    updateGeometry() {
        for (let i = 0; i < this.particles.length; i++) {
            let particle = this.particles[i];

            let modelMatrix = new THREE.Matrix4();
            modelMatrix.compose(particle.position, particle.quaternion, particle.altScale);
        
            this.mesh.setMatrixAt(i, modelMatrix);

            this.mesh.setColorAt(i, particle.colour);
        }

        this.mesh.instanceMatrix.needsUpdate = true;
        this.mesh.instanceColor.needsUpdate = true;
    }
    
    updateParticles(timeElapsed) {

        //calculate displacement and life of particle
        for (let p of this.particles) {
            //get the position of the particle
            let particlePos = p.position;

            //calculate displacement
            let displacement = p.direction.clone().multiplyScalar(p.speed * timeElapsed);
            //calculate new position
            particlePos.add(displacement);

            //use displacement to get distance. Will be used to calculate life of particle
            p.life -= displacement.length();
        }

        //only get live particles
        this.particles = this.particles.filter( p => {
            return p.life > 0.0;
        });

        //sort the particles in descending order
        this.particles.sort((p1, p2) => {
            p2.life - p1.life
        });

        let pLength = this.particles.length;

        //make sure the particles do not go over the max particle limit
        if (pLength > this.maxParticles) {
            pLength = this.maxParticles;
        }

        //change the mesh count to reflect the number of particles
        this.mesh.count = pLength;

        //update colour and size of particles
        for (let p of this.particles) {
            let reverseLife = this.length - p.life;

            let t = this.normalizeValue(0, this.length, reverseLife);

            p.colour = this.getColourAtT(t);

            let newScale = p.scale.clone();
            p.altScale = newScale.multiplyScalar(this.getSizeAtT(t));
        }
    }

    //main update method to run in animation cycle
    update(timeElapsed) {
        this.generateParticles(timeElapsed);
        this.updateParticles(timeElapsed);
        this.updateGeometry();
    }
}