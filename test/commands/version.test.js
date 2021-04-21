const pkg = require('../../package.json');
const { cli } = require('../spec_utils');

describe('version', () => {
    ['--version', '-V', 'version'].forEach(arg => {
        it(`"${arg}" should write version info to stdout and exit 0`, async () => {
            const result = await cli([arg]);
            expect(result).toEqual(expect.objectContaining({
                exitCode: 0,
                stdout: `${pkg.name} ${pkg.version}\n`,
                stderr: '',
            }));
        });
    });
});
