const chalk = require('chalk');
const stringLength = require('string-length');
const table = require('text-table');
const Config = require('../config');
const ui = require('../ui');
const util = require('../util');
const { parseColorArg } = require('./util');

exports.help = `
Usage: color show <color> [<options>]

Show information on a color.

Available options:
  --help, -h             This help
  --format=<format>      Specify a different output format. Available formats:
                         json
  --json                 Shorthand for '--format=json'
  -1                     (The numeric digit one) Force single-column output.
                         Applies to the default format only.
`.trim();

exports.parseOptions = {
    boolean: [
        'json',
        '1',
    ],
    string: [
        'format',
    ],
};

/**
 * Function for stringifying the run result.
 *
 * @param {object[]} data Array of color results
 * @param {object} options Configuration options
 * @param {string} options.format Output format. One of: "json".
 *   Anything other value will result in the default format.
 * @param {boolean} options.columns Specific to the default format. Outputs the results into columns.
 * @param {number} [options.maxWidth] Maxiumum output width in tty columns
 * @return {string} Run result
 */
function template(data, options) {
    if (options.format === 'json') {
        return JSON.stringify(data.length === 1 ? data[0] : data);
    }

    const swatches = data.map(result => {
        const resultCol = [
            `HEX: ${result.hex}`,
            `RGB: ${result.rgb}`,
            `HSL: ${result.hsl}`,
        ];

        if (result.matches.length > 0) {
            resultCol.push('', 'Exact Matches:');
            result.matches.slice(0, 3).forEach(match => {
                resultCol.push(match.name);
            });
        } else if (result.mostSimilar.length > 0) {
            resultCol.push('', 'Most Similar:');
            result.mostSimilar.slice(0, 3).forEach(similar => {
                resultCol.push(`${chalk.bgHex(similar.value)('     ')} (${similar.match.toFixed(2)}%) ${similar.name}`);
            });
        }

        return table(
            util.zipWith(
                ui.swatch(result.color),
                resultCol,
                (x, y) => [x, y || '']
            ),
            { stringLength }
        );
    });

    if (options.columns) {
        return table(
            ui.columnize(
                swatches.map(swatch => swatch.split('\n')),
                {
                    marginX: 2,
                    marginY: 1,
                    maxWidth: options.maxWidth,
                }
            ),
            { stringLength }
        );
    }

    return swatches.join('\n\n');
}

exports.run = async state => {
    if (state.opts._.length === 0) {
        state.options.writeStdout(exports.help);
        state.done = true;
        return state;
    }

    if (state.opts.json) {
        state.opts.format = 'json';
    }

    const config = Config(state.options);
    await config.read();
    const colors = [];

    for (let i = 0; i < state.opts._.length; i += 1) {
        const arg = state.opts._[i];

        try {
            // First try to treat as a color.
            colors.push(parseColorArg(arg));
        } catch (e) {
            // If color-parsing failed, see if this arg is a key in the color config.
            const configValues = config.match(['colors', arg]).reduce((acc, value) => {
                try {
                    acc.push(parseColorArg(value));
                } catch (err) {
                    // Safe to ignore. A warning will get generated when we parse the
                    // config colors below.
                }

                return acc;
            }, []);

            if (configValues.length > 0) {
                colors.push(...configValues);
            } else {
                state.options.writeStderr(`Error: ${e.message}`);
                state.error = true;
                state.done = true;
                return state;
            }
        }
    }

    const configColors = Object.entries(config.get('colors') || {}).reduce((acc, [key, value]) => {
        try {
            acc[key] = parseColorArg(value);
        } catch (e) {
            state.options.writeStderr(`Warning: Invalid color value specified for config.colors.${key}: ${value}`);
        }

        return acc;
    }, {});

    const data = [];

    colors.forEach(color => {
        const { matches, mostSimilar } = Object.keys(configColors).reduce((acc, name) => {
            const distance = color.distance(configColors[name]);

            if (distance === 0) {
                acc.matches.push({ name, value: color.format('hex') });
            } else if (distance < 0.05) {
                acc.mostSimilar.push({
                    name,
                    value: color.format('hex'),
                    distance,
                    match: (1 - distance) * 100,
                });
            }

            return acc;
        }, { matches: [], mostSimilar: [] });

        mostSimilar.sort((a, b) => b.match - a.match);

        data.push({
            color,
            hex: color.format('hex'),
            rgb: color.format('rgb'),
            hsl: color.format('hsl'),
            matches,
            mostSimilar,
        });
    });

    state.options.writeStdout(template(data, {
        columns: !!state.options.stdoutColumns && !state.opts[1],
        format: state.opts.format,
        maxWidth: state.options.stdoutColumns,
    }));

    return state;
};
