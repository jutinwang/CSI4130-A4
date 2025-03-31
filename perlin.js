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
        let p = new Uint8Array(256);

        // fill array with values 0-255
        for (let i = 0; i < 256; i++) {
            p[i] = i;
        }

        // Fisher-Yates shuffle
        for (let i = 255; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [p[i], p[j]] = [p[j], p[i]];
        }

        // duplicate to prevent index errors
        return new Uint8Array([...p, ...p]);
    }

    generateNoise(x, y) {
        let X = Math.floor(x) & 255;
        let Y = Math.floor(y) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);

        let u = this.fade(x);
        let v = this.fade(y);

        let aa = this.permutation[X] + Y;
        let ab = this.permutation[X] + Y + 1;
        let ba = this.permutation[X + 1] + Y;
        let bb = this.permutation[X + 1] + Y + 1;

        return this.lerp(
            this.lerp(this.grad(this.permutation[aa], x, y), this.grad(this.permutation[ba], x - 1, y), u),
            this.lerp(this.grad(this.permutation[ab], x, y - 1), this.grad(this.permutation[bb], x - 1, y - 1), u),
            v
        );
    }
}