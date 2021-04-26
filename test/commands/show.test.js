const chalk = require('chalk');
const { cli } = require('../spec_utils');

describe('show', () => {
    it('should support showing info on hex colors', async () => {
        const cases = [
            {
                input: '000000',
                expected: /HEX: #000000[\s\S]+?RGB: rgb\(0, 0, 0\)[\s\S]+?HSL: hsl\(0, 0.0%, 0.0%\)/,
            },
            {
                input: '#BADA55',
                expected: /HEX: #bada55[\s\S]+?RGB: rgb\(186, 218, 85\)[\s\S]+?HSL: hsl\(74, 64.3%, 59.4%\)/,
            },
        ];
        await cases.forEach(async ({ input, expected }) => {
            const result = await cli(['show', input]);
            expect(result).toEqual(expect.objectContaining({
                exitCode: 0,
                stdout: expect.stringMatching(expected),
                stderr: '',
            }));
        });
    });

    it('should support showing info on rgb colors', async () => {
        const cases = [
            {
                input: '0,0,0',
                expected: /HEX: #000000[\s\S]+?RGB: rgb\(0, 0, 0\)[\s\S]+?HSL: hsl\(0, 0.0%, 0.0%\)/,
            },
            {
                input: 'rgb(186, 218, 85)',
                expected: /HEX: #bada55[\s\S]+?RGB: rgb\(186, 218, 85\)[\s\S]+?HSL: hsl\(74, 64.3%, 59.4%\)/,
            },
        ];
        await cases.forEach(async ({ input, expected }) => {
            const result = await cli(['show', input]);
            expect(result).toEqual(expect.objectContaining({
                exitCode: 0,
                stdout: expect.stringMatching(expected),
                stderr: '',
            }));
        });
    });

    it('should support showing info on config colors', async () => {
        const result = await cli(['show', 'green-500'], options => {
            options.readFile.mockResolvedValue(JSON.stringify({
                colors: {
                    'green-500': '#bada55',
                },
            }));
        });
        expect(result).toEqual(expect.objectContaining({
            exitCode: 0,
            stdout: expect.stringMatching(/HEX: #bada55[\s\S]+?RGB: rgb\(186, 218, 85\)[\s\S]+?HSL: hsl\(74, 64.3%, 59.4%\)/),
            stderr: '',
        }));
    });

    it('should support wildcard matching config colors', async () => {
        const result = await cli(['show', 'blue-*'], options => {
            options.readFile.mockResolvedValue(JSON.stringify({
                colors: {
                    'green-500': '#bada55',
                    'blue-500': '#3b82f6',
                    'blue-600': '#2563eb',
                },
            }));
        });
        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe('');
        expect(result.stdout).toMatch('HEX: #3b82f6');
        expect(result.stdout).toMatch('HEX: #2563eb');
        expect(result.stdout).not.toMatch('HEX: #bada55');
    });

    it('should show indicator when a color exactly matches a config color', async () => {
        const result = await cli(['show', 'bada55'], options => {
            options.readFile.mockResolvedValue(JSON.stringify({
                colors: {
                    'green-500': '#bada55',
                },
            }));
        });
        expect(result).toEqual(expect.objectContaining({
            exitCode: 0,
            stdout: expect.stringMatching(/Exact Match[\s\S]+?green-500/),
            stderr: '',
        }));
    });

    it('should show indicator when a color is similar to a config color', async () => {
        const result = await cli(['show', 'bada44'], options => {
            options.readFile.mockResolvedValue(JSON.stringify({
                colors: {
                    'green-500': '#bada55',
                },
            }));
        });
        expect(result).toEqual(expect.objectContaining({
            exitCode: 0,
            stdout: expect.stringMatching(/Most Similar[\s\S]+?green-500/),
            stderr: '',
        }));
    });

    it('should support showing info on multiple colors', async () => {
        const result = await cli(['show', '000000', 'bada55']);
        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe('');
        expect(result.stdout).toMatch(/HEX: #000000[\s\S]+?RGB: rgb\(0, 0, 0\)[\s\S]+?HSL: hsl\(0, 0.0%, 0.0%\)/);
        expect(result.stdout).toMatch(/HEX: #bada55[\s\S]+?RGB: rgb\(186, 218, 85\)[\s\S]+?HSL: hsl\(74, 64.3%, 59.4%\)/);
    });

    it('should deduplicate colors', async () => {
        const result = await cli(['show', '000000', '000000']);
        expect(result).toEqual(expect.objectContaining({
            exitCode: 0,
            stderr: '',
        }));
        expect(result.stdout.match(/#000000/g).length).toBe(1);
    });

    it('should output multiple colors in columns when tty width is available', async () => {
        const result = await cli(['show', '000000', 'bada55'], opts => {
            opts.stdoutColumns = 200;
        });
        expect(result).toEqual(expect.objectContaining({
            exitCode: 0,
            stdout: expect.stringMatching(/#000000[\s\S]+?#bada55[\s\S]+?rgb\(0, 0, 0\)[\s\S]+?rgb\(186, 218, 85\)/),
            stderr: '',
        }));
    });

    describe('-1 flag', () => {
        it('should force single column output when tty width is available', async () => {
            const result = await cli(['show', '000000', 'bada55', '-1'], opts => {
                opts.stdoutColumns = 200;
            });
            expect(result).toEqual(expect.objectContaining({
                exitCode: 0,
                stdout: expect.stringMatching(/#000000[\s\S]+?rgb\(0, 0, 0\)[\s\S]+?#bada55[\s\S]+?rgb\(186, 218, 85\)/),
                stderr: '',
            }));
        });
    });

    describe('--format=json flag', () => {
        it('should output single color data as JSON object', async () => {
            const result = await cli(['show', '000000', '--format', 'json']);
            expect(result).toEqual(expect.objectContaining({
                exitCode: 0,
                stdout: expect.stringContaining('#000000'),
                stderr: '',
            }));
            expect(JSON.parse(result.stdout.trim())).toEqual({
                color: { r: 0, g: 0, b: 0 },
                hex: '#000000',
                rgb: 'rgb(0, 0, 0)',
                hsl: 'hsl(0, 0.0%, 0.0%)',
                matches: [],
                mostSimilar: [],
            });
        });

        it('should output multiple color data as JSON array', async () => {
            const result = await cli(['show', '000000', 'bada55', '--format', 'json']);
            expect(result).toEqual(expect.objectContaining({
                exitCode: 0,
                stdout: expect.stringContaining('#000000'),
                stderr: '',
            }));
            expect(JSON.parse(result.stdout.trim())).toEqual([
                {
                    color: { r: 0, g: 0, b: 0 },
                    hex: '#000000',
                    rgb: 'rgb(0, 0, 0)',
                    hsl: 'hsl(0, 0.0%, 0.0%)',
                    matches: [],
                    mostSimilar: [],
                },
                {
                    color: { r: 186, g: 218, b: 85 },
                    hex: '#bada55',
                    rgb: 'rgb(186, 218, 85)',
                    hsl: 'hsl(74, 64.3%, 59.4%)',
                    matches: [],
                    mostSimilar: [],
                },
            ]);
        });

        it('should accept --json shorthand', async () => {
            const result = await cli(['show', '000000', '--json']);
            expect(result).toEqual(expect.objectContaining({
                exitCode: 0,
                stdout: expect.stringContaining('#000000'),
                stderr: '',
            }));
            expect(JSON.parse(result.stdout.trim())).toEqual({
                color: { r: 0, g: 0, b: 0 },
                hex: '#000000',
                rgb: 'rgb(0, 0, 0)',
                hsl: 'hsl(0, 0.0%, 0.0%)',
                matches: [],
                mostSimilar: [],
            });
        });
    });

    describe('--format=long', () => {
        it('should output color info in columns', async () => {
            const result = await cli(['show', '000000', '--format', 'long']);
            expect(result).toEqual(expect.objectContaining({
                exitCode: 0,
                stdout: expect.stringMatching(/^Color\s+HEX\s+RGB\s+HSL\s+Matches\s+Similar\n.+?#000000\s+rgb\(0, 0, 0\)\s+hsl\(0, 0\.0%, 0\.0%\)\s+NO MATCHES\s+NO SIMILAR\n$/),
                stderr: '',
            }));
        });

        it('should omit headers when --no-headers specified', async () => {
            const result = await cli(['show', '000000', '--format', 'long', '--no-headers']);
            expect(result).toEqual(expect.objectContaining({
                exitCode: 0,
                stdout: expect.stringMatching(/^.+?#000000\s+rgb\(0, 0, 0\)\s+hsl\(0, 0\.0%, 0\.0%\)\s+NO MATCHES\s+NO SIMILAR\n$/),
                stderr: '',
            }));
        });

        ['--long', '-l'].forEach(flag => {
            it(`should support ${flag} shorthand`, async () => {
                const result = await cli(['show', '000000', flag]);
                expect(result).toEqual(expect.objectContaining({
                    exitCode: 0,
                    stdout: expect.stringMatching(/^Color\s+HEX\s+RGB\s+HSL\s+Matches\s+Similar\n.+?#000000\s+rgb\(0, 0, 0\)\s+hsl\(0, 0\.0%, 0\.0%\)\s+NO MATCHES\s+NO SIMILAR\n$/),
                    stderr: '',
                }));
            });
        });

        describe('--columns', () => {
            it('should support filtering "color" column', async () => {
                const result = await cli(['show', '000000', '--format', 'long', '--no-headers', '--columns', 'color']);
                expect(result).toEqual(expect.objectContaining({
                    exitCode: 0,
                    stdout: `${chalk.bgHex('#000000')('     ')}\n`,
                    stderr: '',
                }));
            });

            it('should support filtering "hex" column', async () => {
                const result = await cli(['show', '000000', '--format', 'long', '--no-headers', '--columns', 'hex']);
                expect(result).toEqual(expect.objectContaining({
                    exitCode: 0,
                    stdout: '#000000\n',
                    stderr: '',
                }));
            });

            it('should support filtering "rgb" column', async () => {
                const result = await cli(['show', '000000', '--format', 'long', '--no-headers', '--columns', 'rgb']);
                expect(result).toEqual(expect.objectContaining({
                    exitCode: 0,
                    stdout: 'rgb(0, 0, 0)\n',
                    stderr: '',
                }));
            });

            it('should support filtering "hsl" column', async () => {
                const result = await cli(['show', '000000', '--format', 'long', '--no-headers', '--columns', 'hsl']);
                expect(result).toEqual(expect.objectContaining({
                    exitCode: 0,
                    stdout: 'hsl(0, 0.0%, 0.0%)\n',
                    stderr: '',
                }));
            });

            it('should support filtering "matches" column', async () => {
                const result = await cli(['show', '000000', '--format', 'long', '--no-headers', '--columns', 'matches']);
                expect(result).toEqual(expect.objectContaining({
                    exitCode: 0,
                    stdout: 'NO MATCHES\n',
                    stderr: '',
                }));
            });

            it('should support filtering "similar" column', async () => {
                const result = await cli(['show', '000000', '--format', 'long', '--no-headers', '--columns', 'similar']);
                expect(result).toEqual(expect.objectContaining({
                    exitCode: 0,
                    stdout: 'NO SIMILAR\n',
                    stderr: '',
                }));
            });

            it('should support filtering multiple columns', async () => {
                const result = await cli(['show', '000000', '--format', 'long', '--no-headers', '--columns', 'hex,rgb']);
                expect(result).toEqual(expect.objectContaining({
                    exitCode: 0,
                    stdout: '#000000  rgb(0, 0, 0)\n',
                    stderr: '',
                }));
            });

            it('should write an error message to STDERR and exit 1 if an invalid column name is provided', async () => {
                const result = await cli(['show', '000000', '--format', 'long', '--no-headers', '--columns', 'invalid']);
                expect(result).toEqual(expect.objectContaining({
                    exitCode: 1,
                    stdout: '',
                    stderr: expect.stringContaining('Invalid column specified'),
                }));
            });
        });
    });

    describe('--sort flag', () => {
        it('should sort colors by HSL', async () => {
            const result = await cli(['show', '#3B82F6', '#EF4444', '--sort']);
            expect(result).toEqual(expect.objectContaining({
                exitCode: 0,
                stdout: expect.stringMatching(/#ef4444[\s\S]+?#3b82f6/),
                stderr: '',
            }));
        });
    });

    it('should show usage info and exit 0 if called without args', async () => {
        expect(await cli(['show'])).toEqual(expect.objectContaining({
            exitCode: 0,
            stdout: expect.stringContaining('Usage: color show <color>'),
            stderr: '',
        }));
    });

    it('should write an error message to STDERR and exit 1 if called with an invalid color value', async () => {
        expect(await cli(['show', 'not-a-color'])).toEqual(expect.objectContaining({
            exitCode: 1,
            stdout: '',
            stderr: 'Error: Invalid color. Cannot parse color "not-a-color"\n',
        }));
    });

    it('should write a warning message to STDERR and exit 0 if one of the args is a config value and the value is invalid', async () => {
        const result = await cli(['show', 'green-*'], options => {
            options.readFile.mockResolvedValue(JSON.stringify({
                colors: {
                    'green-500': '#bada55',
                    'green-600': 'invalid',
                },
            }));
        });
        expect(result).toEqual(expect.objectContaining({
            exitCode: 0,
            stdout: expect.stringContaining('HEX: #bada55'),
            stderr: 'Warning: Invalid color value specified for config.colors.green-600: invalid\n',
        }));
    });

    it('should write a warning message to STDERR and exit 0 if a config color value is invalid', async () => {
        const result = await cli(['show', 'green-500'], options => {
            options.readFile.mockResolvedValue(JSON.stringify({
                colors: {
                    'green-500': '#bada55',
                    'green-600': 'invalid',
                },
            }));
        });
        expect(result).toEqual(expect.objectContaining({
            exitCode: 0,
            stdout: expect.stringContaining('HEX: #bada55'),
            stderr: 'Warning: Invalid color value specified for config.colors.green-600: invalid\n',
        }));
    });
});
