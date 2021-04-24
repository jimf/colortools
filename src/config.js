const path = require('path');
const pkg = require('../package.json');
const { hasProperty } = require('./util');

const normalizePath = objPath =>
    typeof objPath === 'string' ? objPath.split('.') : objPath;

const traverse = (node, parents, f) => {
    f(node, parents);

    if (typeof node === 'object' && node !== null) {
        Object.keys(node).forEach(key => {
            traverse(node[key], [...parents, key], f);
        });
    } else if (Array.isArray(node)) {
        node.forEach((child, idx) => {
            traverse(child, [...parents, idx], f);
        });
    }
};

const escapeRegex = str =>
    str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

const isPrimitive = val => val !== Object(val);

const flattenConfig = config => {
    const result = {};

    traverse(config, [], (node, parents) => {
        if (isPrimitive(node)) {
            result[parents.join('.')] = node;
        }
    });

    return result;
};

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
                    return this;
                });
        },
        write() {
            return options.mkdir(path.dirname(PATH), { recursive: true })
                .then(() => options.writeFile(PATH, JSON.stringify(config, null, 2)))
                .then(() => this);
        },
        get(confPath) {
            confPath = normalizePath(confPath);
            return confPath.reduce((acc, key) => {
                if (typeof acc === 'object' && acc !== null && hasProperty(acc, key)) {
                    return acc[key];
                }
            }, config);
        },
        entries() {
            return Object.entries(flattenConfig(config));
        },
        match(confPath) {
            confPath = normalizePath(confPath).join('.');
            const pattern = new RegExp(escapeRegex(confPath).replace(/\\\*/g, '.*'));
            return Object.entries(flattenConfig(config)).reduce((acc, [key, value]) => {
                if (pattern.test(key)) {
                    acc.push(value);
                }

                return acc;
            }, []);
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
            confPath = normalizePath(confPath);
            let obj = config;

            for (let i = 0; i < confPath.length - 1; i += 1) {
                const key = confPath[i];

                if (!hasProperty(obj, key)) {
                    return;
                }

                obj = obj[key];
            }

            delete obj[confPath[confPath.length - 1]];
            return this;
        },
    };
};
