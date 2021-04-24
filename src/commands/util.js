const Color = require('../color');

exports.parseColorArg = (arg) => {
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
};
