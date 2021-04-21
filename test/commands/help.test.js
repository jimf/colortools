const { cli } = require('../spec_utils');

describe('help', () => {
    const expectUsage = result => {
        expect(result).toEqual(expect.objectContaining({
            exitCode: 0,
            stdout: expect.stringContaining('Usage: color [--version] [--help] <command> [<args>]'),
            stderr: '',
        }));
    };

    ['--help', '-h', 'help'].forEach(arg => {
        it(`"${arg}" should write usage info to stdout and exit 0`, async () => {
            expectUsage(await cli([arg]));
        });
    });

    it('<no arguments> should write usage info to stdout and exit 0', async () => {
        expectUsage(await cli([]));
    });
});
