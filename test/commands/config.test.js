const { cli } = require('../spec_utils');

describe('config', () => {
    it('should write usage info to STDERR and exit 1 if an invalid topic is specified', async () => {
        const result = await cli(['config', 'invalid']);
        expect(result).toEqual(expect.objectContaining({
            exitCode: 1,
            stdout: '',
            stderr: expect.stringMatching(/^Usage: color config/),
        }));
    });

    describe('set', () => {
        it('should write value to config file', async () => {
            const result = await cli(['config', 'set', 'colors.blue-500', '#3B82F6']);
            expect(result.options.writeFile).toHaveBeenCalledWith(
                '/home/username/.config/@jimf/colortools/config.json',
                JSON.stringify({
                    colors: {
                        'blue-500': '#3b82f6',
                    },
                }, null, 2),
            );
            expect(result).toEqual(expect.objectContaining({
                exitCode: 0,
                stdout: '',
                stderr: '',
            }));
        });

        it('should overwrite existing values', async () => {
            const result = await cli(['config', 'set', 'colors.blue-500', '#3B82F6'], opts => {
                opts.readFile.mockResolvedValue(JSON.stringify({
                    colors: {
                        'blue-500': '#c0ffee',
                    },
                }));
            });
            expect(result.options.writeFile).toHaveBeenCalledWith(
                '/home/username/.config/@jimf/colortools/config.json',
                JSON.stringify({
                    colors: {
                        'blue-500': '#3b82f6',
                    },
                }, null, 2),
            );
            expect(result).toEqual(expect.objectContaining({
                exitCode: 0,
                stdout: '',
                stderr: '',
            }));
        });

        it('should write usage info to STDERR and exit 1 if invoked without a value', async () => {
            const result = await cli(['config', 'set', 'colors.blue-500']);
            expect(result).toEqual(expect.objectContaining({
                exitCode: 1,
                stdout: '',
                stderr: expect.stringMatching(/^Usage: color config/),
            }));
        });

        it('should write error message to STDERR and exit 1 if color invalid', async () => {
            const result = await cli(['config', 'set', 'colors.blue-500', 'invalid']);
            expect(result).toEqual(expect.objectContaining({
                exitCode: 1,
                stdout: '',
                stderr: `Invalid color value specified: "invalid"\n`,
            }));
        });

        it('should write error message to STDERR and exit 1 if top-level key not recognized', async () => {
            const result = await cli(['config', 'set', 'invalid', 'value']);
            expect(result).toEqual(expect.objectContaining({
                exitCode: 1,
                stdout: '',
                stderr: `Top-level key "invalid" is unrecognized. Try 'colors.invalid'\n`,
            }));
        });

        it('should write error message to STDERR and exit 1 if key contains invalid characters', async () => {
            const result = await cli(['config', 'set', 'colors./', '#3B82F6']);
            expect(result).toEqual(expect.objectContaining({
                exitCode: 1,
                stdout: '',
                stderr: expect.stringContaining('Invalid color name specified. Color names should only contain:'),
            }));
        });
    });

    describe('get', () => {
        it('should write config value to STDOUT and exit 0 on hit', async () => {
            const result = await cli(['config', 'get', 'colors.blue-500'], opts => {
                opts.readFile.mockResolvedValue(JSON.stringify({
                    colors: {
                        'blue-500': '#3B82F6',
                    },
                }));
            });
            expect(result).toEqual(expect.objectContaining({
                exitCode: 0,
                stdout: '#3B82F6\n',
                stderr: '',
            }));
        });

        it('should write nothing to STDOUT or STDERR and exit 1 on miss', async () => {
            const result = await cli(['config', 'get', 'colors.blue-500'], opts => {
                opts.readFile.mockResolvedValue(JSON.stringify({
                    colors: {},
                }));
            });
            expect(result).toEqual(expect.objectContaining({
                exitCode: 1,
                stdout: '',
                stderr: '',
            }));
        });

        it('should write error message to STDERR and exit 1 if top-level key not recognized', async () => {
            const result = await cli(['config', 'get', 'invalid']);
            expect(result).toEqual(expect.objectContaining({
                exitCode: 1,
                stdout: '',
                stderr: `Top-level key "invalid" is unrecognized. Try 'colors.invalid'\n`,
            }));
        });

        it('should write error message to STDERR and exit 1 if key contains invalid characters', async () => {
            const result = await cli(['config', 'get', 'colors./']);
            expect(result).toEqual(expect.objectContaining({
                exitCode: 1,
                stdout: '',
                stderr: expect.stringContaining('Invalid color name specified. Color names should only contain:'),
            }));
        });
    });

    describe('delete', () => {
        it('should write config file without key on hit', async () => {
            const result = await cli(['config', 'delete', 'colors.blue-500'], opts => {
                opts.readFile.mockResolvedValue(JSON.stringify({
                    colors: {
                        'blue-500': '#3b82f6',
                    },
                }));
            });
            expect(result.options.writeFile).toHaveBeenCalledWith(
                '/home/username/.config/@jimf/colortools/config.json',
                JSON.stringify({ colors: {}, }, null, 2),
            );
            expect(result).toEqual(expect.objectContaining({
                exitCode: 0,
                stdout: '',
                stderr: '',
            }));
        });

        it('should NOT write config file on miss', async () => {
            const result = await cli(['config', 'delete', 'colors.blue-500']);
            expect(result.options.writeFile).not.toHaveBeenCalled();
            expect(result).toEqual(expect.objectContaining({
                exitCode: 0,
                stdout: '',
                stderr: '',
            }));
        });

        it('should write usage info to STDERR and exit 1 if invoked without a key', async () => {
            const result = await cli(['config', 'delete']);
            expect(result).toEqual(expect.objectContaining({
                exitCode: 1,
                stdout: '',
                stderr: expect.stringMatching(/^Usage: color config/),
            }));
        });

        it('should write error message to STDERR and exit 1 if top-level key not recognized', async () => {
            const result = await cli(['config', 'delete', 'invalid']);
            expect(result).toEqual(expect.objectContaining({
                exitCode: 1,
                stdout: '',
                stderr: `Top-level key "invalid" is unrecognized. Try 'colors.invalid'\n`,
            }));
        });

        it('should write error message to STDERR and exit 1 if key contains invalid characters', async () => {
            const result = await cli(['config', 'delete', 'colors./']);
            expect(result).toEqual(expect.objectContaining({
                exitCode: 1,
                stdout: '',
                stderr: expect.stringContaining('Invalid color name specified. Color names should only contain:'),
            }));
        });
    });

    describe('list', () => {
        it('should write config keys/values to STDOUT and exit 0', async () => {
            const result = await cli(['config', 'list'], opts => {
                opts.readFile.mockResolvedValue(JSON.stringify({
                    colors: {
                        'blue-500': '#3b82f6',
                        'blue-600': '#2563eb',
                    },
                }));
            });
            expect(result).toEqual(expect.objectContaining({
                exitCode: 0,
                stdout: `colors.blue-500 = "#3b82f6"
colors.blue-600 = "#2563eb"
`,
                stderr: '',
            }));
        });

        it('should write nothing to STDOUT and exit 0 when empty', async () => {
            const result = await cli(['config', 'list']);
            expect(result).toEqual(expect.objectContaining({
                exitCode: 0,
                stdout: '',
                stderr: '',
            }));
        });
    });
});
