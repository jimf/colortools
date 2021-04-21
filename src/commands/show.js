const chalk = require('chalk');
const stringLength = require('string-length');
const table = require('text-table');
const Color = require('../color');
const Config = require('../config');
const ui = require('../ui');
const util = require('../util');

exports.help = `
Usage: color show <color>

Show information on a color.
`.trim();

exports.parseOptions = {
    boolean: 'json',
};

function parseColor(arg) {
    // Minimist parses purely numeric args as numbers. Assume these are
    // intended to be hex colors and parse accordingly.
    if (typeof arg === 'number') {
        arg = String(arg);
        while (arg.length < 6) {
            arg = `0${arg}`;
        }
    }

    if (arg.match(/^[0-9a-fA-F]{6}$/)) {
        // Leading '#' is optional for hex inputs.
        arg = `#${arg}`;
    } else if (arg.match(/^\d{1,3},\d{1,3},\d{1,3}$/)) {
        // 'rgb()' is optional for rgb inputs.
        arg = `rgb(${arg})`;
    }

    return Color.fromString(arg)
}

function template(data, options = {}) {
    if (options.format === 'json') {
        return JSON.stringify(data);
    }

    const dataCol = [
        `Hex: ${data.hex}`,
        `RGB: ${data.rgb}`,
        `HSL: ${data.hsl}`,
    ];

    if (data.matches.length > 0) {
        dataCol.push('', 'Exact Matches:');
        data.matches.slice(0, 3).forEach(match => {
            dataCol.push(match.name);
        });
    } else if (data.mostSimilar.length > 0) {
        dataCol.push('', 'Most Similar:');
        data.mostSimilar.slice(0, 3).forEach(similar => {
            dataCol.push(`${chalk.bgHex(similar.value)('     ')} (${similar.match.toFixed(2)}%) ${similar.name}`);
        });
    }

    return table(
        util.zipWith(
            ui.swatch(options.color),
            dataCol,
            (x, y) => [x, y || '']
        ),
        { stringLength }
    );
}

exports.run = async state => {
    const config = Config(state.options);
    await config.read();
    const colors = new Array(state.opts._.length);

    for (let i = 0; i < colors.length; i += 1) {
        const arg = state.opts._[i];

        try {
            // First try to treat as a color.
            colors[i] = parseColor(arg);
        } catch (e) {
            // If color-parsing failed, see if this arg is a key in the color config.
            const configValue = config.get(['colors', arg]);

            if (configValue) {
                // The config may have been hand-edited with an invalid value,
                // so we must try/catch again.
                try {
                    colors[i] = parseColor(configValue);
                } catch (e) {
                    state.options.writeStderr(`Error: Invalid color value for config.colors.${arg}: ${configValue}`);
                    state.error = true;
                    state.done = true;
                    return state;
                }
            } else {
                state.options.writeStderr(`Error: ${e.message}`);
                state.error = true;
                state.done = true;
                return state;
            }
        }
    }

    const configColors = Object.entries(config.get('colors') || {}).reduce((acc, [key, value]) => {
        const color = Color.fromString(value);

        if (color) {
            acc[key] = color;
        } else {
            state.options.writeStderr(`Warning: Invalid color value specified for config.colors.${key}: ${value}`);
        }

        return acc;
    }, {});

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

        const data = {
            hex: color.format('hex'),
            rgb: color.format('rgb'),
            hsl: color.format('hsl'),
            matches,
            mostSimilar,
        };
        state.options.writeStdout(template(data, {
            color,
            format: state.opts.json ? 'json' : 'default',
        }));
    });

    return state;
};
