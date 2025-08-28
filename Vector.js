class Vector {
    constructor(iX, iY) {
        this.x = iX;
        this.y = iY;
        this.length = Math.sqrt(this.x * this.x + this.y * this.y);
    }

    add(iVector) {
        const x = this.x + iVector.x;
        const y = this.y + iVector.y;
        return new Vector(x, y);
    }

    subtract(iVector) {
        const x = this.x - iVector.x;
        const y = this.y - iVector.y;
        return new Vector(x, y);
    }

    multiply(iScalar) {
        const x = this.x * iScalar;
        const y = this.y * iScalar;
        return new Vector(x, y);
    }

    dot(iVector) {
        return this.x * iVector.x + this.y * iVector.y;
    }

    cross(iVector) {
        return this.x * iVector.y - this.y * iVector.x;
    }

    unit() {
        return new Vector(this.x / this.length, this.y / this.length);
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    perpendicular() {
        const x = this.y;
        const y = -this.x;
        return new Vector(x, y);
    }

    toString() {
        return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
    }
}