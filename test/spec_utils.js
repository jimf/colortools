const cli = require('../src/cli');

exports.cli = (argv, arrange) => {
    let stdout = '';
    let stderr = '';
    const options = {
        writeStderr: line => {
            stderr += `${line}\n`;
        },
        writeStdout: line => {
            stdout += `${line}\n`;
        },
    };

    if (typeof arrange === 'function') {
        arrange(options);
    }

    return cli(['/path/to/node', '/path/to/colors.js', ...argv], options).then(
        () => ({
            exitCode: 0,
            stdout,
            stderr,
            options,
        }),
        () => ({
            exitCode: 1,
            stdout,
            stderr,
            options,
        })
    );
};
