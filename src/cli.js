const parseOpts = require('minimist');
const pkg = require('../package.json');

function parseArgv(state) {
    state.argv = state.argv.slice(2);
    const argv = [];

    while (state.argv.length > 0 && state.argv[0].startsWith('-')) {
        argv.push(state.argv.shift());
    }

    state.opts = parseOpts(argv, {
        boolean: [
            'help',
            'version'
        ],
        alias: {
            help: 'h',
            version: 'V',
        },
    });
    return state;
}

function handleVersionFlag(state) {
    if (state.opts.version || state.argv[0] === 'version') {
        state.options.writeStdout(`${pkg.name} ${pkg.version}`);
        state.done = true;
    }
    return state;
}

function handleHelpFlag(state) {
    if (
        state.opts.help ||
        state.argv.length === 0 ||
        (state.argv.length === 1 && state.argv[0] === 'help')
    ) {
        state.options.writeStdout(`
Usage: color [--version] [--help] <command> [<args>]

where <command> is one of:
    help, version

See 'color help <command>' to read about a specific subcommand.
`.trim());
        state.done = true;
    }

    return state;
}

module.exports = (argv, options) => {
    const pipeTo = next => state =>
        state.done ? state : next(state);

    return Promise.resolve({ argv, done: false, options })
        .then(pipeTo(parseArgv))
        .then(pipeTo(handleVersionFlag))
        .then(pipeTo(handleHelpFlag))
        .then(() => {
            return 0;
        })
        .catch(() => {
            return 1;
        });
};
