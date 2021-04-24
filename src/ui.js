const chalk = require('chalk');
const stringLength = require('string-length');
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

const maxLength = xs => xs.reduce((acc, x) => Math.max(acc, stringLength(x)), 0);
const sum = xs => xs.reduce((x, y) => x + y, 0);
const zipN = (arrs, fillValue) => {
    const len = arrs.reduce((acc, arr) => Math.max(acc, arr.length), 0);
    const result = new Array(len);

    for (let i = 0; i < len; i += 1) {
        result[i] = new Array(arrs.length);

        for (let j = 0; j < arrs.length; j += 1) {
            result[i][j] = arrs[j] && arrs[j][i];

            if (result[i][j] === undefined) {
                result[i][j] = fillValue;
            }
        }
    }

    return result;
};

exports.columnize = (items, options) => {
    const opts = {
        marginX: 0,
        marginY: 0,
        ...options,
    };
    const itemWidths = items.map(maxLength);
    let rows;
    let cols;

    // First calculate the optimal grid dimensions by brute-force, generating
    // every combination of COLSxROWS combinations that will accomodate our
    // number of items, and determining the widths that each column will
    // require, comparing with our upper bound.
    //
    // NOTE: Some combinations will have holes. For example, 10 items can be
    // arranged in a 3x4 grid, but there will be two empty spots in the last
    // column.
    for (rows = 1; rows <= items.length; rows += 1) {
        // First determine the number of columns and rows for this iteration.
        cols = Math.floor((items.length + rows - 1) / rows);

        // Next track the max width for each column.
        const colWidths = new Array(cols).fill(0);
        itemWidths.forEach((width, idx) => {
            const col = Math.floor(idx / rows);
            colWidths[col] = Math.max(width, colWidths[col]);
        });

        // Finally check the total necessary width against our upper bound,
        // breaking if this combination of COLSxROWS can fit.
        const totalWidth = sum(colWidths) + (opts.marginX * (cols - 1));
        if (totalWidth <= opts.maxWidth) {
            break;
        }
    }

    // Now generate a grid and populate it with our items, filling columns
    // before rows.
    const grid = Array.from({ length: rows }, () => new Array(cols).fill(['']));

    items.forEach((item, idx) => {
        const x = Math.floor(idx / rows);
        const y = idx % rows;
        grid[y][x] = item;

        if (opts.marginY && y > 0) {
            grid[y][x].unshift(...(new Array(opts.marginY).fill('')));
        }
    });

    // With the grid fully populated, we must then zip them, forming
    // consecutive rows of line data.
    return grid.flatMap(row => zipN(row, ''));
}
