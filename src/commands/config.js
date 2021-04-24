const Config = require('../config');
const { parseColorArg } = require('./util');

exports.help = `
Usage: color config [<options>]

Read, set, and delete config data.

color config set <key> <value>
color config get <key>
color config delete <key>
color config list
`.trim();

function validateKey(key, state) {
    if (!key) {
        state.options.writeStderr(exports.help);
        state.done = true;
        state.error = true;
    }

    const confPath = key.toString().split('.');

    if (confPath[0] !== 'colors') {
        state.options.writeStderr(`Top-level key "${confPath[0]}" is unrecognized. Try 'colors.${confPath}'`);
        state.done = true;
        state.error = true;
        return state;
    }

    if (confPath[0] === 'colors') {
        const isValid = confPath.slice(1).every(part => part.match(/^[A-Za-z0-9-_:$]+$/));

        if (!isValid) {
            state.options.writeStderr('Invalid color name specified. Color names should only contain:');
            state.options.writeStderr(`  A-Z a-z 0-9 _ : $ -`);
            state.done = true;
            state.error = true;
            return state;
        }
    }

    return state;
}

async function configGet(state) {
    const config = Config(state.options);
    const key = state.opts._[0];
    state = validateKey(key, state);

    if (state.done) {
        return state;
    }

    await config.read();
    const value = config.get(key);

    if (value === undefined) {
        state.done = true;
        state.error = true;
    } else {
        state.options.writeStdout(value);
    }

    return state;
}

async function configSet(state) {
    const config = Config(state.options);
    const key = state.opts._[0];
    const value = state.opts._[1];
    state = validateKey(key, state);

    if (state.done) {
        return state;
    }

    if (!value) {
        state.options.writeStderr(exports.help);
        state.done = true;
        state.error = true;
        return state;
    }

    // TODO: Right now the config only supports colors.
    const color = parseColorArg(value.toString());

    if (!color) {
        state.options.writeStderr(`Invalid color value specified: "${value}"`);
        state.done = true;
        state.error = true;
        return state;
    }

    await config.read();
    config.set(key, color.format('hex'));
    await config.write();
    return state;
}

async function configDelete(state) {
    const config = Config(state.options);
    const key = state.opts._[0];
    state = validateKey(key, state);

    if (state.done) {
        return state;
    }

    await config.read();
    const value = config.get(key);

    if (value) {
        config.remove(key);
        await config.write();
    }

    return state;
}

async function configList(state) {
    const config = Config(state.options);
    await config.read();
    config.entries().forEach(([key, value]) => {
        state.options.writeStdout(`${key} = ${JSON.stringify(value)}`);
    });
    return state;
}

const topics = {
    get: configGet,
    set: configSet,
    delete: configDelete,
    list: configList,
};

exports.run = async state => {
    const topic = state.opts._.shift();

    if (!topics[topic]) {
        state.options.writeStderr(exports.help);
        state.done = true;
        state.error = true;
        return state;
    }

    return topics[topic](state);
};
