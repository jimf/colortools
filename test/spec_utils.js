const cli = require('../src/cli');

exports.cli = (argv, arrange) => {
    let stdout = '';
    let stderr = '';
    const options = {
        env: {
            HOME: '/home/username',
        },
        isTTY: true,
        mkdir: jest.fn().mockResolvedValue(),
        readFile: jest.fn().mockResolvedValue(),
        writeFile: jest.fn().mockResolvedValue(),
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
        exitCode => ({
            exitCode,
            stdout,
            stderr,
            options,
        }),
        exitCode => ({
            exitCode: exitCode || 1,
            stdout,
            stderr,
            options,
        })
    );
};
