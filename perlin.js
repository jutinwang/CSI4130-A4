export default class Perlin {

    constructor() {
        this.permutation = this.generatePermutation();
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(a, b, t) {
        return a + t * (b - a);
    }

    grad(hash, x, y) {
        let h = hash & 3;
        return (h === 0 ? x : -x) + (h === 1 ? y : -y);
    }

    generatePermutation() {
        let p = new Uint8Array(512);

        //generate ints from 0 to 255, twice
        for (let i = 0; i < 256; i++) {
            p[i] = p[i + 256] = Math.floor(Math.random() * 256);
        }

        //shuffle the array
        for (let i = p.length; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            let temp = p[i];
            p[i] = p[j];
            p[j] = temp;
        }

        return p;
    }

    generateNoise(x, y) {
        let X = Math.floor(x) & 255;
        let Y = Math.floor(y) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);

        let u = fade(x);
        let v = fade(y);

        let aa = this.permutation[X] + Y;
        let ab = this.permutation[X] + Y + 1;
        let ba = this.permutation[X + 1] + Y;
        let bb = this.permutation[X + 1] + Y + 1;

        return lerp(
            lerp(grad(this.permutation[aa], x, y), grad(this.permutation[ba], x - 1, y), u),
            lerp(grad(this.permutation[ab], x, y - 1), grad(this.permutation[bb], x - 1, y - 1), u),
            v
        );
    }
}