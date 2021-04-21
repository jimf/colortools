const chalk = require('chalk');
const Color = require('./color');

const DEFAULT_BG = [Color.fromString('#eeeeee'), Color.fromString('#cccccc')];

/**
 * Generate a color swatch for a given color.
 *
 * @param {Color} color Color to generate a swatch for
 * @param {object} [options] Configuration options
 * @param {Color|Color[]} [options.bgColor] Background color. An array of 2 colors will generate a checkerboard effect.
 * @param {number} [options.height=9] Swatch height in lines (includes padding)
 * @param {number} [options.width=20] Swatch width in columns (includes padding)
 * @return {string[]} Swatch as an array of lines
 */
exports.swatch = (color, options = {}) => {
    const opts = {
        bgColor: DEFAULT_BG,
        height: 9,
        width: 20,
        ...options,
    };
    color = color.format('hex');
    const { width, height } = opts;
    const bgColor = (Array.isArray(opts.bgColor) ? opts.bgColor : [opts.bgColor]).map(c => c.format('hex'));
    const padding = 2;
    const lines = new Array(height);

    for (let row = 0; row < height; row += 1) {
        let line = '';

        for (let col = 0; col < width; col += 1) {
            if (col < padding || col >= (width - padding) || row < padding - 1 || row > height - padding) {
                // Draw background
                line += chalk
                    .bgHex(bgColor[col % bgColor.length])
                    .hex(bgColor[(col + 1) % bgColor.length])('▀');
            } else {
                // Otherwise draw swatch
                line += chalk
                    .bgHex(color)
                    .hex(color)('▀');
            }
        }

        lines[row] = line;
    }

    return lines;
};
