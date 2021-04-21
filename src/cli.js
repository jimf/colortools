const parseOpts = require('minimist');
const pkg = require('../package.json');
const commands = require('./commands');

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

function handleSubcommand(state) {
    const subcommand = state.argv.shift();

    if (subcommand === 'help') {
        const cmd = commands[state.argv[0]];

        if (cmd) {
            state.options.writeStdout(cmd.help);
        } else {
            state.options.writeStderr(`No help available for '${state.argv[0]}'`);
            state.error = true;
        }

        state.done = true;
        return state;
    }

    const cmd = commands[subcommand];

    if (!cmd) {
        state.options.writeStderr(`color: '${subcommand}' is not a command. See 'color --help'.`);
        state.done = true;
        state.error = true;
        return state;
    }

    state.opts = parseOpts(state.argv, cmd.parseOptions);

    if (state.opts.help || state.opts.h) {
        state.options.writeStdout(cmd.help);
        state.done = true;
        return state;
    }

    return cmd.run(state);
}

module.exports = (argv, options) => {
    const pipeTo = next => state =>
        state.done ? state : next(state);

    return Promise.resolve({ argv, done: false, error: false, options })
        .then(pipeTo(parseArgv))
        .then(pipeTo(handleVersionFlag))
        .then(pipeTo(handleHelpFlag))
        .then(pipeTo(handleSubcommand))
        .then(state => {
            return state.error ? 1 : 0;
        })
        .catch((e) => {
            options.writeStderr(e);
            return 1;
        });
};
