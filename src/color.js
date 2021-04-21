const parseColor = require('pure-color/parse');
const rgb2hex = require('pure-color/convert/rgb2hex');
const rgb2hsl = require('pure-color/convert/rgb2hsl');

/**
 * Calculate the distance between two colors, using a weighted Euclidean
 * distance. Result ranges from 0 to 764.8333.
 *
 * Taken from https://www.compuphase.com/cmetric.htm
 *
 * @param {object} c1 Color 1 { r, g, b }
 * @param {object} c2 Color 2 { r, g, b }
 * @return {number} Value between 0 (same color) and ~764.8333 (opposite end of rgb color wheel)
 */
const colorDistance = (c1, c2) => {
    const rmean = (c1.r + c2.r) / 2;
    const r = c1.r - c2.r;
    const g = c1.g - c2.g;
    const b = c1.b - c2.b;
    return Math.sqrt((((512+rmean)*r*r)>>8) + 4*g*g + (((767-rmean)*b*b)>>8));
};

const MAX_DISTANCE = colorDistance({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });

class Color {
    constructor(red, green, blue) {
        this.r = red;
        this.g = green;
        this.b = blue;
    }

    /**
     * Calculate the distance between this and another color. Result is a number
     * between 0 and 1.
     *
     * Taken from https://www.compuphase.com/cmetric.htm
     *
     * @param {Color} other Color to compare with
     * @return {number}
     */
    distance(other) {
        return colorDistance(this, other) / MAX_DISTANCE;
    }

    format(format = 'hex') {
        switch (format) {
            case 'hex':
                return rgb2hex([this.r, this.g, this.b]);

            case 'hsl': {
                const [h, s, l] = rgb2hsl([this.r, this.g, this.b]);
                return `hsl(${Math.round(h)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;
            }

            case 'rgb':
                return `rgb(${this.r}, ${this.g}, ${this.b})`;

            default:
                throw new Error(`Unsupported color format: "${format}"`);
        }
    }
}

Color.fromString = function(colorStr) {
    const result = parseColor(colorStr || '');

    if (!colorStr || !result) {
        throw new Error(`Invalid color. Cannot parse color "${colorStr}"`);
    }

    return new Color(...result.slice(0, 3));
}

module.exports = Color;
