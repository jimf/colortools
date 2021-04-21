const path = require('path');
const pkg = require('../package.json');
const { hasProperty } = require('./util');

const normalizePath = objPath =>
    typeof objPath === 'string' ? objPath.split('.') : objPath;

module.exports = options => {
    const PATH = path.join(
        options.env.XDG_CONFIG_HOME || `${options.env.HOME}/.config`,
        pkg.name,
        'config.json'
    );
    let config = {};

    return {
        read() {
            return options.readFile(PATH, 'utf8')
                .then(contents => {
                    config = JSON.parse(contents);
                    return this;
                })
                .catch(() => {
                    config = {
                        colors: {
                            'think:blue-50': '#2669de',
                        },
                    };
                    return this;
                });
        },
        write() {
            return options.writeFile
        },
        get(confPath) {
            confPath = normalizePath(confPath);
            return confPath.reduce((acc, key) => {
                if (typeof acc === 'object' && acc !== null && hasProperty(acc, key)) {
                    return acc[key];
                }
            }, config);
        },
        set(confPath, value) {
            confPath = normalizePath(confPath);
            let obj = config;

            for (let i = 0; i < confPath.length - 1; i += 1) {
                const key = confPath[i];

                if (!hasProperty(obj, key)) {
                    obj[key] = {};
                }

                obj = obj[key];
            }

            obj[confPath[confPath.length - 1]] = value;
            return this;
        },
        remove(confPath) {

        },
    };
};
