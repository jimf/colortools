const { cli } = require('../spec_utils');
const commands = require('../../src/commands');

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

    it('should write error message to STDERR and exit 1 when an invalid command is provided', async () => {
        expect(await cli(['invalid-command'])).toEqual(expect.objectContaining({
            exitCode: 1,
            stdout: '',
            stderr: "color: 'invalid-command' is not a command. See 'color --help'.\n",
        }));
    });

    Object.keys(commands).forEach(cmd => {
        describe(cmd, () => {
            it(`"help ${cmd}" should write ${cmd} usage info to STDOUT and exit 0`, async () => {
                expect(await cli(['help', cmd])).toEqual(expect.objectContaining({
                    exitCode: 0,
                    stdout: expect.stringMatching(`Usage: color ${cmd}`),
                    stderr: '',
                }));
            });

            ['--help', '-h'].forEach(flag => {
                it(`"${cmd} ${flag}" should write ${cmd} usage info to STDOUT and exit 0`, async () => {
                    expect(await cli([cmd, flag])).toEqual(expect.objectContaining({
                        exitCode: 0,
                        stdout: expect.stringMatching(`Usage: color ${cmd}`),
                        stderr: '',
                    }));
                });
            });
        });
    });
});
