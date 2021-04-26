const chalk = require('chalk');
const stringLength = require('string-length');
const table = require('text-table');
const truncate = require('cli-truncate');
const Config = require('../config');
const ui = require('../ui');
const util = require('../util');
const { parseColorArg } = require('./util');

exports.help = `
Usage: color show <color> [<options>]

Show information on one or more colors.

Available options:
  --help, -h             This help
  --format=<format>      Specify a different output format. Available formats:
                         json, long
  --sort                 Sort results (by HSL)
  --json                 Shorthand for '--format=json'
  --long, -l             Shorthand for '--format=long'
  -1                     (The numeric digit one) Force single-column output.
                         Applies to the default format only.
  --columns=<columns>    Comma-separated list of columns to show (long format).
                         Column names: color, hex, rgb, hsl, matches, similar
  --[no-]headers         Show or hide column headers (long format)
  --[no-]truncate        Truncate lines that extend beyond the tty width
                         (long format)
`.trim();

exports.parseOptions = {
    boolean: [
        'headers',
        'json',
        'sort',
        'truncate',
        '1',
    ],
    string: [
        'columns',
        'format',
    ],
    default: {
        headers: true,
        truncate: true,
    },
    alias: {
        long: 'l',
    },
};

/**
 * Function for stringifying the run result.
 *
 * @param {object[]} data Array of color results
 * @param {object} options Configuration options
 * @param {string} [options.format] Output format. One of: "json", "long".
 *   Anything other value will result in the default format.
 * @param {boolean} [options.columns] Specific to the default format. Outputs the results into columns.
 * @param {boolean} [options.headers] Show column headers
 * @param {number} [options.maxWidth] Maxiumum output width in tty columns
 * @param {object} show Data components to display
 * @param {boolean} [options.truncate] Truncate lines to maxWidth
 * @return {string} Run result
 */
function template(data, options) {
    if (options.format === 'json') {
        return JSON.stringify(data.length === 1 ? data[0] : data);
    }

    if (options.format === 'long') {
        const tableData = data.map(result => {
            ['color', 'hex', 'rgb', 'hsl', 'match', 'mostSimilar']
            const cols = [];

            if (options.show.color) {
                cols.push(chalk.bgHex(result.hex)('     '));
            }

            ['hex', 'rgb', 'hsl'].forEach(datum => {
                if (options.show[datum]) {
                    cols.push(result[datum]);
                }
            });

            if (options.show.matches) {
                cols.push(
                    result.matches.length === 0
                        ? 'NO MATCHES'
                        : result.matches.map(m => m.name).join(',')
                );
            }

            if (options.show.mostSimilar) {
                cols.push(
                    result.mostSimilar.length === 0
                        ? 'NO SIMILAR'
                        : result.mostSimilar.map(m => `${m.match.toFixed(2)}%|${m.name}`).join(',')
                );
            }

            return cols;
        });

        if (options.headers) {
            tableData.unshift([
                ['color', 'Color'],
                ['hex', 'HEX'],
                ['rgb', 'RGB'],
                ['hsl', 'HSL'],
                ['matches', 'Matches'],
                ['mostSimilar', 'Similar'],
            ].filter(([datum]) => options.show[datum]).map(([, header]) => header));
        }

        const output = table(tableData, { stringLength });
        return options.maxWidth && options.truncate
            ? output.split('\n').map(line => truncate(line, options.maxWidth)).join('\n')
            : output;
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

    if (state.opts.columns) {
        const showColumns = state.opts.columns.split(',');
        const valid = ['color', 'hex', 'rgb', 'hsl', 'matches', 'similar'];
        const invalid = showColumns.filter(col => !valid.includes(col));

        if (invalid.length > 0) {
            state.options.writeStderr(`Invalid column${invalid.length === 1 ? '' : 's'} specified with '--columns': ${invalid.join(', ')}`);
            state.options.writeStderr(`Use: ${valid.join(', ')}`);
            state.error = true;
            state.done = true;
            return state;
        }

        state.opts.columns = showColumns;
    }

    if (state.opts.json) {
        state.opts.format = 'json';
    }

    if (state.opts.long) {
        state.opts.format = 'long';
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

    const seen = {};
    const data = [];

    colors.forEach(color => {
        // Dedup
        if (seen[color.format('rgb')]) {
            return;
        }

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
        seen[color.format('rgb')] = true;
    });

    if (state.opts.sort) {
        data.sort((a, b) => a.color.compare(b.color));
    }

    state.options.writeStdout(template(data, {
        columns: !!state.options.stdoutColumns && !state.opts[1],
        format: state.opts.format,
        headers: state.opts.headers,
        maxWidth: state.options.stdoutColumns,
        show: {
            color: state.opts.columns ? state.opts.columns.includes('color') : true,
            hex: state.opts.columns ? state.opts.columns.includes('hex') : true,
            rgb: state.opts.columns ? state.opts.columns.includes('rgb') : true,
            hsl: state.opts.columns ? state.opts.columns.includes('hsl') : true,
            matches: state.opts.columns ? state.opts.columns.includes('matches') : true,
            mostSimilar: state.opts.columns ? state.opts.columns.includes('similar') : true,
        },
        truncate: state.opts.truncate,
    }));

    return state;
};
