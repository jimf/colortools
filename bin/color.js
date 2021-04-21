#!/usr/bin/env node
/* eslint-disable no-console */

const cli = require('../src/cli');
const fs = require('fs');

const options = {
    env: process.env,
    mkdir: fs.promises.mkdir,
    readFile: fs.promises.readFile,
    writeFile: fs.promises.writeFile,
    writeStdout: console.log.bind(console),
    writeStderr: console.log.bind(console),
};

cli(process.argv, options)
    .then(exitCode => {
        process.exit(typeof exitCode === 'number' ? exitCode : 0)
    })
    .catch(exitCode => {
        process.exit(typeof exitCode === 'number' ? exitCode : 1);
    });
